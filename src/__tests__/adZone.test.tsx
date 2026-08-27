/**
 * Tests for the AdZone component.
 *
 * A zone now owns its own request, its own refresh countdown and its own
 * impression pairing, so most of these assert that one zone's behaviour is
 * independent of any other. The refresh timing tests are the reason the component
 * keeps its bookkeeping in a ref rather than state.
 * @module
 */
import React from "react";
import { Linking } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AdZone } from "../components/AdZone";
import * as adadaptedApiRequests from "../api/adadaptedApiRequests";
import {
    AdEventReport,
    AdRequestContext,
    notifyAppActiveChanged,
    notifySdkTeardown,
    setAdRequestContext,
    PendingAtlContent,
} from "../adRequestContext";
import {
    Ad,
    AdActionType,
    ReportedEventType,
    SdkEventName,
    ZoneUnfilledReason,
} from "../api/adadaptedApiTypes";
import { EnvironmentTypes } from "../componentTypes/Environment";

// Rendered as a View that keeps its props, so a test can read which creative the
// zone is showing and drive touches through it.
// Stands in for the native WebView. An impression is now owed only once the
// creative has rendered, so the mock has to be able to report that: onLoad is
// fired from the test through the rendered element, and injectJavaScript is
// recorded so the pixel injection can be asserted.
const injectedScripts: string[] = [];

/**
 * Which WebView instance has already loaded which url.
 *
 * Both platforms refuse to reload a url a live WebView is already showing: iOS
 * compares the whole source dictionary, Android returns early when the new uri
 * equals the current one. Modelling that is what makes a test able to tell whether
 * each served ad really gets its own load event.
 */
const loadedByInstance = new Map<number, string>();

let mockNextWebViewInstanceId = 0;

jest.mock("react-native-webview", () => {
    const reactNative = jest.requireActual("react-native");
    const react = jest.requireActual("react");

    return {
        WebView: react.forwardRef((props: any, ref: any) => {
            // Stable for the life of one mounted instance, so remounting through a
            // changed key produces a new one and reusing the instance does not.
            const instanceId = react.useRef(undefined);

            if (instanceId.current === undefined) {
                mockNextWebViewInstanceId += 1;
                instanceId.current = mockNextWebViewInstanceId;
            }

            react.useImperativeHandle(ref, () => ({
                injectJavaScript: (script: string) => {
                    injectedScripts.push(script);
                },
            }));

            return react.createElement(reactNative.View, {
                ...props,
                testID: "ad-creative",
                // Read by the load helpers to decide whether this instance would
                // actually reload.
                "data-instance-id": instanceId.current,
            });
        }),
    };
});

/**
 * Whether firing a load event on the element now on screen is realistic, i.e.
 * whether a real WebView would have reloaded rather than ignored the source.
 * @returns true when the platform would have loaded.
 */
function creativeWouldLoad(): boolean {
    const creative = screen.getByTestId("ad-creative");
    const instanceId = creative.props["data-instance-id"] as number;
    const uri = creative.props.source.uri as string;

    if (loadedByInstance.get(instanceId) === uri) {
        return false;
    }

    loadedByInstance.set(instanceId, uri);

    return true;
}

/**
 * Simulates the creative finishing its render, which is what makes an impression
 * owed. Nothing is reported for an ad whose creative never paints.
 *
 * The timers are flushed because a load event is only acted on after a deferral,
 * so that an error arriving straight after it can cancel the impression.
 */
async function loadCreative(): Promise<void> {
    const creative = screen.getByTestId("ad-creative");

    if (!creativeWouldLoad()) {
        // A real WebView would ignore this source, so no load event exists to
        // fire. Simply returning is what reproduces the platform.
        return;
    }

    await act(async () => {
        fireEvent(creative, "load", { nativeEvent: {} });

        await Promise.resolve();
    });

    await act(async () => {
        jest.advanceTimersByTime(1);

        await Promise.resolve();
    });
}

/**
 * Simulates the creative failing to render, in the order Android delivers it.
 *
 * react-native-webview's Android client synthesises a finish event before the
 * error event on purpose, and maps finish to onLoad, so a failing creative really
 * does report a successful load first. Firing only the error, as this helper used
 * to, tested a sequence neither platform produces and hid the fact that the first
 * event was being trusted.
 */
async function failCreative(): Promise<void> {
    const creative = screen.getByTestId("ad-creative");

    await act(async () => {
        fireEvent(creative, "load", { nativeEvent: {} });
        fireEvent(creative, "error", { nativeEvent: { description: "boom" } });

        await Promise.resolve();
    });

    await act(async () => {
        jest.advanceTimersByTime(1);

        await Promise.resolve();
    });
}

/**
 * Simulates the creative failing to render, in the order iOS delivers it: the
 * error alone, with no preceding load event.
 */
async function failCreativeWithoutLoad(): Promise<void> {
    const creative = screen.getByTestId("ad-creative");

    await act(async () => {
        fireEvent(creative, "error", { nativeEvent: { description: "boom" } });

        await Promise.resolve();
    });

    await act(async () => {
        jest.advanceTimersByTime(1);

        await Promise.resolve();
    });
}

const ZONE_ID = "102110";
const SESSION_ID = "RNABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

let reportAdEvent: jest.Mock<void, [AdEventReport]>;
let reportSdkEvent: jest.Mock;
let forwardAddToList: jest.Mock;
let pendingAtlContent: PendingAtlContent | undefined;
let retrieveAdMock: jest.SpyInstance;

/**
 * Builds an ad, overriding only what a test cares about.
 * @param overrides - The fields to override.
 * @returns the ad.
 */
function buildAd(overrides: Partial<Ad> = {}): Ad {
    return {
        id: "ad-1",
        impression_id: "impression-1",
        refresh_time: 30,
        creative_url: "https://example.test/creative-1.html",
        action_path: "https://example.test/landing",
        action_type: AdActionType.EXTERNAL,
        payload: { detailed_list_items: [] },
        ...overrides,
    };
}

/**
 * Queues a successful ad response.
 * @param ad - The ad the API should serve, or undefined for a no-fill.
 * @param refreshTime - The refresh time to report on a no-fill.
 */
function serveAd(ad?: Ad, refreshTime = 30): void {
    retrieveAdMock.mockResolvedValue({
        data: {
            success: true,
            data: {
                ad: ad ?? ({ id: "", refresh_time: refreshTime } as Ad),
                port_height: 100,
                port_width: 320,
            },
        },
    } as any);
}

/**
 * Lets pending promises settle while fake timers are installed.
 */
async function settle(): Promise<void> {
    await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
    });
}

/**
 * Reads the event types reported so far.
 * @returns the reported event types, in order.
 */
function reportedTypes(): string[] {
    return reportAdEvent.mock.calls.map(([event]) => event.eventType);
}

/**
 * Advances fake timers and lets any resulting request settle.
 * @param ms - How far to advance.
 */
async function advance(ms: number): Promise<void> {
    await act(async () => {
        jest.advanceTimersByTime(ms);

        // Not incidental: the async form of act is what drains the microtask queue
        // once the timers have fired, so a refresh triggered by that tick settles.
        await Promise.resolve();
    });

    await settle();
}

/**
 * Builds the context the SDK registers during initialize().
 * @returns the context.
 */
function buildContext(): AdRequestContext {
    return {
        appId: "TEST_APP_ID",
        apiEnv: EnvironmentTypes.ApiEnv.Dev,
        udid: "test-udid",
        bundleId: "com.test.app",
        sdkVersion: "1.2.3",
        storeId: "store-1",
        xyDragDistanceAllowed: undefined,
        getSessionId: () => SESSION_ID,
        reportAdEvent,
        reportSdkEvent,
        setPendingAtlContent: (content) => {
            pendingAtlContent = content;
        },
        forwardAddToList,
    };
}

/**
 * Taps the creative, moving the given distance between touch down and up.
 * @param distance - How far the touch travels.
 */
function tapCreative(distance = 0): void {
    const creative = screen.getByTestId("ad-creative");

    fireEvent(creative, "touchStart", {
        nativeEvent: { pageX: 100, pageY: 100 },
    });
    fireEvent(creative, "touchEnd", {
        nativeEvent: { pageX: 100 + distance, pageY: 100 },
    });
}

beforeEach(() => {
    // jest.spyOn hands back the existing mock when a method is already spied, and
    // Linking.openURL survives restoreAllMocks here, so a spy can otherwise arrive
    // still carrying the previous test's calls. Clearing every mock's history up
    // front makes each test's counts its own.
    jest.restoreAllMocks();
    jest.clearAllMocks();

    injectedScripts.length = 0;
    loadedByInstance.clear();

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T12:00:00Z"));

    reportAdEvent = jest.fn();
    reportSdkEvent = jest.fn();
    forwardAddToList = jest.fn();
    pendingAtlContent = undefined;

    setAdRequestContext(buildContext());

    retrieveAdMock = jest.spyOn(adadaptedApiRequests, "retrieveAd");
    serveAd(buildAd());

    jest.spyOn(Linking, "openURL").mockResolvedValue();
});

afterEach(() => {
    setAdRequestContext(undefined);

    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe("requesting an ad", () => {
    it("requests a single ad for its own zone on mount", async () => {
        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        const [requestData, appId] = retrieveAdMock.mock.calls[0];

        expect(requestData.zoneId).toBe(ZONE_ID);
        expect(requestData.sessionId).toBe(SESSION_ID);
        expect(requestData.storeId).toBe("store-1");
        expect(appId).toBe("TEST_APP_ID");
    });

    it("gives each zone its own request, rather than one shared list", async () => {
        render(
            <>
                <AdZone zoneId="zone-a" isVisible={true} />
                <AdZone zoneId="zone-b" isVisible={true} />
            </>,
        );

        await settle();

        expect(
            retrieveAdMock.mock.calls.map(([request]) => request.zoneId).sort(),
        ).toEqual(["zone-a", "zone-b"]);
    });

    it("reports the zone as mounted, and as unmounted when it goes away", async () => {
        const view = render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        // Counted, not merely present: a toContain assertion passes at any
        // multiplicity and would miss a zone reporting two unmounts for one mount.
        expect(
            reportedTypes().filter(
                (type) => type === ReportedEventType.ZONE_MOUNTED,
            ),
        ).toHaveLength(1);

        view.unmount();

        expect(
            reportedTypes().filter(
                (type) => type === ReportedEventType.ZONE_UNMOUNTED,
            ),
        ).toHaveLength(1);
    });

    it("sends the recipe context the zone was given", async () => {
        render(
            <AdZone zoneId={ZONE_ID} isVisible={true} contextId="recipe-7" />,
        );

        await settle();

        expect(retrieveAdMock.mock.calls[0][0].contextId).toBe("recipe-7");
    });
});

describe("mounting before the SDK is ready", () => {
    it("requests its ad once initialize() registers the context", async () => {
        // The real ordering: a host renders its layout straight away, while
        // initialize() is still gathering device info over the native bridge. Every
        // other test in this file sets the context first, which is why an emulator
        // run was what caught this: the zone sat empty for the whole session.
        setAdRequestContext(undefined);

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        expect(retrieveAdMock).not.toHaveBeenCalled();
        expect(reportAdEvent).not.toHaveBeenCalled();

        await act(async () => {
            setAdRequestContext(buildContext());

            await Promise.resolve();
        });

        await settle();

        expect(retrieveAdMock).toHaveBeenCalledTimes(1);
        expect(retrieveAdMock.mock.calls[0][0].zoneId).toBe(ZONE_ID);
        expect(reportedTypes()).toContain(ReportedEventType.ZONE_MOUNTED);
    });

    it("reports no unmount for a zone that never started", async () => {
        setAdRequestContext(undefined);

        const view = render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        view.unmount();

        // Nothing to pair the unmount with, since the mount was never reported.
        expect(reportAdEvent).not.toHaveBeenCalled();
    });

    it("stops waiting when it unmounts, so a late context does not revive it", async () => {
        setAdRequestContext(undefined);

        const view = render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        view.unmount();

        await act(async () => {
            setAdRequestContext(buildContext());

            await Promise.resolve();
        });

        await settle();

        // A zone that is gone must not request an ad, or report against one.
        expect(retrieveAdMock).not.toHaveBeenCalled();
        expect(reportAdEvent).not.toHaveBeenCalled();
    });
});

describe("after the SDK is torn down and re-initialized", () => {
    it("does not open the next ad with an orphaned impression_end", async () => {
        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        // Torn down while the creative is still loading.
        await act(async () => {
            notifySdkTeardown();
            setAdRequestContext(undefined);

            await Promise.resolve();
        });

        // The creative finishes afterwards, which marks the impression tracked
        // even though the report itself goes nowhere without a context.
        await loadCreative();

        serveAd(buildAd({ id: "ad-next", impression_id: "impression-next" }));

        await act(async () => {
            setAdRequestContext(buildContext());

            await Promise.resolve();
        });
        await settle();

        const ends = reportAdEvent.mock.calls
            .map(([event]) => event)
            .filter(
                (event) => event.eventType === ReportedEventType.IMPRESSION_END,
            );

        // displayAd calls endImpression before resetting the flags, and
        // endImpression reads a currentAd that start() has already cleared, so the
        // next ad used to arrive behind an impression_end with empty ids: a
        // billing event with no impression to match it.
        for (const end of ends) {
            expect(end.adId).not.toBe("");
            expect(end.impressionId).not.toBe("");
        }
    });

    it("serves again for a zone that stayed mounted", async () => {
        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        // What sdk.unmount() does.
        await act(async () => {
            notifySdkTeardown();
            setAdRequestContext(undefined);

            await Promise.resolve();
        });

        // ...and then the host initializes again, on a login or store change.
        await act(async () => {
            setAdRequestContext(buildContext());

            await Promise.resolve();
        });
        await settle();

        // Teardown cancels the countdown, so without a restart the zone sat on
        // screen with no timer and never served or reported anything again.
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
        expect(
            reportedTypes().filter(
                (type) => type === ReportedEventType.ZONE_MOUNTED,
            ),
        ).toHaveLength(2);
    });
});

describe("displaying an ad", () => {
    it("renders the served creative", async () => {
        serveAd(
            buildAd({ creative_url: "https://example.test/creative-9.html" }),
        );

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        expect(screen.getByTestId("ad-creative").props.source.uri).toBe(
            "https://example.test/creative-9.html",
        );
    });

    it("reports one impression for the ad it is showing", async () => {
        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        await loadCreative();

        const impressions = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.IMPRESSION,
        );

        expect(impressions).toHaveLength(1);
        expect(impressions[0][0].adId).toBe("ad-1");
        expect(impressions[0][0].impressionId).toBe("impression-1");
        expect(impressions[0][0].zoneId).toBe(ZONE_ID);
    });

    it("tells the host whether the zone has an ad", async () => {
        const onZoneHasAds = jest.fn();

        render(
            <AdZone
                zoneId={ZONE_ID}
                isVisible={true}
                onZoneHasAds={onZoneHasAds}
            />,
        );

        await settle();

        expect(onZoneHasAds).toHaveBeenLastCalledWith(true);
    });
});

describe("the creative rendering", () => {
    it("reports no impression until the creative has rendered", async () => {
        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        // The response has arrived and the ad is on screen, but nothing has
        // painted. Billing here charges for ads the user could not have seen.
        expect(reportedTypes()).not.toContain(ReportedEventType.IMPRESSION);

        await loadCreative();

        expect(reportedTypes()).toContain(ReportedEventType.IMPRESSION);
    });

    it("fires the creative's tracking pixels before reporting the impression", async () => {
        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        expect(injectedScripts).toEqual([]);

        await loadCreative();

        // Without this, advertiser-side and third party measurement never fires,
        // so external verification sees no impressions at all.
        expect(injectedScripts).toEqual(["loadTrackingPixels()"]);
    });

    it("waits for visibility as well as the render, in either order", async () => {
        const view = render(<AdZone zoneId={ZONE_ID} isVisible={false} />);

        await settle();

        // Rendered while off screen: owed nothing yet.
        await loadCreative();

        expect(reportedTypes()).not.toContain(ReportedEventType.IMPRESSION);
        expect(injectedScripts).toEqual([]);

        view.update(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        // Now both conditions hold, so the impression is owed at this point.
        expect(reportedTypes()).toContain(ReportedEventType.IMPRESSION);
        expect(injectedScripts).toEqual(["loadTrackingPixels()"]);
    });

    it("reports no impression on a visibility change before the render", async () => {
        const view = render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        // The ad has arrived but has not painted. Toggling visibility must not be
        // enough on its own: without the render gate this bills an impression for
        // a creative that has shown nothing.
        view.update(<AdZone zoneId={ZONE_ID} isVisible={false} />);
        view.update(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        expect(reportedTypes()).not.toContain(ReportedEventType.IMPRESSION);
        expect(injectedScripts).toEqual([]);

        await loadCreative();

        expect(
            reportedTypes().filter(
                (type) => type === ReportedEventType.IMPRESSION,
            ),
        ).toHaveLength(1);
    });

    it("still owes an impression when the next ad repeats the same creative", async () => {
        serveAd(
            buildAd({
                id: "ad-1",
                impression_id: "impression-1",
                creative_url: "https://example.test/shared.html",
            }),
        );

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        await loadCreative();

        // Same creative_url, different serve. Both platforms refuse to reload an
        // identical url, so without a per-impression WebView no load event fires
        // and the ad is displayed for a whole refresh interval earning nothing.
        serveAd(
            buildAd({
                id: "ad-2",
                impression_id: "impression-2",
                creative_url: "https://example.test/shared.html",
            }),
        );

        await advance(30_000);
        await loadCreative();

        const impressions = reportAdEvent.mock.calls
            .map(([event]) => event)
            .filter(
                (event) => event.eventType === ReportedEventType.IMPRESSION,
            );

        expect(impressions.map((event) => event.impressionId)).toEqual([
            "impression-1",
            "impression-2",
        ]);
    });

    it("reports render_failed when the error arrives with no preceding load", async () => {
        serveAd(buildAd({ refresh_time: 45 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        // iOS delivers only the error. Android synthesises a load first, which
        // failCreative covers.
        await failCreativeWithoutLoad();

        const unfilled = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.ZONE_UNFILLED,
        );

        expect(unfilled).toHaveLength(1);
        expect(unfilled[0][0].eventName).toBe(ZoneUnfilledReason.RENDER_FAILED);
        expect(reportedTypes()).not.toContain(ReportedEventType.IMPRESSION);
        expect(injectedScripts).toEqual([]);
    });

    it("reports one load failure to the host, not two", async () => {
        const onAdLoadFailed = jest.fn();

        serveAd(buildAd());

        render(
            <AdZone
                zoneId={ZONE_ID}
                isVisible={true}
                onAdLoadFailed={onAdLoadFailed}
            />,
        );

        await settle();
        await failCreative();

        // The render failure path and the display of the resulting empty zone both
        // used to report it.
        expect(onAdLoadFailed).toHaveBeenCalledTimes(1);
    });

    it("reports render_failed and drops an ad whose creative will not load", async () => {
        serveAd(buildAd({ refresh_time: 45 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        await failCreative();

        const unfilled = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.ZONE_UNFILLED,
        );

        expect(unfilled).toHaveLength(1);
        expect(unfilled[0][0].eventName).toBe(ZoneUnfilledReason.RENDER_FAILED);

        // An ad was served, so this is neither a no-fill nor a failed request.
        expect(reportedTypes()).not.toContain(ReportedEventType.IMPRESSION);
        expect(injectedScripts).toEqual([]);

        // Dropped, and the served refresh time is kept so the zone retries on
        // schedule rather than sitting on a creative that will not paint.
        expect(screen.queryByTestId("ad-creative")).toBeNull();

        await advance(44_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        await advance(1_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("tells the host whether the creative rendered, not whether one was served", async () => {
        const onAdLoaded = jest.fn();
        const onAdLoadFailed = jest.fn();

        render(
            <AdZone
                zoneId={ZONE_ID}
                isVisible={true}
                onAdLoaded={onAdLoaded}
                onAdLoadFailed={onAdLoadFailed}
            />,
        );

        await settle();

        // A served ad is not a loaded ad. Android reports these from the WebView's
        // own load callbacks, so the prop names mean the same thing on both.
        expect(onAdLoaded).not.toHaveBeenCalled();

        await loadCreative();

        expect(onAdLoaded).toHaveBeenCalledTimes(1);
        expect(onAdLoadFailed).not.toHaveBeenCalled();
    });

    it("reports one impression and one load however many times the creative reloads", async () => {
        const onAdLoaded = jest.fn();

        render(
            <AdZone
                zoneId={ZONE_ID}
                isVisible={true}
                onAdLoaded={onAdLoaded}
            />,
        );

        await settle();
        await loadCreative();
        await loadCreative();

        expect(
            reportedTypes().filter(
                (type) => type === ReportedEventType.IMPRESSION,
            ),
        ).toHaveLength(1);
        expect(injectedScripts).toEqual(["loadTrackingPixels()"]);

        // A creative that reloads itself is still one loaded ad, so the host hears
        // about it once. Android guards this with the same flag.
        expect(onAdLoaded).toHaveBeenCalledTimes(1);
    });
});

describe("refreshing", () => {
    it("requests the next ad once the refresh time has elapsed", async () => {
        serveAd(buildAd({ refresh_time: 30 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        await advance(29_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        await advance(1_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("clamps a refresh time below the minimum instead of hammering the API", async () => {
        serveAd(buildAd({ refresh_time: 2 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        // Would already have refreshed several times if the served 2 seconds were
        // honoured. The floor is 15 seconds, as on Android.
        await advance(14_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        await advance(1_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("falls back to the default when no usable refresh time is served", async () => {
        serveAd(buildAd({ refresh_time: 0 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        await advance(59_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        await advance(1_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("closes out each ad's impression exactly once as it rotates", async () => {
        serveAd(buildAd({ refresh_time: 30 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        await loadCreative();

        serveAd(
            buildAd({
                id: "ad-2",
                impression_id: "impression-2",
                refresh_time: 30,
                // A distinct creative. Reusing ad-1's url made this test pass only
                // because the mock re-fires load on an unchanged source, which
                // neither platform does, and so hid exactly the defect the test
                // below covers.
                creative_url: "https://example.test/creative-2.html",
            }),
        );

        await advance(30_000);
        await loadCreative();

        const impressions = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.IMPRESSION,
        );
        const ends = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.IMPRESSION_END,
        );

        expect(impressions.map(([event]) => event.adId)).toEqual([
            "ad-1",
            "ad-2",
        ]);

        // The first ad's impression is closed. The second is still on screen, so
        // it has no end yet: one end per impressed ad, never more.
        expect(ends).toHaveLength(1);
        expect(ends[0][0].adId).toBe("ad-1");
        expect(ends[0][0].impressionId).toBe("impression-1");
    });
});

describe("visibility", () => {
    it("does not refresh while the host reports the zone off screen", async () => {
        serveAd(buildAd({ refresh_time: 30 }));

        const view = render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        view.update(<AdZone zoneId={ZONE_ID} isVisible={false} />);

        await advance(60_000);

        // Still the one request from mount. An off screen zone burning through ads
        // would bill impressions nobody saw.
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);
    });

    it("waits out only the remaining time when the zone comes back", async () => {
        serveAd(buildAd({ refresh_time: 30 }));

        const view = render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        // 10 seconds of the 30 spent on screen.
        await advance(10_000);

        view.update(<AdZone zoneId={ZONE_ID} isVisible={false} />);

        await advance(5_000);

        view.update(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        // 19 more seconds: one short of the 20 that were left.
        await advance(19_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        await advance(1_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("replaces an ad that outlived its refresh time while off screen", async () => {
        serveAd(buildAd({ refresh_time: 30 }));

        const view = render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        view.update(<AdZone zoneId={ZONE_ID} isVisible={false} />);

        await advance(60_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        view.update(<AdZone zoneId={ZONE_ID} isVisible={true} />);
        await settle();

        // Shown for longer than its refresh time already, so it is replaced on
        // return rather than being given a fresh countdown.
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("ends the impression when the zone leaves the screen", async () => {
        const view = render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        await loadCreative();

        view.update(<AdZone zoneId={ZONE_ID} isVisible={false} />);

        const ends = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.IMPRESSION_END,
        );

        expect(ends).toHaveLength(1);
        expect(ends[0][0].adId).toBe("ad-1");
    });

    it("records no impression for an ad served while the zone is off screen", async () => {
        const view = render(<AdZone zoneId={ZONE_ID} isVisible={false} />);

        await settle();

        expect(reportedTypes()).not.toContain(ReportedEventType.IMPRESSION);

        view.update(<AdZone zoneId={ZONE_ID} isVisible={true} />);
        await loadCreative();

        expect(reportedTypes()).toContain(ReportedEventType.IMPRESSION);
    });

    it("pauses while the app is backgrounded and resumes when it returns", async () => {
        serveAd(buildAd({ refresh_time: 30 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        await loadCreative();

        await act(async () => {
            notifyAppActiveChanged(false);

            await Promise.resolve();
        });

        await advance(60_000);

        expect(retrieveAdMock).toHaveBeenCalledTimes(1);
        expect(reportedTypes()).toContain(ReportedEventType.IMPRESSION_END);

        await act(async () => {
            notifyAppActiveChanged(true);

            await Promise.resolve();
        });
        await settle();

        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("closes out its impression when the SDK is torn down", async () => {
        serveAd(buildAd({ refresh_time: 30 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        await loadCreative();

        expect(reportedTypes()).toContain(ReportedEventType.IMPRESSION);

        // unmount() releases the request context, which makes every report a
        // no-op, so zones have to be closed out before that happens.
        await act(async () => {
            notifySdkTeardown();

            await Promise.resolve();
        });

        const types = reportedTypes();

        expect(types).toContain(ReportedEventType.IMPRESSION_END);
        expect(types).toContain(ReportedEventType.ZONE_UNMOUNTED);
    });

    it("reports one unmount even when teardown is followed by unmounting", async () => {
        const view = render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        await act(async () => {
            notifySdkTeardown();

            await Promise.resolve();
        });

        view.unmount();

        // Exactly one, however the zone goes away.
        expect(
            reportedTypes().filter(
                (type) => type === ReportedEventType.ZONE_UNMOUNTED,
            ),
        ).toHaveLength(1);
    });
});

describe("unfilled zones", () => {
    it("reports no_ad when the API serves an ad with no ID", async () => {
        serveAd(undefined, 45);

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        const unfilled = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.ZONE_UNFILLED,
        );

        expect(unfilled).toHaveLength(1);
        expect(unfilled[0][0].eventName).toBe(ZoneUnfilledReason.NO_AD);

        // A no-fill's refresh_time is the backoff before asking again.
        await advance(44_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        await advance(1_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("reports render_failed for an ad served with nothing to render", async () => {
        // Passes every other fill check: it has an id, and success is true.
        retrieveAdMock.mockResolvedValue({
            data: {
                success: true,
                data: {
                    ad: buildAd({ creative_url: "", refresh_time: 40 }),
                    port_height: 100,
                    port_width: 320,
                },
            },
        });

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        const unfilled = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.ZONE_UNFILLED,
        );

        expect(unfilled).toHaveLength(1);
        expect(unfilled[0][0].eventName).toBe(ZoneUnfilledReason.RENDER_FAILED);

        // No WebView is rendered for it, so neither load callback can ever fire:
        // the zone previously reported its mount and then nothing at all.
        expect(reportedTypes()).not.toContain(ReportedEventType.IMPRESSION);
        expect(screen.queryByTestId("ad-creative")).toBeNull();

        // The served refresh time still paces the retry.
        await advance(39_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        await advance(1_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("reports request_failed when the API rejects the request on a 200", async () => {
        // The rejection still carries a populated zone, which is what makes the
        // success flag the only thing distinguishing it from a fill. Reading the
        // status code, or the presence of data, is not enough.
        retrieveAdMock.mockResolvedValue({
            data: {
                success: false,
                message: "no campaigns",
                data: {
                    ad: buildAd({ id: "ad-rejected" }),
                    port_height: 100,
                    port_width: 320,
                },
            },
        } as any);

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        const unfilled = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.ZONE_UNFILLED,
        );

        expect(unfilled).toHaveLength(1);
        expect(unfilled[0][0].eventName).toBe(
            ZoneUnfilledReason.REQUEST_FAILED,
        );

        // A rejected response must not be billed as an impression, nor rendered.
        expect(reportedTypes()).not.toContain(ReportedEventType.IMPRESSION);
        expect(screen.queryByTestId("ad-creative")).toBeNull();
    });

    it("reports request_failed when the request itself fails", async () => {
        retrieveAdMock.mockRejectedValue(new Error("network down"));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        const unfilled = reportAdEvent.mock.calls.filter(
            ([event]) => event.eventType === ReportedEventType.ZONE_UNFILLED,
        );

        expect(unfilled).toHaveLength(1);
        expect(unfilled[0][0].eventName).toBe(
            ZoneUnfilledReason.REQUEST_FAILED,
        );
    });

    it("keeps retrying on a pace after a failure rather than going quiet", async () => {
        retrieveAdMock.mockRejectedValue(new Error("network down"));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        await advance(60_000);

        // A failed zone that loses its timer never recovers for the session.
        expect(retrieveAdMock.mock.calls.length).toBeGreaterThan(1);
    });

    it("sends no ad or impression ID on a zone level event", async () => {
        serveAd(undefined);

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        const zoneEvents = reportAdEvent.mock.calls.filter(([event]) =>
            [
                ReportedEventType.ZONE_MOUNTED,
                ReportedEventType.ZONE_UNFILLED,
            ].includes(event.eventType),
        );

        expect(zoneEvents.length).toBeGreaterThan(0);

        for (const [event] of zoneEvents) {
            expect(event.adId).toBe("");
            expect(event.impressionId).toBe("");
            expect(event.zoneId).toBe(ZONE_ID);
        }
    });
});

describe("clicks", () => {
    it("reports an interaction and opens the link for an external ad", async () => {
        serveAd(
            buildAd({
                action_type: AdActionType.EXTERNAL,
                action_path: "https://example.test/landing",
            }),
        );

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        await act(async () => {
            tapCreative();

            await Promise.resolve();
        });

        expect(reportedTypes()).toContain(ReportedEventType.INTERACTION);
        expect(Linking.openURL).toHaveBeenCalledWith(
            "https://example.test/landing",
        );
    });

    it("treats a drag as a scroll, not a click", async () => {
        render(
            <AdZone
                zoneId={ZONE_ID}
                isVisible={true}
                xyDragDistanceAllowed={25}
            />,
        );

        await settle();

        await act(async () => {
            tapCreative(40);

            await Promise.resolve();
        });

        // The old code reported an interaction on touch start, so every scroll
        // over an ad counted as a click.
        expect(reportedTypes()).not.toContain(ReportedEventType.INTERACTION);
        expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it("reports at most one interaction per ad, however many taps land", async () => {
        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        // Both taps inside one act, so the replacement ad has not arrived yet. The
        // zone keeps showing the tapped ad until it does, leaving the touch target
        // live, and every one of those taps is the same click on the same ad.
        act(() => {
            tapCreative();
            tapCreative();
        });

        expect(
            reportedTypes().filter(
                (type) => type === ReportedEventType.INTERACTION,
            ),
        ).toHaveLength(1);
    });

    it("defers an add to list ad's interaction until the items are acknowledged", async () => {
        const items = [
            {
                product_title: "Fairlife Milk",
                product_brand: "Fairlife",
                product_category: "",
                product_barcode: "",
                product_discount: "",
                product_image: "",
                product_sku: "",
            },
        ];
        const onAddToListTriggered = jest.fn();

        serveAd(
            buildAd({
                action_type: AdActionType.CONTENT,
                payload: { detailed_list_items: items },
            }),
        );

        render(
            <AdZone
                zoneId={ZONE_ID}
                isVisible={true}
                onAddToListTriggered={onAddToListTriggered}
            />,
        );

        await settle();

        await act(async () => {
            tapCreative();

            await Promise.resolve();
        });

        expect(onAddToListTriggered).toHaveBeenCalledWith(items);

        // Android reports atl_ad_clicked here and leaves the interaction to
        // AdContent.acknowledge, because the items have only been offered so far.
        expect(reportSdkEvent).toHaveBeenCalledWith(
            SdkEventName.ATL_AD_CLICKED,
            { id: "ad-1" },
        );
        expect(reportedTypes()).not.toContain(ReportedEventType.INTERACTION);

        // The ad is handed to the SDK so a later acknowledgement can be traced
        // back to it.
        expect(pendingAtlContent).toEqual(
            expect.objectContaining({
                adId: "ad-1",
                zoneId: ZONE_ID,
                impressionId: "impression-1",
                isHandled: false,
            }),
        );
    });
});

describe("add to list without a zone handler", () => {
    it("falls back to the callback the host gave initialize", async () => {
        const items = [
            {
                product_title: "Fairlife Milk",
                product_brand: "Fairlife",
                product_category: "",
                product_barcode: "",
                product_discount: "",
                product_image: "",
                product_sku: "",
            },
        ];

        serveAd(
            buildAd({
                action_type: AdActionType.CONTENT,
                payload: { detailed_list_items: items },
            }),
        );

        // No onAddToListTriggered prop. The callback was global before zones became
        // components, so a host with one handler must not have to repeat it.
        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        await act(async () => {
            tapCreative();

            await Promise.resolve();
        });

        expect(forwardAddToList).toHaveBeenCalledWith(items);
    });

    it("prefers the zone's own handler when it has one", async () => {
        const onAddToListTriggered = jest.fn();

        serveAd(
            buildAd({
                action_type: AdActionType.CONTENT,
                payload: {
                    detailed_list_items: [
                        {
                            product_title: "Fairlife Milk",
                            product_brand: "Fairlife",
                            product_category: "",
                            product_barcode: "",
                            product_discount: "",
                            product_image: "",
                            product_sku: "",
                        },
                    ],
                },
            }),
        );

        render(
            <AdZone
                zoneId={ZONE_ID}
                isVisible={true}
                onAddToListTriggered={onAddToListTriggered}
            />,
        );

        await settle();

        await act(async () => {
            tapCreative();

            await Promise.resolve();
        });

        expect(onAddToListTriggered).toHaveBeenCalled();
        expect(forwardAddToList).not.toHaveBeenCalled();
    });
});

describe("slow and overlapping requests", () => {
    it("does not bill an impression pair when the zone becomes visible mid-request", async () => {
        // The countdown must stay owned for as long as a refresh request is open.
        // If it does not, this visibility change sees a stopped timer and an ad
        // already past its refresh time, queues a refetch, and the arriving ad is
        // billed an impression and an impression_end in the same tick.
        //
        // Routine, not exotic: the demo drives isVisible from navigation focus, and
        // returning from the background does the same thing.
        serveAd(buildAd({ refresh_time: 15 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();
        await loadCreative();

        let release: (() => void) | undefined;

        retrieveAdMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = () =>
                        resolve({
                            data: {
                                success: true,
                                data: {
                                    ad: buildAd({
                                        id: "ad-next",
                                        impression_id: "impression-next",
                                        refresh_time: 15,
                                    }),
                                    port_height: 100,
                                    port_width: 320,
                                },
                            },
                        });
                }),
        );

        // The refresh fires, opening a request we hold open.
        await advance(15_000);
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);

        await act(async () => {
            notifyAppActiveChanged(true);

            await Promise.resolve();
        });

        await act(async () => {
            release!();

            await Promise.resolve();
        });
        await settle();
        await loadCreative();

        const nextImpressions = reportAdEvent.mock.calls.filter(
            ([event]) =>
                event.adId === "ad-next" &&
                event.eventType === ReportedEventType.IMPRESSION,
        );
        const nextEnds = reportAdEvent.mock.calls.filter(
            ([event]) =>
                event.adId === "ad-next" &&
                event.eventType === ReportedEventType.IMPRESSION_END,
        );

        expect(nextImpressions).toHaveLength(1);
        expect(nextEnds).toHaveLength(0);

        // And no third request provoked by the same false expiry.
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("picks up a context change that arrived during the first request", async () => {
        let release: (() => void) | undefined;

        retrieveAdMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = () =>
                        resolve({
                            data: {
                                success: true,
                                data: {
                                    ad: buildAd(),
                                    port_height: 100,
                                    port_width: 320,
                                },
                            },
                        });
                }),
        );

        const view = render(
            <AdZone zoneId={ZONE_ID} isVisible={true} contextId="recipe-1" />,
        );

        await settle();
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        // Changed while the very first request is still open, so there is no
        // loaded ad yet.
        view.update(
            <AdZone zoneId={ZONE_ID} isVisible={true} contextId="recipe-2" />,
        );

        await act(async () => {
            release!();

            await Promise.resolve();
        });
        await settle();

        // Deferred, not dropped: showing an ad chosen for the previous context
        // until the next refresh is the bug this guards.
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
        expect(retrieveAdMock.mock.calls[1][0].contextId).toBe("recipe-2");
    });
});

describe("touch sensitivity", () => {
    it("falls back to the value given to initialize", async () => {
        setAdRequestContext({
            ...buildContext(),
            xyDragDistanceAllowed: 100,
        });

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        // A 40px drag is a scroll under the default 25, but a click under the 100
        // this host configured at initialize().
        await act(async () => {
            tapCreative(40);

            await Promise.resolve();
        });

        expect(reportedTypes()).toContain(ReportedEventType.INTERACTION);
    });
});

describe("changing which zone the component serves", () => {
    it("treats a new zoneId as leaving one zone and arriving at another", async () => {
        retrieveAdMock.mockImplementation((request: never) =>
            Promise.resolve({
                data: {
                    success: true,
                    data: {
                        ad: buildAd({
                            id: `ad-${(request as { zoneId: string }).zoneId}`,
                            impression_id: `impression-${(request as { zoneId: string }).zoneId}`,
                        }),
                        port_height: 100,
                        port_width: 320,
                    },
                },
            } as never),
        );

        const view = render(<AdZone zoneId="zone-a" isVisible={true} />);

        await settle();
        await loadCreative();

        // A host reusing the component for another zone, an unkeyed list row for
        // instance. This was ignored outright: no events either way, and zone-b
        // was never requested.
        view.update(<AdZone zoneId="zone-b" isVisible={true} />);

        await settle();

        expect(
            retrieveAdMock.mock.calls.map(([request]) => request.zoneId),
        ).toEqual(["zone-a", "zone-b"]);

        const mountEvents = reportAdEvent.mock.calls
            .map(([event]) => event)
            .filter(
                (event) =>
                    event.eventType === ReportedEventType.ZONE_MOUNTED ||
                    event.eventType === ReportedEventType.ZONE_UNMOUNTED,
            );

        expect(
            mountEvents.map((event) => `${event.eventType}@${event.zoneId}`),
        ).toEqual([
            "zone_mounted@zone-a",
            // Attributed to the zone being left, not the one arriving.
            "zone_unmounted@zone-a",
            "zone_mounted@zone-b",
        ]);
    });

    it("stops showing the previous zone's ad while the new one is requested", async () => {
        serveAd(buildAd({ creative_url: "https://example.test/zone-a.html" }));

        const view = render(<AdZone zoneId="zone-a" isVisible={true} />);

        await settle();
        await loadCreative();

        expect(screen.getByTestId("ad-creative").props.source.uri).toBe(
            "https://example.test/zone-a.html",
        );

        // Held open so the gap between zones is observable.
        let release: (() => void) | undefined;

        retrieveAdMock.mockImplementation(
            () =>
                new Promise((resolve) => {
                    release = () =>
                        resolve({
                            data: {
                                success: true,
                                data: {
                                    ad: buildAd({
                                        creative_url:
                                            "https://example.test/zone-b.html",
                                    }),
                                    port_height: 100,
                                    port_width: 320,
                                },
                            },
                        });
                }),
        );

        view.update(<AdZone zoneId="zone-b" isVisible={true} />);

        await settle();

        // Showing zone-a's creative under zone-b would bill zone-b for it.
        expect(screen.queryByTestId("ad-creative")).toBeNull();

        await act(async () => {
            release!();

            await Promise.resolve();
        });
        await settle();

        expect(screen.getByTestId("ad-creative").props.source.uri).toBe(
            "https://example.test/zone-b.html",
        );
    });

    it("attributes later events to the zone now on screen, not the one it replaced", async () => {
        const view = render(<AdZone zoneId="zone-a" isVisible={true} />);

        await settle();
        await loadCreative();

        view.update(<AdZone zoneId="zone-b" isVisible={true} />);

        await settle();
        await loadCreative();

        // The app state and teardown subscriptions close over reportEvent, which
        // carries the zone id. Held from the first render, they reported this
        // zone's events against the zone it used to be.
        await act(async () => {
            notifyAppActiveChanged(false);

            await Promise.resolve();
        });

        const ends = reportAdEvent.mock.calls
            .map(([event]) => event)
            .filter(
                (event) => event.eventType === ReportedEventType.IMPRESSION_END,
            );

        expect(ends.map((event) => `${event.adId}@${event.zoneId}`)).toEqual([
            "ad-1@zone-a",
            "ad-1@zone-b",
        ]);

        await act(async () => {
            notifySdkTeardown();

            await Promise.resolve();
        });

        const unmounts = reportAdEvent.mock.calls
            .map(([event]) => event)
            .filter(
                (event) => event.eventType === ReportedEventType.ZONE_UNMOUNTED,
            );

        // One per zone: a second for the zone already left, and none for the one
        // on screen, was the shape of the bug.
        expect(unmounts.map((event) => event.zoneId)).toEqual([
            "zone-a",
            "zone-b",
        ]);
    });

    it("drops a response that belonged to the zone it has left", async () => {
        let release: (() => void) | undefined;
        const asked: string[] = [];

        retrieveAdMock.mockImplementation((request: never) => {
            const { zoneId } = request as { zoneId: string };

            asked.push(zoneId);

            return new Promise((resolve) => {
                release = () =>
                    resolve({
                        data: {
                            success: true,
                            data: {
                                ad: buildAd({
                                    id: `ad-for-${zoneId}`,
                                    impression_id: `impression-${zoneId}`,
                                    creative_url: `https://example.test/${zoneId}.html`,
                                }),
                                port_height: 100,
                                port_width: 320,
                            },
                        },
                    });
            });
        });

        const view = render(<AdZone zoneId="zone-a" isVisible={true} />);

        await settle();

        // Switched while zone-a's request is still open.
        view.update(<AdZone zoneId="zone-b" isVisible={true} />);

        await settle();

        // zone-a's answer arrives after the switch.
        await act(async () => {
            release!();

            await Promise.resolve();
        });
        await settle();

        // Showing it would put zone-a's creative under zone-b, and the impression
        // that followed would carry zone-a's ad with zone-b's id.
        expect(screen.queryByTestId("ad-creative")).toBeNull();
        expect(reportedTypes()).not.toContain(ReportedEventType.IMPRESSION);

        // zone-b still gets its own request rather than being stranded.
        expect(asked).toEqual(["zone-a", "zone-b"]);
    });

    it("reports one impression per zone across a switch", async () => {
        const view = render(<AdZone zoneId="zone-a" isVisible={true} />);

        await settle();
        await loadCreative();

        view.update(<AdZone zoneId="zone-b" isVisible={true} />);

        await settle();
        await loadCreative();

        const impressions = reportAdEvent.mock.calls
            .map(([event]) => event)
            .filter(
                (event) => event.eventType === ReportedEventType.IMPRESSION,
            );

        expect(impressions.map((event) => event.zoneId)).toEqual([
            "zone-a",
            "zone-b",
        ]);
    });
});

describe("recipe context changes", () => {
    it("requests a new ad when the zone's context changes", async () => {
        const view = render(
            <AdZone zoneId={ZONE_ID} isVisible={true} contextId="recipe-1" />,
        );

        await settle();
        expect(retrieveAdMock).toHaveBeenCalledTimes(1);

        view.update(
            <AdZone zoneId={ZONE_ID} isVisible={true} contextId="recipe-2" />,
        );
        await settle();

        // The ad on screen was chosen for the old context, so it is no longer the
        // right one to be showing.
        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
        expect(retrieveAdMock.mock.calls[1][0].contextId).toBe("recipe-2");
    });

    it("does not refetch when the context is unchanged", async () => {
        const view = render(
            <AdZone zoneId={ZONE_ID} isVisible={true} contextId="recipe-1" />,
        );

        await settle();

        view.update(
            <AdZone zoneId={ZONE_ID} isVisible={true} contextId="recipe-1" />,
        );
        await settle();

        expect(retrieveAdMock).toHaveBeenCalledTimes(1);
    });
});
