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
import { AppState, Linking } from "react-native";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AdZone } from "../components/AdZone";
import * as adadaptedApiRequests from "../api/adadaptedApiRequests";
import {
    AdEventReport,
    AdRequestContext,
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
jest.mock("react-native-webview", () => {
    const reactNative = jest.requireActual("react-native");
    const react = jest.requireActual("react");

    return {
        WebView: (props: any) =>
            react.createElement(reactNative.View, {
                ...props,
                testID: "ad-creative",
            }),
    };
});

const ZONE_ID = "102110";
const SESSION_ID = "RNABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

let reportAdEvent: jest.Mock<void, [AdEventReport]>;
let reportSdkEvent: jest.Mock;
let forwardAddToList: jest.Mock;
let pendingAtlContent: PendingAtlContent | undefined;
let retrieveAdMock: jest.SpyInstance;
let appStateHandler: ((status: string) => void) | undefined;

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

    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T12:00:00Z"));

    reportAdEvent = jest.fn();
    reportSdkEvent = jest.fn();
    forwardAddToList = jest.fn();
    pendingAtlContent = undefined;

    setAdRequestContext(buildContext());

    retrieveAdMock = jest.spyOn(adadaptedApiRequests, "retrieveAd");
    serveAd(buildAd());

    appStateHandler = undefined;

    jest.spyOn(AppState, "addEventListener").mockImplementation(
        (type, handler) => {
            if (type === "change") {
                appStateHandler = handler as (status: string) => void;
            }

            return { remove: jest.fn() };
        },
    );

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

        expect(reportedTypes()).toContain(ReportedEventType.ZONE_MOUNTED);

        view.unmount();

        expect(reportedTypes()).toContain(ReportedEventType.ZONE_UNMOUNTED);
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

        serveAd(
            buildAd({
                id: "ad-2",
                impression_id: "impression-2",
                refresh_time: 30,
            }),
        );

        await advance(30_000);

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

        expect(reportedTypes()).toContain(ReportedEventType.IMPRESSION);
    });

    it("pauses while the app is backgrounded and resumes when it returns", async () => {
        serveAd(buildAd({ refresh_time: 30 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        await act(async () => {
            appStateHandler!("background");

            await Promise.resolve();
        });

        await advance(60_000);

        expect(retrieveAdMock).toHaveBeenCalledTimes(1);
        expect(reportedTypes()).toContain(ReportedEventType.IMPRESSION_END);

        await act(async () => {
            appStateHandler!("active");

            await Promise.resolve();
        });
        await settle();

        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
    });

    it("ignores the transient inactive state", async () => {
        serveAd(buildAd({ refresh_time: 30 }));

        render(<AdZone zoneId={ZONE_ID} isVisible={true} />);

        await settle();

        await act(async () => {
            appStateHandler!("inactive");

            await Promise.resolve();
        });

        // The countdown must keep running, or an iOS app switcher glance would
        // freeze the zone.
        await advance(30_000);

        expect(retrieveAdMock).toHaveBeenCalledTimes(2);
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
