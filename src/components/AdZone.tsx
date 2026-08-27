/**
 * Component for creating an {@link AdZone}.
 *
 * This is a port of the Android SDK's AdZonePresenter. Each instance owns one
 * zone: its own ad request, its own refresh countdown and its own impression
 * pairing, all independent of every other zone on screen. Nothing here is shared
 * at module scope, which is what allows several zones to coexist.
 * @module
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Linking, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import * as adadaptedApiRequests from "../api/adadaptedApiRequests";
import {
    Ad,
    AdActionType,
    ReportedEventType,
    SdkEventName,
    ZoneUnfilledReason,
} from "../api/adadaptedApiTypes";
import { WebView } from "react-native-webview";
import { safeInvoke } from "../util";
import { ReportAdButton } from "./ReportAdButton";
import { AdZoneTypes } from "../componentTypes/AdZone";
import {
    getAdRequestContext,
    onAdRequestContextReady,
    subscribeToAppActive,
    subscribeToSdkTeardown,
} from "../adRequestContext";

/**
 * How long an ad is displayed for when the API supplies no usable refresh time.
 * Matches Config.DEFAULT_AD_REFRESH_SECONDS on Android.
 */
const DEFAULT_AD_REFRESH_SECONDS = 60;

/**
 * The shortest refresh time that will be honored, so an unexpectedly small value
 * cannot put the zone into a tight request loop.
 * Matches Ad.MINIMUM_REFRESH_TIME_SECONDS on Android.
 */
const MINIMUM_AD_REFRESH_SECONDS = 15;

/**
 * Injected into the creative once it has rendered and is on screen, immediately
 * before the impression is reported. The creative is expected to define this
 * function; it loads the advertiser's measurement pixels.
 * Matches PIXEL_TRACKING_JS in the Android SDK's AdZonePresenter.
 */
const PIXEL_TRACKING_JS = "loadTrackingPixels()";

/**
 * Resolves how long an ad should be displayed for.
 * Mirrors Ad.refreshTimeOrDefault on Android.
 * @param refreshTime - The refresh_time served for the ad.
 * @returns the refresh time in seconds.
 */
function resolveRefreshSeconds(refreshTime: number | undefined): number {
    const value = Number(refreshTime);

    if (!Number.isFinite(value) || value <= 0) {
        return DEFAULT_AD_REFRESH_SECONDS;
    }

    return Math.max(value, MINIMUM_AD_REFRESH_SECONDS);
}

/**
 * Creates the AdZone component.
 * @param props - properties passed to AdZone.
 * @returns an AdZone JSX Element.
 */
export const AdZone = (props: AdZoneTypes.Props): React.ReactElement => {
    const { zoneId } = props;
    const isVisible = props.isVisible;
    // Falls back to the value given to initialize() before the built-in default,
    // so a host that configured it once there is still honoured.
    const dragDistanceAllowed =
        props.xyDragDistanceAllowed ??
        getAdRequestContext()?.xyDragDistanceAllowed ??
        25;

    /**
     * The ad currently displayed, or undefined when the zone is unfilled.
     */
    const [currentAd, setCurrentAd] = useState<Ad | undefined>(undefined);

    /**
     * Where the user started touching the ad, used to tell a tap from a scroll.
     *
     * A ref rather than state: the touch end handler has to read the value the
     * touch start handler wrote, and a state update only reaches the handler after
     * a re-render. If the two events land in one batch, the comparison runs against
     * the previous touch's coordinates and a genuine tap is discarded as a drag.
     */
    const touchStartCoords = useRef<AdZoneTypes.TouchCoordinates>({
        x: 0,
        y: 0,
    });

    /**
     * All of the zone's own bookkeeping. Held in a ref rather than state because
     * the timer callbacks read and write it outside of React's render cycle, and a
     * stale closure over state would silently freeze the countdown.
     */
    const zone = useRef({
        currentAd: undefined as Ad | undefined,
        refreshSeconds: DEFAULT_AD_REFRESH_SECONDS,
        /**
         * True once a response, filled or not, has come back for this zone.
         */
        loaded: false,
        /**
         * Guards against overlapping ad requests.
         */
        inFlight: false,
        /**
         * Incremented whenever what an open request would be answering changes, so
         * a response that belongs to a previous zone can be recognised and dropped.
         */
        requestGeneration: 0,
        /**
         * Set when a targeting change arrives mid-request, so it is not lost.
         */
        refetchWhenSettled: false,
        adFetchedAt: 0,
        msLeftOnRefresh: 0,
        countdownResumedAt: 0,
        timerId: undefined as ReturnType<typeof setTimeout> | undefined,
        timerRunning: false,
        isVisible: true,
        isAppActive: true,
        mounted: true,
        /**
         * Whether the zone has reported its mount and made its first request. False
         * while it is still waiting for the SDK to finish initializing.
         */
        started: false,
        /**
         * Whether the zone has already reported its unmount, so SDK teardown and
         * component unmount cannot both report one.
         */
        closed: false,
        /**
         * Whether the creative itself has rendered in the WebView. An impression is
         * not owed for an ad the user could not actually have seen, so this gates
         * it alongside visibility.
         */
        creativeLoaded: false,
        /**
         * Pending timer for a load event that has not been confirmed yet. See
         * onCreativeLoaded for why a load event is not trusted immediately.
         */
        creativeSettleTimer: undefined as
            ReturnType<typeof setTimeout> | undefined,
        impressionTracked: false,
        impressionEndTracked: false,
        clickHandled: false,
        unfilledReported: false,
        pendingUnfilledReason: undefined as ZoneUnfilledReason | undefined,
    });

    /**
     * Reports an ad or zone level event through the SDK.
     */
    const reportEvent = useCallback(
        (
            eventType: ReportedEventType,
            ad?: Ad,
            eventName?: ZoneUnfilledReason,
        ): void => {
            getAdRequestContext()?.reportAdEvent({
                adId: ad?.id ?? "",
                zoneId,
                impressionId: ad?.impression_id ?? "",
                eventType,
                eventName,
            });
        },
        [zoneId],
    );

    /**
     * Whether the zone is actually in front of the user right now. The countdown,
     * the impression events and the unfilled report all hang off this.
     * Mirrors AdZonePresenter.zoneIsOnScreen.
     */
    const isOnScreen = useCallback((): boolean => {
        const state = zone.current;

        return state.mounted && state.isVisible && state.isAppActive;
    }, []);

    /**
     * Reports the impression for the current ad, at most once per ad.
     */
    const trackImpression = useCallback((): void => {
        const state = zone.current;

        if (
            !state.currentAd ||
            state.impressionTracked ||
            // The creative has to have rendered. Reporting on the response alone
            // billed ads whose creative failed to paint, and meant the tracking
            // script below never ran. Mirrors the webView.loaded condition in
            // AdZonePresenter.trackAdImpression.
            !state.creativeLoaded ||
            !isOnScreen()
        ) {
            return;
        }

        state.impressionTracked = true;

        // Before the impression, as on Android. The creative defines this
        // function; it loads the advertiser's own measurement pixels, so without
        // it third party verification sees no impressions at all however healthy
        // our own numbers look.
        webViewRef.current?.injectJavaScript(PIXEL_TRACKING_JS);

        reportEvent(ReportedEventType.IMPRESSION, state.currentAd);
    }, [isOnScreen, reportEvent]);

    /**
     * Reports the impression end for the current ad. Only fires once, and only if
     * a real impression was recorded for that ad first.
     * Mirrors EventClient.trackImpressionEnd.
     */
    const endImpression = useCallback((): void => {
        const state = zone.current;

        if (!state.impressionTracked || state.impressionEndTracked) {
            return;
        }

        state.impressionEndTracked = true;

        reportEvent(ReportedEventType.IMPRESSION_END, state.currentAd);
    }, [reportEvent]);

    /**
     * The creative finished rendering. This is when an impression becomes owed,
     * so it is attempted here and again on any later visibility change.
     * Mirrors AaZoneView.onAdLoadedInWebView.
     */
    const onCreativeLoaded = useCallback((): void => {
        const state = zone.current;

        if (
            !state.currentAd ||
            state.creativeLoaded ||
            state.creativeSettleTimer
        ) {
            return;
        }

        // A load event is not proof the creative rendered. On Android
        // react-native-webview synthesises a finish event before the error event
        // for a failed load, deliberately, and maps finish straight to onLoad:
        //
        //   // In case of an error JS side expect to get a finish event first,
        //   // and then get an error event
        //   emitFinishEvent(webView, failingUrl);
        //
        // in RNCWebViewClient.onReceivedError. Acting on that first event billed an
        // impression and fired the creative's tracking pixels for an ad that had
        // failed, and left the real error a no-op because the flag was already set.
        // Both events arrive in one native batch, so settling on a timer gives an
        // error that is coming the chance to cancel this first.
        state.creativeSettleTimer = setTimeout(() => {
            state.creativeSettleTimer = undefined;

            if (!state.currentAd || state.creativeLoaded) {
                return;
            }

            state.creativeLoaded = true;

            safeInvoke(props.onAdLoaded);

            trackImpression();
        }, 0);
    }, [trackImpression, props.onAdLoaded]);

    /**
     * Reports a queued unfilled event once the zone is on screen.
     */
    const flushUnfilled = useCallback((): void => {
        const state = zone.current;

        if (
            !state.pendingUnfilledReason ||
            state.unfilledReported ||
            !isOnScreen()
        ) {
            return;
        }

        const reason = state.pendingUnfilledReason;

        state.unfilledReported = true;
        state.pendingUnfilledReason = undefined;

        reportEvent(ReportedEventType.ZONE_UNFILLED, undefined, reason);
    }, [isOnScreen, reportEvent]);

    /**
     * Queues the unfilled report, and sends it if the zone is already on screen.
     *
     * Held rather than dropped when off screen, because a request can settle
     * before the host has reported the zone's visibility, and dropping it there
     * would lose the report for any zone that loses that race.
     */
    const reportUnfilled = useCallback(
        (reason: ZoneUnfilledReason): void => {
            const state = zone.current;

            if (state.unfilledReported) {
                return;
            }

            state.pendingUnfilledReason = reason;

            flushUnfilled();
        },
        [flushUnfilled],
    );

    const cancelTimer = useCallback((): void => {
        const state = zone.current;

        if (state.timerId) {
            clearTimeout(state.timerId);

            state.timerId = undefined;
        }

        state.timerRunning = false;
    }, []);

    // The timer callbacks need to reach loadNextAd, which is defined further down
    // and closes over these same helpers. A ref breaks that cycle. It is populated
    // by an effect rather than during render, and read only from callbacks that
    // cannot run before the first effect has flushed.
    const loadNextAdRef = useRef<(() => void) | undefined>(undefined);

    // Same reason, for the first request. A zone that mounts before the SDK is
    // ready starts later, and calling the fetchAd captured on the first render
    // would request with whatever contextId was set at that moment.
    const fetchAdRef = useRef<(() => void) | undefined>(undefined);

    // Needed to inject the creative's own pixel tracking before an impression is
    // filed, which is the only way third party measurement ever fires.
    //
    // The <object> type argument is not decoration. react-native-webview declares
    // `class WebView<P = undefined> extends Component<WebViewProps & P>`, and
    // `WebViewProps & undefined` collapses to never, so the moment a ref is
    // attached every prop on the element fails to type check. Naming any object
    // type for P restores the real props.
    const webViewRef = useRef<WebView<object>>(null);

    /**
     * Starts the countdown with whatever time it has left.
     */
    const startTimer = useCallback((): void => {
        const state = zone.current;

        if (!state.loaded || state.timerRunning || !isOnScreen()) {
            return;
        }

        state.timerRunning = true;
        state.countdownResumedAt = Date.now();
        state.timerId = setTimeout(() => {
            state.timerRunning = false;

            loadNextAdRef.current?.();
        }, state.msLeftOnRefresh);
    }, [isOnScreen]);

    /**
     * Arms the countdown fresh from the current ad's refresh time.
     */
    const restartTimer = useCallback((): void => {
        const state = zone.current;

        cancelTimer();

        state.adFetchedAt = Date.now();
        state.msLeftOnRefresh = state.refreshSeconds * 1000;

        startTimer();
    }, [cancelTimer, startTimer]);

    /**
     * Freezes what is left of the countdown, so a zone that is off screen or in a
     * backgrounded app neither refreshes nor fetches.
     */
    const pauseTimer = useCallback((): void => {
        const state = zone.current;

        if (!state.timerRunning) {
            return;
        }

        state.msLeftOnRefresh = Math.max(
            0,
            state.msLeftOnRefresh - (Date.now() - state.countdownResumedAt),
        );

        cancelTimer();
    }, [cancelTimer]);

    /**
     * Resumes the countdown. An ad that outlived its own refresh time while the
     * countdown was frozen is replaced immediately, rather than being shown for
     * time it never spent in front of anyone.
     */
    const resumeTimer = useCallback((): void => {
        const state = zone.current;

        if (state.timerRunning || !isOnScreen()) {
            return;
        }

        if (
            state.loaded &&
            Date.now() - state.adFetchedAt >= state.refreshSeconds * 1000
        ) {
            loadNextAdRef.current?.();
        } else {
            startTimer();
        }
    }, [isOnScreen, startTimer]);

    /**
     * Places an ad in the zone, or clears it when there is none, and arms the
     * countdown.
     * @param ad - The ad to display, or undefined when there is no ad.
     * @param refreshSecondsOverride - The refresh time to use when there is no ad.
     */
    const displayAd = useCallback(
        (ad: Ad | undefined, refreshSecondsOverride?: number): void => {
            const state = zone.current;

            if (!state.mounted) {
                // The zone was unmounted while its request was in flight. Dropping
                // the response here keeps unmount final: no render, no impression
                // and no timer for a zone that is gone.
                return;
            }

            // Each ad gets its own impression pair, so the outgoing ad is closed
            // out before the tracking flags reset.
            endImpression();

            state.currentAd = ad;
            state.refreshSeconds = resolveRefreshSeconds(
                ad ? ad.refresh_time : refreshSecondsOverride,
            );
            state.impressionTracked = false;
            state.impressionEndTracked = false;
            state.clickHandled = false;

            // The replacement has not rendered yet. The WebView's own load
            // callback sets this and files the impression from there.
            state.creativeLoaded = false;

            // Armed before anything else, so a later failure cannot leave the zone
            // without a refresh timer.
            restartTimer();

            setCurrentAd(ad);

            // Deliberately no impression here. It is owed when the creative has
            // rendered and the zone is on screen, whichever happens last, so it is
            // filed from the WebView's load callback and re-attempted whenever
            // visibility changes. Android files it from the same place, through
            // onAdLoadedInWebView.
            safeInvoke(props.onZoneHasAds, ad !== undefined);

            // A response with no ad is a fill failure, reported here. A response
            // with an ad whose creative will not render is a render failure,
            // reported from the WebView's error callback.
            if (!ad) {
                safeInvoke(props.onAdLoadFailed);
            }
        },
        [endImpression, restartTimer, props.onZoneHasAds, props.onAdLoadFailed],
    );

    /**
     * Requests a single ad for this zone.
     */
    const fetchAd = useCallback((): void => {
        const state = zone.current;
        const context = getAdRequestContext();

        if (!state.mounted || !context) {
            return;
        }

        if (state.inFlight) {
            // A targeting change arrived while a request was outstanding. Recording
            // it means the zone picks up the new value as soon as that settles,
            // instead of showing the previous one's ad until the next refresh.
            state.refetchWhenSettled = true;

            return;
        }

        state.inFlight = true;
        state.unfilledReported = false;
        state.pendingUnfilledReason = undefined;

        const generation = state.requestGeneration;

        adadaptedApiRequests
            .retrieveAd(
                {
                    sdkId: context.sdkVersion,
                    bundleId: context.bundleId,
                    userId: context.udid,
                    zoneId,
                    storeId: context.storeId,
                    contextId: props.contextId ?? "",
                    sessionId: context.getSessionId(),
                    extra: "",
                },
                context.appId,
                context.apiEnv,
            )
            .then((response) => {
                state.inFlight = false;

                if (generation !== state.requestGeneration) {
                    // Answered for a zone this component is no longer serving.
                    // Displaying it would put the previous zone's creative under
                    // the current one and bill the current one for it.
                    //
                    // Straight back to fetchAd rather than loadNextAd, because the
                    // current zone has not loaded anything yet and loadNextAd
                    // returns early on that, which would strand it with no ad and
                    // no request outstanding.
                    state.refetchWhenSettled = false;

                    fetchAdRef.current?.();

                    return;
                }

                state.loaded = true;

                const body = response.data;

                // The API returns success:false on a 200 for business rejections,
                // so the status code alone is not enough.
                if (!body || body.success === false || !body.data) {
                    reportUnfilled(ZoneUnfilledReason.REQUEST_FAILED);
                    displayAd(undefined, state.refreshSeconds);
                } else if (
                    body.data.ad &&
                    body.data.ad.id &&
                    !body.data.ad.creative_url
                ) {
                    // An ad with an id but nothing to render. It counts as a fill by
                    // every other measure, so without this the zone reported its
                    // mount, no impression and no unfilled reason, and sat blank until
                    // the next refresh.
                    reportUnfilled(ZoneUnfilledReason.RENDER_FAILED);
                    displayAd(undefined, body.data.ad.refresh_time);
                } else if (!body.data.ad || !body.data.ad.id) {
                    // An ad object with no ID is how the API reports that it had
                    // nothing to serve. Its refresh_time is the backoff.
                    reportUnfilled(ZoneUnfilledReason.NO_AD);
                    displayAd(
                        undefined,
                        body.data.ad ? body.data.ad.refresh_time : undefined,
                    );
                } else {
                    displayAd({ ...body.data.ad, zone_id: zoneId });
                }

                if (state.refetchWhenSettled) {
                    state.refetchWhenSettled = false;

                    loadNextAdRef.current?.();
                }
            })
            .catch(() => {
                state.inFlight = false;

                if (generation !== state.requestGeneration) {
                    state.refetchWhenSettled = false;

                    fetchAdRef.current?.();

                    return;
                }

                state.loaded = true;

                reportUnfilled(ZoneUnfilledReason.REQUEST_FAILED);

                // The current refresh time is carried forward, so a failing zone
                // still paces its retries instead of dropping back to the default.
                displayAd(undefined, state.refreshSeconds);

                if (state.refetchWhenSettled) {
                    state.refetchWhenSettled = false;

                    loadNextAdRef.current?.();
                }
            });
    }, [displayAd, props.contextId, reportUnfilled, zoneId]);

    /**
     * The creative could not be rendered. An ad was served, so this is neither a
     * no-fill nor a failed request: Android reports it as its own reason and drops
     * the ad, keeping the refresh time so the zone tries again on schedule.
     * Mirrors AdZonePresenter.onAdDisplayFailed.
     *
     * NOTE: Driven from onError only, not onHttpError. onError is the main frame
     *       failing, which is what Android's onReceivedError covers. onHttpError
     *       can fire for a sub-resource inside a creative that is otherwise fine,
     *       and reporting that as a render failure would discard a real fill.
     */
    const onCreativeFailed = useCallback((): void => {
        const state = zone.current;

        if (!state.currentAd || state.creativeLoaded) {
            return;
        }

        // Cancels the load event Android emits just before this one, which is the
        // whole reason the settle above is deferred.
        if (state.creativeSettleTimer) {
            clearTimeout(state.creativeSettleTimer);

            state.creativeSettleTimer = undefined;
        }

        // Marked handled so a later load event for the same ad cannot file an
        // impression for a creative that already failed.
        state.creativeLoaded = true;

        // onAdLoadFailed is left to displayAd below, which reports it for every
        // outcome leaving the zone without an ad. Calling it here as well fired it
        // twice for a single failure.
        reportUnfilled(ZoneUnfilledReason.RENDER_FAILED);
        displayAd(undefined, state.refreshSeconds);
    }, [displayAd, reportUnfilled]);

    /**
     * Requests the next ad, replacing whatever the zone is showing.
     */
    const loadNextAd = useCallback((): void => {
        const state = zone.current;

        // Armed before the request goes out, and deliberately so. It keeps the
        // countdown owned for the whole time that request is open, which is what
        // makes resumeTimer() a no-op while one is in flight. Without it any
        // visibility change during the request saw a stopped timer and an ad
        // already past its refresh time, queued a refetch, and then billed an
        // impression and an impression_end for the arriving ad in a single tick.
        // A visibility flip mid-request is routine: the demo drives isVisible from
        // navigation focus, and returning to the foreground does the same.
        //
        // This cannot leave a response arriving to an expired timer, because every
        // request is bounded by REQUEST_TIMEOUT_MS, which is below
        // MINIMUM_AD_REFRESH_SECONDS: the response always lands first. Android
        // arms it in both places too, in getNextAd and again in handleAd.
        restartTimer();

        if (state.inFlight) {
            state.refetchWhenSettled = true;

            return;
        }

        if (!state.loaded) {
            return;
        }

        endImpression();

        fetchAd();
    }, [endImpression, fetchAd, restartTimer]);

    // Declared before the effects below so it flushes first on mount, which
    // guarantees the refs are populated before any timer or response can read them.
    useEffect(() => {
        loadNextAdRef.current = loadNextAd;
        fetchAdRef.current = fetchAd;
    }, [loadNextAd, fetchAd]);

    // Mount and unmount. Mirrors AdZonePresenter.onStart / onStop.
    useEffect(() => {
        const state = zone.current;

        state.mounted = true;

        /**
         * Starts the zone once there is a session and device info to request with.
         *
         * Also restarts one that SDK teardown closed out, which is what makes a
         * host that calls unmount() and then initialize() again work: teardown
         * cancels the countdown, so without this the zone stayed on screen with no
         * timer and never served or reported anything again.
         */
        const start = (): void => {
            if (state.started && !state.closed) {
                return;
            }

            // Whatever was on screen belonged to the previous cycle: either to a
            // different zone, or to a session that has since ended. Either way it
            // must not stay up, or the arriving zone gets billed for it.
            state.currentAd = undefined;

            setCurrentAd(undefined);

            // The tracking flags go with it. Leaving them to displayAd was wrong:
            // displayAd calls endImpression() before resetting them, and
            // endImpression reports against a currentAd this has already cleared,
            // so a creative that finished loading after teardown left
            // impressionTracked set and the next ad opened with an impression_end
            // carrying an empty ad id and impression id.
            if (state.creativeSettleTimer) {
                clearTimeout(state.creativeSettleTimer);

                state.creativeSettleTimer = undefined;
            }

            state.creativeLoaded = false;
            state.impressionTracked = false;
            state.impressionEndTracked = false;
            state.clickHandled = false;

            // Anything already in flight was asked on behalf of the previous zone.
            state.requestGeneration += 1;

            state.started = true;
            state.closed = false;

            // The ad from before teardown is gone, so this is a fresh cycle.
            state.loaded = false;

            // Reported for every zone, whether it ever receives an ad or not.
            reportEvent(ReportedEventType.ZONE_MOUNTED);

            (fetchAdRef.current ?? fetchAd)();
        };

        // A host renders its layout immediately, while initialize() is still
        // gathering device info over the native bridge, so a zone normally mounts
        // before there is any context to request with. Android has no equivalent
        // problem: its SessionClient is an object that always exists, so the
        // presenter can call straight into it. Here the zone waits to be told.
        //
        // Subscribed for the component's lifetime rather than just until the first
        // context, so a later initialize() reaches a zone that is still mounted.
        const unsubscribe = onAdRequestContextReady(start);

        if (getAdRequestContext()) {
            start();
        }

        return () => {
            unsubscribe();

            endImpression();
            cancelTimer();

            state.mounted = false;

            // Only if the mount was reported and the zone has not already been
            // closed out by SDK teardown, so mounts and unmounts stay paired one
            // to one however the zone goes away.
            if (state.started && !state.closed) {
                state.closed = true;

                reportEvent(ReportedEventType.ZONE_UNMOUNTED);
            }
        };
        // Re-runs when the zone changes, which is what makes a switch report an
        // unmount for the zone being left and a mount for the one arriving. React
        // runs the cleanup with the previous render's closures, so the unmount is
        // still attributed to the zone it belongs to. Without this the change was
        // ignored outright: no events either way, and the new zone displayed the
        // previous one's ad until its next refresh happened to request the right
        // one. A host can still avoid all of it by keying the component.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoneId]);

    // The host app reports visibility, since the SDK cannot determine it here.
    useEffect(() => {
        const state = zone.current;

        state.isVisible = isVisible;

        if (isOnScreen()) {
            flushUnfilled();
            trackImpression();
            resumeTimer();
        } else {
            endImpression();
            pauseTimer();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isVisible]);

    // A backgrounded app is not showing its ads to anyone.
    //
    // The SDK owns the AppState subscription and calls in here, rather than each
    // zone listening for itself. A zone's own listener registers first, because
    // child effects run before the parent's and the SDK's registration waits on
    // the native device info call, so on returning from the background this zone
    // would have refetched before the SDK resolved the session and requested an ad
    // against the session it was about to replace.
    useEffect(() => {
        return subscribeToAppActive((isActive) => {
            const state = zone.current;

            state.isAppActive = isActive;

            if (isActive) {
                flushUnfilled();
                trackImpression();
                resumeTimer();
            } else {
                endImpression();
                pauseTimer();
            }
        });
        // Resubscribed when the zone changes. These callbacks close over
        // reportEvent, which carries the zone id, so an empty dependency array
        // left this subscription holding the first render's zone for the life of
        // the component: after a switch, this zone's own events were reported
        // against the zone it used to be.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoneId]);

    // The SDK is going away. Close out while there is still a context to report
    // through, because releasing it turns every report into a no-op.
    useEffect(() => {
        return subscribeToSdkTeardown(() => {
            const state = zone.current;

            endImpression();
            cancelTimer();

            if (state.started && !state.closed) {
                state.closed = true;

                reportEvent(ReportedEventType.ZONE_UNMOUNTED);
            }
        });
        // Same reason as above: without this, teardown after a zone switch
        // reported a second unmount for the zone that had already been left, and
        // none at all for the one actually on screen.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zoneId]);

    // A changed recipe context means the ad on screen was chosen for the wrong one.
    const previousContextId = useRef(props.contextId);

    useEffect(() => {
        const state = zone.current;

        if (previousContextId.current === props.contextId) {
            return;
        }

        previousContextId.current = props.contextId;

        if (state.inFlight) {
            // The open request was built with the previous context, so pick the
            // new one up as soon as it settles. Gating this on loaded instead
            // dropped the change entirely for the very first request, leaving the
            // zone showing an ad chosen for a context it is no longer in, with
            // nothing to make it try again.
            state.refetchWhenSettled = true;

            return;
        }

        if (state.loaded) {
            loadNextAdRef.current?.();
        }
    }, [props.contextId]);

    /**
     * Generates all component related styles.
     * @returns the styles needed for the component.
     */
    function generateStyles(): AdZoneTypes.StyleDef {
        return StyleSheet.create<AdZoneTypes.StyleDef>({
            mainView: {
                width: "100%",
                height: "100%",
            },
            webView: {
                width: "100%",
                height: "100%",
            },
            reportAd: {
                position: "absolute",
                top: 10,
                right: 10,
            },
        });
    }

    const styles = generateStyles();

    // With no ad to display the view takes up no space.
    //
    // Composed rather than mutated: StyleSheet.create returns Readonly styles
    // under React Native's Strict TypeScript API, and mutating the object it
    // returns was never safe even when the types allowed it.
    const finalMainViewStyle: StyleProp<ViewStyle> =
        !currentAd || !currentAd.creative_url
            ? [styles.mainView, { width: 0, height: 0 }]
            : [styles.mainView, props.style];

    /**
     * Triggers when the user selects the ad zone.
     * @param selectedAd - The ad that was selected.
     */
    function onAdZoneSelected(selectedAd: Ad): void {
        const state = zone.current;

        // The zone keeps showing this ad until its replacement arrives, so the
        // touch target stays live and a second tap would report a second click
        // against the same impression.
        if (state.clickHandled) {
            return;
        }

        let wasHandled = false;

        if (
            selectedAd.action_type === AdActionType.EXTERNAL &&
            selectedAd.action_path
        ) {
            wasHandled = true;

            reportEvent(ReportedEventType.INTERACTION, selectedAd);

            Linking.openURL(selectedAd.action_path).then();
        } else if (
            selectedAd.action_type === AdActionType.CONTENT &&
            selectedAd.payload &&
            selectedAd.payload.detailed_list_items
        ) {
            wasHandled = true;

            // An "add to list" click reports no interaction yet. The items have
            // only been offered at this point, and the interaction is earned when
            // the host app confirms they reached the list, through
            // AdadaptedReactNativeSdk.acknowledge. Android splits it the same way:
            // atl_ad_clicked here, trackInteraction in AdContent.acknowledge.
            getAdRequestContext()?.reportSdkEvent(SdkEventName.ATL_AD_CLICKED, {
                id: selectedAd.id,
            });

            getAdRequestContext()?.setPendingAtlContent({
                adId: selectedAd.id,
                zoneId: props.zoneId,
                impressionId: selectedAd.impression_id,
                items: selectedAd.payload.detailed_list_items,
                isHandled: false,
            });

            const items = selectedAd.payload.detailed_list_items;

            if (props.onAddToListTriggered) {
                props.onAddToListTriggered(items);
            } else {
                // No handler on this zone, so fall back to the one the host gave
                // initialize(). Before zones became components that was the only
                // place to set it.
                getAdRequestContext()?.forwardAddToList(items);
            }
        }

        if (!wasHandled) {
            // An action type this SDK cannot handle must not cost the zone its ad.
            return;
        }

        state.clickHandled = true;

        loadNextAd();
    }

    // Returned JSX.
    return (
        <View style={finalMainViewStyle}>
            {currentAd && currentAd.creative_url ? (
                <WebView<object>
                    // Keyed on the impression so each served ad gets its own
                    // WebView. Both platforms refuse to reload an identical URL —
                    // iOS compares the whole source dictionary, Android returns
                    // early when the new uri equals the current one — so an ad
                    // repeating the creative_url already on screen fired no load
                    // event, and since the impression is owed on that event it was
                    // never reported at all. Rotating between two ads sharing a
                    // creative is enough to trigger it.
                    key={currentAd.impression_id}
                    ref={webViewRef}
                    source={{ uri: currentAd.creative_url }}
                    androidLayerType="hardware"
                    automaticallyAdjustContentInsets={false}
                    style={styles.webView}
                    onLoad={onCreativeLoaded}
                    onError={onCreativeFailed}
                    onTouchStart={(e) => {
                        touchStartCoords.current = {
                            x: e.nativeEvent.pageX,
                            y: e.nativeEvent.pageY,
                        };
                    }}
                    onTouchEnd={(e) => {
                        const touchStart = touchStartCoords.current;
                        const touchEndCoords: AdZoneTypes.TouchCoordinates = {
                            x: e.nativeEvent.pageX,
                            y: e.nativeEvent.pageY,
                        };

                        if (
                            Math.abs(touchStart.x - touchEndCoords.x) <
                                dragDistanceAllowed &&
                            Math.abs(touchStart.y - touchEndCoords.y) <
                                dragDistanceAllowed
                        ) {
                            onAdZoneSelected(currentAd);
                        }

                        touchStartCoords.current = { x: 0, y: 0 };
                    }}
                />
            ) : undefined}
            <View style={styles.reportAd}>
                {currentAd ? (
                    <ReportAdButton
                        adId={currentAd.id}
                        udid={getAdRequestContext()?.udid ?? ""}
                    />
                ) : (
                    <></>
                )}
            </View>
        </View>
    );
};
