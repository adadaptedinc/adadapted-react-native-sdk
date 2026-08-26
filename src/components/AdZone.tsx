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
import {
    AppState,
    AppStateStatus,
    Linking,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
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
import { AdZoneTypes } from "src/componentTypes/AdZone";
import { getAdRequestContext } from "../adRequestContext";

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
    const isVisible = props.isVisible ?? true;
    const dragDistanceAllowed = props.xyDragDistanceAllowed ?? 25;

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

        if (!state.currentAd || state.impressionTracked || !isOnScreen()) {
            return;
        }

        state.impressionTracked = true;

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

            // Armed before anything else, so a later failure cannot leave the zone
            // without a refresh timer.
            restartTimer();

            setCurrentAd(ad);
            trackImpression();

            safeInvoke(props.onZoneHasAds, ad !== undefined);

            if (ad) {
                safeInvoke(props.onAdLoaded);
            } else {
                safeInvoke(props.onAdLoadFailed);
            }
        },
        [
            endImpression,
            restartTimer,
            trackImpression,
            props.onZoneHasAds,
            props.onAdLoaded,
            props.onAdLoadFailed,
        ],
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
                state.loaded = true;

                const body = response.data;

                // The API returns success:false on a 200 for business rejections,
                // so the status code alone is not enough.
                if (!body || body.success === false || !body.data) {
                    reportUnfilled(ZoneUnfilledReason.REQUEST_FAILED);
                    displayAd(undefined, state.refreshSeconds);
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
     * Requests the next ad, replacing whatever the zone is showing.
     */
    const loadNextAd = useCallback((): void => {
        const state = zone.current;

        // Armed before the request goes out, so a slow or failing response cannot
        // leave the zone without a timer.
        restartTimer();

        if (state.inFlight) {
            state.refetchWhenSettled = true;

            return;
        }

        if (!state.loaded) {
            return;
        }

        // Rotated out, so the ad the zone was showing is done.
        endImpression();

        fetchAd();
    }, [endImpression, fetchAd, restartTimer]);

    // Declared before the effects below so it flushes first on mount, which
    // guarantees the ref is populated before any timer or response can read it.
    useEffect(() => {
        loadNextAdRef.current = loadNextAd;
    }, [loadNextAd]);

    // Mount and unmount. Mirrors AdZonePresenter.onStart / onStop.
    useEffect(() => {
        const state = zone.current;

        state.mounted = true;

        // Reported for every zone, whether it ever receives an ad or not.
        reportEvent(ReportedEventType.ZONE_MOUNTED);

        fetchAd();

        return () => {
            endImpression();
            cancelTimer();

            state.mounted = false;

            reportEvent(ReportedEventType.ZONE_UNMOUNTED);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
    useEffect(() => {
        const onAppStateChange = (status: AppStateStatus): void => {
            const state = zone.current;

            // "inactive" is an iOS-only transient state with no Android analogue,
            // so it is ignored rather than treated as backgrounded.
            if (status === "active") {
                state.isAppActive = true;

                flushUnfilled();
                trackImpression();
                resumeTimer();
            } else if (status === "background") {
                state.isAppActive = false;

                endImpression();
                pauseTimer();
            }
        };

        const subscription = AppState.addEventListener(
            "change",
            onAppStateChange,
        );

        return () => subscription.remove();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // A changed recipe context means the ad on screen was chosen for the wrong one.
    const previousContextId = useRef(props.contextId);

    useEffect(() => {
        if (previousContextId.current === props.contextId) {
            return;
        }

        previousContextId.current = props.contextId;

        if (zone.current.loaded) {
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
                <WebView
                    source={{ uri: currentAd.creative_url }}
                    androidLayerType="hardware"
                    automaticallyAdjustContentInsets={false}
                    style={styles.webView}
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
