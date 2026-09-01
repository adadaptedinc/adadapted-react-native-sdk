/**
 * Tests for the session lifecycle.
 *
 * Sessions are now minted in JS and never persisted, which is the Android SDK's
 * model rather than the web SDK's. The distinction these tests protect is that a
 * relaunch always starts a new session, while a foreground within the session
 * window resumes the existing one.
 * @module
 */
import { AppState, AppStateStatus, Linking } from "react-native";
import axios from "axios";
import base64 from "react-native-base64";
import { AdadaptedReactNativeSdk } from "../index";
import { EnvironmentTypes } from "../componentTypes/Environment";
import { ListManagerEventSource, SdkEventName } from "../api/adadaptedApiTypes";
import {
    getAdRequestContext,
    subscribeToAppActive,
    subscribeToSdkTeardown,
} from "../adRequestContext";

jest.mock("axios");

const mockedAxios = axios as unknown as jest.Mock;

const APP_ID = "TEST_APP_ID";
const THIRTY_MINUTES_MS = 30 * 60 * 1000;

/**
 * The AppState handler the SDK registered during initialize().
 */
let appStateHandler: ((state: AppStateStatus) => void) | undefined;

/**
 * Initializes an SDK instance with the network and platform calls stubbed.
 * @returns the initialized SDK.
 */
async function initializeSdk(): Promise<AdadaptedReactNativeSdk> {
    const sdk = new AdadaptedReactNativeSdk();

    await sdk.initialize({
        appId: APP_ID,
        apiEnv: EnvironmentTypes.ApiEnv.Dev,
    });

    return sdk;
}

/**
 * Collects every list manager event reported so far.
 * @returns the reported events, paired with the request body that carried them.
 */
function reportedSdkEvents(): { name: string; source: string; body: any }[] {
    return (
        mockedAxios.mock.calls
            // The list manager route specifically. A bare "/events" also matches the
            // v1.0.0 ad events route, so a test that mounted a zone would silently
            // start counting impressions as session events.
            .filter(([url]) => String(url).includes("/v/1/"))
            .flatMap(([, config]) =>
                (config.data.events ?? []).map((event: any) => ({
                    name: event.event_name,
                    source: event.event_source,
                    body: config.data,
                })),
            )
    );
}

/**
 * Reads the session IDs the reported events were attributed to.
 * @returns one session ID per reported event.
 */
function reportedSessionIds(): string[] {
    return reportedSdkEvents().map((event) => event.body.session_id);
}

beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T12:00:00Z"));

    mockedAxios.mockReset();
    mockedAxios.mockResolvedValue({ data: { success: true, data: {} } });

    appStateHandler = undefined;

    jest.spyOn(AppState, "addEventListener").mockImplementation(
        (type, handler) => {
            if (type === "change") {
                appStateHandler = handler;
            }

            return { remove: jest.fn() };
        },
    );

    jest.spyOn(Linking, "getInitialURL").mockResolvedValue(null);
    jest.spyOn(Linking, "addEventListener").mockReturnValue({
        remove: jest.fn(),
    });
});

afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
});

describe("session creation", () => {
    it("mints a session on initialize without asking the server for one", async () => {
        const sdk = await initializeSdk();

        expect(sdk.getSessionId()).toBeTruthy();

        // The 0.9.5 sessions/initialize route is gone. If anything still calls a
        // session endpoint, the client-side session is not actually in charge.
        for (const [url] of mockedAxios.mock.calls) {
            expect(String(url)).not.toContain("sessions/initialize");
            expect(String(url)).not.toContain("/session");
        }
    });

    it("prefixes the session with RN so reporting can tell the platform apart", async () => {
        const sdk = await initializeSdk();

        // The server resolves the platform from this prefix alone, because the
        // v1.0.0 routes dropped the {os} path segment.
        expect(sdk.getSessionId()).toMatch(/^RN[A-Z0-9]{32}$/);
    });

    it("reports SESSION_CREATED as an SDK event carrying the new session", async () => {
        const sdk = await initializeSdk();

        const created = reportedSdkEvents().filter(
            (event) => event.name === SdkEventName.SESSION_CREATED,
        );

        expect(created).toHaveLength(1);

        // "sdk", not "app": this describes the SDK's own lifecycle. Android's
        // SessionClient reports session events with SDK_EVENT_TYPE.
        expect(created[0].source).toBe(ListManagerEventSource.SDK);
        expect(created[0].body.session_id).toBe(sdk.getSessionId());
    });

    it("carries locale and retargeting consent, which the deleted session request used to send", async () => {
        await initializeSdk();

        const [event] = reportedSdkEvents();

        expect(event.body.locale).toBe("en-US");
        expect(event.body.allow_retargeting).toBe(1);
        expect(event.body.bundle_id).toBe("com.test.app");
        expect(event.body.bundle_version).toBe("1.0");
    });

    it("gives two runtimes different sessions, since nothing is persisted", async () => {
        const first = await initializeSdk();
        const firstId = first.getSessionId();

        // A second instance stands in for a relaunch: no storage is consulted, so
        // it cannot inherit the previous session.
        const second = await initializeSdk();

        expect(second.getSessionId()).not.toBe(firstId);
    });
});

describe("backgrounding and foregrounding", () => {
    it("reports SESSION_BACKGROUNDED when the app goes to the background", async () => {
        await initializeSdk();

        appStateHandler!("background");

        expect(reportedSdkEvents().map((event) => event.name)).toContain(
            SdkEventName.SESSION_BACKGROUNDED,
        );
    });

    it("resumes the same session when the app returns within the session window", async () => {
        const sdk = await initializeSdk();
        const originalId = sdk.getSessionId();

        appStateHandler!("background");

        jest.setSystemTime(Date.now() + THIRTY_MINUTES_MS - 1000);

        appStateHandler!("active");

        const names = reportedSdkEvents().map((event) => event.name);

        expect(names).toContain(SdkEventName.SESSION_RESUMED);

        // Exactly one, from initialize. A resume must not also mint a session.
        expect(
            names.filter((name) => name === SdkEventName.SESSION_CREATED),
        ).toHaveLength(1);
        expect(sdk.getSessionId()).toBe(originalId);
    });

    it("starts a new session when the app returns after the session window", async () => {
        const sdk = await initializeSdk();
        const originalId = sdk.getSessionId();

        appStateHandler!("background");

        jest.setSystemTime(Date.now() + THIRTY_MINUTES_MS);

        appStateHandler!("active");

        expect(sdk.getSessionId()).not.toBe(originalId);

        const created = reportedSdkEvents().filter(
            (event) => event.name === SdkEventName.SESSION_CREATED,
        );

        // One from initialize, one from the expired return.
        expect(created).toHaveLength(2);
        expect(created[1].body.session_id).toBe(sdk.getSessionId());
    });

    it("attributes events after a rotation to the new session, not the old one", async () => {
        const sdk = await initializeSdk();
        const originalId = sdk.getSessionId();

        appStateHandler!("background");
        jest.setSystemTime(Date.now() + THIRTY_MINUTES_MS);
        appStateHandler!("active");

        // Guards against a stale session ID being captured once and reused, which
        // would silently attribute a new session's activity to a session that had
        // already ended.
        expect(reportedSessionIds().at(-1)).toBe(sdk.getSessionId());
        expect(reportedSessionIds().at(-1)).not.toBe(originalId);
    });

    it("ignores the transient inactive state", async () => {
        const sdk = await initializeSdk();
        const originalId = sdk.getSessionId();
        const eventsBefore = reportedSdkEvents().length;

        // iOS raises this for the app switcher, control centre and incoming calls.
        // Android has no analogue, so reporting on it would invent churn.
        appStateHandler!("inactive");

        expect(reportedSdkEvents()).toHaveLength(eventsBefore);
        expect(sdk.getSessionId()).toBe(originalId);
    });

    it("does not report twice for the first foreground after initialize", async () => {
        await initializeSdk();

        // Both iOS and Android deliver an "active" shortly after startup, and
        // initialize() has already reported the session. Android guards this with
        // isFirstStart.
        appStateHandler!("active");

        expect(reportedSdkEvents()).toHaveLength(1);
    });
});

describe("ordering against the ad zones", () => {
    it("resolves the session before telling the zones the app is active", async () => {
        const sdk = await initializeSdk();
        const originalId = sdk.getSessionId();
        const sessionsSeenByZones: (string | undefined)[] = [];

        const unsubscribe = subscribeToAppActive((isActive) => {
            if (isActive) {
                sessionsSeenByZones.push(sdk.getSessionId());
            }
        });

        appStateHandler!("background");

        jest.setSystemTime(Date.now() + THIRTY_MINUTES_MS);

        appStateHandler!("active");

        unsubscribe();

        // A zone told before the session rotated would refetch under the session
        // that just ended, splitting the retrieve and its impression across two
        // sessions. The zone must never observe the outgoing session here.
        expect(sessionsSeenByZones).toEqual([sdk.getSessionId()]);
        expect(sessionsSeenByZones).not.toContain(originalId);
    });

    it("tells the zones the app is backgrounded before reporting the session", async () => {
        await initializeSdk();

        const order: string[] = [];

        const unsubscribe = subscribeToAppActive((isActive) => {
            if (!isActive) {
                order.push("zones-notified");
            }
        });

        mockedAxios.mockImplementation(() => {
            order.push("session-reported");

            return Promise.resolve({ data: { success: true, data: {} } });
        });

        appStateHandler!("background");

        unsubscribe();

        // Each zone closes its impression while the session it belongs to is
        // still the current one.
        expect(order).toEqual(["zones-notified", "session-reported"]);
    });

    it("does not disturb the zones for a transient inactive state", async () => {
        await initializeSdk();

        const notified: boolean[] = [];
        const unsubscribe = subscribeToAppActive((isActive) => {
            notified.push(isActive);
        });

        // The real iOS sequence for a glance at the app switcher, a notification
        // banner or an incoming call: inactive, then active again, with no
        // background in between. Firing only the inactive half missed that the
        // active half was still reaching the zones.
        appStateHandler!("inactive");
        appStateHandler!("active");

        unsubscribe();

        // Zones are paused on background and nowhere else, so there is nothing to
        // wake here. Telling them anyway made a zone with a refresh request open
        // treat its ad as expired and bill an impression pair for the replacement.
        expect(notified).toEqual([]);
    });

    it("only fetches payloads on a real return from the background", async () => {
        await initializeSdk();

        const pickupsAfterInit = mockedAxios.mock.calls.filter(([url]) =>
            String(url).includes("/pickup"),
        ).length;

        appStateHandler!("inactive");
        appStateHandler!("active");

        const pickupsNow = mockedAxios.mock.calls.filter(([url]) =>
            String(url).includes("/pickup"),
        ).length;

        // Undelivered payloads are re-served until acknowledged, so a pickup per
        // iOS glance re-fires onOutOfAppPayloadAvailable with the same items.
        expect(pickupsNow).toBe(pickupsAfterInit);
    });
});

describe("device data on reported events", () => {
    it("carries everything the native SDKs send on this route", async () => {
        await initializeSdk();

        const [event] = reportedSdkEvents();

        // These all rode on the deleted session initialize request. The bridge has
        // always gathered them; dropping them silently degrades every report.
        expect(event.body.device).toBe("test-device");
        expect(event.body.os).toBe("ios_react_native");
        expect(event.body.osv).toBe("17.0");
        expect(event.body.timezone).toBe("America/Detroit");
        expect(event.body.carrier).toBe("test-carrier");
        expect(event.body.density).toBe("3.0");

        // Strings over the bridge, numbers on the wire.
        expect(event.body.dw).toBe(1170);
        expect(event.body.dh).toBe(2532);
    });
});

describe("initializing more than once", () => {
    it("replaces its listeners instead of stacking them", async () => {
        const removes: jest.Mock[] = [];
        let registered = 0;

        jest.spyOn(AppState, "addEventListener").mockImplementation(
            (type, handler) => {
                const remove = jest.fn();

                if (type === "change") {
                    registered += 1;
                    appStateHandler = handler;
                    removes.push(remove);
                }

                return { remove };
            },
        );

        const sdk = new AdadaptedReactNativeSdk();

        await sdk.initialize({
            appId: APP_ID,
            apiEnv: EnvironmentTypes.ApiEnv.Dev,
        });
        await sdk.initialize({
            appId: APP_ID,
            apiEnv: EnvironmentTypes.ApiEnv.Dev,
        });

        expect(registered).toBe(2);

        // The first subscription must have been removed. Leaving it attached made
        // every background report SESSION_BACKGROUNDED once per leaked listener,
        // which StrictMode and Fast Refresh both trigger.
        expect(removes[0]).toHaveBeenCalled();

        mockedAxios.mockClear();

        appStateHandler!("background");

        const backgrounded = reportedSdkEvents().filter(
            (event) => event.name === SdkEventName.SESSION_BACKGROUNDED,
        );

        expect(backgrounded).toHaveLength(1);
    });
});

describe("api environments", () => {
    /**
     * Collects the distinct hosts every request went to.
     * @returns one entry per host.
     */
    function hostsCalled(): string[] {
        return [
            ...new Set(
                mockedAxios.mock.calls.map(
                    ([url]) => new URL(String(url)).host,
                ),
            ),
        ].sort();
    }

    it("points every backend at the sandbox when asked for dev", async () => {
        const sdk = new AdadaptedReactNativeSdk();

        await sdk.initialize({
            appId: APP_ID,
            apiEnv: EnvironmentTypes.ApiEnv.Dev,
        });

        sdk.markPayloadContentAcknowledged("payload-1");
        sdk.reportItemsAddedToList(["Milk"], "My list");

        // The payload host was the one that got missed: it was left at whatever the
        // constructor set, so a sandbox integration wrote its payload delivery and
        // rejection tracking to production.
        expect(hostsCalled()).toEqual([
            "sandbox.adadapted.com",
            "sandec.adadapted.com",
            "sandpayload.adadapted.com",
        ]);

        for (const [url] of mockedAxios.mock.calls) {
            expect(String(url)).not.toContain("://payload.adadapted.com");
            expect(String(url)).not.toContain("://ec.adadapted.com");
            expect(String(url)).not.toContain("://ads.adadapted.com");
        }
    });

    it("points every backend at production by default", async () => {
        const sdk = new AdadaptedReactNativeSdk();

        await sdk.initialize({ appId: APP_ID });

        sdk.markPayloadContentAcknowledged("payload-1");
        sdk.reportItemsAddedToList(["Milk"], "My list");

        expect(hostsCalled()).toEqual([
            "ads.adadapted.com",
            "ec.adadapted.com",
            "payload.adadapted.com",
        ]);
    });

    it("reaches no network at all in the mock environment", async () => {
        const sdk = new AdadaptedReactNativeSdk();

        await sdk.initialize({
            appId: APP_ID,
            apiEnv: EnvironmentTypes.ApiEnv.Mock,
        });

        sdk.markPayloadContentAcknowledged("payload-1");
        sdk.reportItemsAddedToList(["Milk"], "My list");

        // The list manager previously mapped anything that was not production to
        // the sandbox, so the environment that exists to serve local fixtures sent
        // real requests to a real host.
        expect(mockedAxios).not.toHaveBeenCalled();
    });
});

describe("out of app payload deep links", () => {
    it("decodes the payload and hands its items to the host", async () => {
        const payload = {
            payload_id: "payload-1",
            detailed_list_items: [
                {
                    product_title: "Fairlife Milk",
                    product_brand: "Fairlife",
                    product_category: "dairy",
                    product_barcode: "123",
                    product_discount: "",
                    product_image: "https://example.test/milk.png",
                    product_sku: "sku-1",
                },
            ],
        };
        // The same module the SDK decodes with, so the round trip is symmetric.
        const encoded = base64.encode(JSON.stringify(payload));

        let deepLinkHandler: ((event: { url: string }) => void) | undefined;

        jest.spyOn(Linking, "addEventListener").mockImplementation(
            (type, handler) => {
                if (type === "url") {
                    deepLinkHandler = handler;
                }

                return { remove: jest.fn() };
            },
        );

        const received: unknown[] = [];
        const sdk = new AdadaptedReactNativeSdk();

        await sdk.initialize({
            appId: APP_ID,
            apiEnv: EnvironmentTypes.ApiEnv.Dev,
            onOutOfAppPayloadAvailable: (items) => {
                received.push(...items);
            },
        });

        // The index into the URL is what was broken: it was concatenated with the
        // search string's length rather than added, so the slice started far past
        // the end and the decode threw for every real link.
        deepLinkHandler!({
            url: `myapp://addtolist?somethingelse=1&data=${encoded}`,
        });

        expect(received).toHaveLength(1);
        expect(received[0]).toEqual({
            payload_id: "payload-1",
            detailed_list_items: [payload.detailed_list_items[0]],
        });
    });

    it("decodes a payload followed by another query parameter", async () => {
        const payload = {
            payload_id: "payload-2",
            detailed_list_items: [
                {
                    product_title: "Bread",
                    product_brand: "",
                    product_category: "",
                    product_barcode: "",
                    product_discount: "",
                    product_image: "",
                    product_sku: "",
                },
            ],
        };
        const encoded = base64.encode(JSON.stringify(payload));

        let deepLinkHandler: ((event: { url: string }) => void) | undefined;

        jest.spyOn(Linking, "addEventListener").mockImplementation(
            (type, handler) => {
                if (type === "url") {
                    deepLinkHandler = handler;
                }

                return { remove: jest.fn() };
            },
        );

        const received: unknown[] = [];
        const sdk = new AdadaptedReactNativeSdk();

        await sdk.initialize({
            appId: APP_ID,
            apiEnv: EnvironmentTypes.ApiEnv.Dev,
            onOutOfAppPayloadAvailable: (items) => {
                received.push(...items);
            },
        });

        // Slicing to the end of the url swept "&source=email" into the base64, so
        // the decode produced garbage and the payload was dropped — silently, once
        // the decode was guarded.
        deepLinkHandler!({
            url: `myapp://addtolist?data=${encoded}&source=email`,
        });

        expect(received).toHaveLength(1);
        expect(received[0]).toEqual({
            payload_id: "payload-2",
            detailed_list_items: [payload.detailed_list_items[0]],
        });
    });

    it("ignores a malformed link instead of throwing into the host", async () => {
        let deepLinkHandler: ((event: { url: string }) => void) | undefined;

        jest.spyOn(Linking, "addEventListener").mockImplementation(
            (type, handler) => {
                if (type === "url") {
                    deepLinkHandler = handler;
                }

                return { remove: jest.fn() };
            },
        );

        const sdk = new AdadaptedReactNativeSdk();

        await sdk.initialize({
            appId: APP_ID,
            apiEnv: EnvironmentTypes.ApiEnv.Dev,
        });

        // Runs inside the Linking handler, which is not guarded by the caller.
        expect(() =>
            deepLinkHandler!({ url: "myapp://addtolist?data=not-base64-json" }),
        ).not.toThrow();
    });
});

describe("keyword intercept reporting", () => {
    it("authenticates intercept events with the app ID, not the device OS", async () => {
        // Terms have to be in place before initialize(), which is what loads them.
        mockedAxios.mockResolvedValue({
            data: {
                success: true,
                data: {
                    search_id: "search-1",
                    terms: [
                        {
                            term_id: "term-1",
                            term: "milk",
                            replacement: "Fairlife Milk",
                            priority: 1,
                        },
                    ],
                },
            },
        });

        const sdk = await initializeSdk();

        mockedAxios.mockClear();

        sdk.performKeywordSearch("milk");
        sdk.reportKeywordInterceptTermsPresented(["term-1"]);
        sdk.reportKeywordInterceptTermSelected("term-1");

        const interceptCalls = mockedAxios.mock.calls.filter(([url]) =>
            String(url).includes("/v/1.0.0/intercept/events"),
        );

        expect(interceptCalls.length).toBeGreaterThan(0);

        // The parameter changed from a path segment to the API key header when this
        // route moved to v1.0.0, and DeviceOS is a string enum so passing it here
        // type-checks: every intercept event went out as x-api-key: "ios" and was
        // rejected, silently losing the whole channel.
        for (const [, config] of interceptCalls) {
            const headers = (config as { headers: Record<string, string> })
                .headers;

            expect(headers["x-api-key"]).toBe(APP_ID);
            expect(headers["x-api-key"]).not.toBe("ios");
            expect(headers["x-api-key"]).not.toBe("android");
        }
    });
});

describe("add to list acknowledgement", () => {
    /**
     * Builds a pending ATL item.
     * @param title - The product title.
     * @returns the item.
     */
    function item(title: string) {
        return {
            product_title: title,
            product_brand: "",
            product_category: "",
            product_barcode: "",
            product_discount: "",
            product_image: "",
            product_sku: "",
        };
    }

    it("keeps each zone's pending ad separate", async () => {
        const sdk = await initializeSdk();
        const context = getAdRequestContext()!;

        // Two zones on screen, each with an add to list ad clicked.
        context.setPendingAtlContent({
            adId: "ad-a",
            zoneId: "zone-a",
            impressionId: "imp-a",
            items: [item("Milk")],
            isHandled: false,
        });
        context.setPendingAtlContent({
            adId: "ad-b",
            zoneId: "zone-b",
            impressionId: "imp-b",
            items: [item("Bread")],
            isHandled: false,
        });

        mockedAxios.mockClear();

        // A single slot meant zone B's click discarded zone A's pending content,
        // losing A's interaction for good.
        sdk.acknowledge("Milk");

        const interactions = mockedAxios.mock.calls
            .filter(([url]) => String(url).includes("/v/1.0.0/ad/events"))
            .flatMap(
                ([, config]) =>
                    (
                        config as never as {
                            data: {
                                events: { ad_id: string; event_type: string }[];
                            };
                        }
                    ).data.events,
            )
            .filter((event) => event.event_type === "interaction");

        expect(interactions).toHaveLength(1);
        expect(interactions[0].ad_id).toBe("ad-a");
    });

    it("attributes to the most recent click when a zone clicks twice", async () => {
        const sdk = await initializeSdk();
        const context = getAdRequestContext()!;

        // All three offer the same title, which one advertiser running a campaign
        // across zones would produce.
        context.setPendingAtlContent({
            adId: "ad-a1",
            zoneId: "zone-a",
            impressionId: "imp-a1",
            items: [item("Milk")],
            isHandled: false,
        });
        context.setPendingAtlContent({
            adId: "ad-b1",
            zoneId: "zone-b",
            impressionId: "imp-b1",
            items: [item("Milk")],
            isHandled: false,
        });
        // zone-a again, so its key already exists. Map.set does not move an
        // existing key to the end, so a newest-first scan by insertion order alone
        // would pick zone-b's older ad.
        context.setPendingAtlContent({
            adId: "ad-a2",
            zoneId: "zone-a",
            impressionId: "imp-a2",
            items: [item("Milk")],
            isHandled: false,
        });

        mockedAxios.mockClear();

        sdk.acknowledge("Milk");

        const interactions = mockedAxios.mock.calls
            .filter(([url]) => String(url).includes("/v/1.0.0/ad/events"))
            .flatMap(
                ([, config]) =>
                    (
                        config as never as {
                            data: {
                                events: { ad_id: string; event_type: string }[];
                            };
                        }
                    ).data.events,
            )
            .filter((event) => event.event_type === "interaction");

        expect(interactions).toHaveLength(1);
        expect(interactions[0].ad_id).toBe("ad-a2");
    });

    it("reports one interaction per ad however many items are acknowledged", async () => {
        const sdk = await initializeSdk();
        const context = getAdRequestContext()!;

        context.setPendingAtlContent({
            adId: "ad-a",
            zoneId: "zone-a",
            impressionId: "imp-a",
            items: [item("Milk"), item("Bread")],
            isHandled: false,
        });

        mockedAxios.mockClear();

        sdk.acknowledge("Milk");
        sdk.acknowledge("Bread");

        const interactions = mockedAxios.mock.calls
            .filter(([url]) => String(url).includes("/v/1.0.0/ad/events"))
            .flatMap(
                ([, config]) =>
                    (
                        config as never as {
                            data: { events: { event_type: string }[] };
                        }
                    ).data.events,
            )
            .filter((event) => event.event_type === "interaction");

        // AdContent.isHandled on Android guards the same way.
        expect(interactions).toHaveLength(1);
    });
});

describe("teardown", () => {
    it("closes the zones out while there is still a context to report through", async () => {
        const sdk = await initializeSdk();

        let contextWhenToldToClose: unknown;

        const unsubscribe = subscribeToSdkTeardown(() => {
            contextWhenToldToClose = getAdRequestContext();
        });

        sdk.unmount();

        unsubscribe();

        // Releasing the context first turns every reportAdEvent into a no-op, so
        // the impression_end and zone_unmounted of every mounted zone vanish. The
        // order of these two steps is the whole fix.
        expect(contextWhenToldToClose).toBeDefined();
        expect(getAdRequestContext()).toBeUndefined();
    });

    it("stops reporting under a session it has declared finished", async () => {
        const consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => undefined);
        const sdk = await initializeSdk();

        sdk.unmount();
        mockedAxios.mockClear();

        // Every public reporter that builds a payload from the session or the
        // device info. Listed out rather than sampled, because guarding only some
        // of them is exactly how this was got wrong once already: the payload pair
        // were missed, and since the udid is read while building the argument
        // object, the TypeError is thrown synchronously out of the method - before
        // any promise exists, so the .catch() inside never sees it and it lands in
        // the host's call stack.
        expect(() => {
            sdk.reportItemsAddedToList(["Milk"], "My List");
            sdk.reportItemsCrossedOffList(["Milk"], "My List");
            sdk.reportItemsDeletedFromList(["Milk"], "My List");
            sdk.markPayloadContentAcknowledged("payload-1");
            sdk.markPayloadContentRejected("payload-1");
        }).not.toThrow();

        await Promise.resolve();

        expect(sdk.getSessionId()).toBeUndefined();
        expect(mockedAxios).not.toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
    });

    it("refetches the keyword intercepts when the session is replaced", async () => {
        mockedAxios.mockResolvedValue({
            data: {
                success: true,
                data: {
                    search_id: "search-1",
                    terms: [
                        {
                            term_id: "term-1",
                            term: "milk",
                            replacement: "Fairlife Milk",
                            priority: 1,
                        },
                    ],
                },
            },
        });

        const sdk = await initializeSdk();
        const originalId = sdk.getSessionId();

        mockedAxios.mockClear();

        appStateHandler!("background");

        jest.setSystemTime(Date.now() + THIRTY_MINUTES_MS + 1000);

        appStateHandler!("active");

        await Promise.resolve();
        await Promise.resolve();

        // search_id is minted with the intercepts and rides on every intercept
        // event. Fetched only at initialize(), a replaced session went on
        // reporting the search_id of the session that had just ended.
        expect(sdk.getSessionId()).not.toBe(originalId);
        expect(
            mockedAxios.mock.calls.filter(([url]) =>
                String(url).includes("intercept/retrieve"),
            ).length,
        ).toBeGreaterThan(0);
    });

    it("keeps the intercepts it already has when the session is only resumed", async () => {
        mockedAxios.mockResolvedValue({
            data: {
                success: true,
                data: { search_id: "search-1", terms: [] },
            },
        });

        const sdk = await initializeSdk();
        const originalId = sdk.getSessionId();

        mockedAxios.mockClear();

        appStateHandler!("background");

        jest.setSystemTime(Date.now() + THIRTY_MINUTES_MS - 1000);

        appStateHandler!("active");

        await Promise.resolve();
        await Promise.resolve();

        // The session survived, so its intercepts and their search_id are still
        // the right ones. Refetching here would spend a request and mint a new
        // search_id for a session that never ended.
        expect(sdk.getSessionId()).toBe(originalId);
        expect(
            mockedAxios.mock.calls.filter(([url]) =>
                String(url).includes("intercept/retrieve"),
            ),
        ).toHaveLength(0);
    });

    it("stops listening to app state changes on unmount", async () => {
        const remove = jest.fn();

        jest.spyOn(AppState, "addEventListener").mockReturnValue({
            remove,
        });

        const sdk = await initializeSdk();

        sdk.unmount();

        expect(remove).toHaveBeenCalled();
    });
});
