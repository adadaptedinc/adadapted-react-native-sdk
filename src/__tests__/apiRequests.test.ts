/**
 * Tests for the API request layer.
 *
 * These pin the wire contract: the exact URL each call goes to, that the v1.0.0
 * routes authenticate with an x-api-key header rather than an app ID in the body,
 * and that the v1 routes still carry the {os} path segment the v1.0.0 routes
 * dropped. A silent change to any of those stops ads being served, so each is
 * asserted literally rather than through a helper that could drift with the code.
 * @module
 */
import axios from "axios";
import * as adadaptedApiRequests from "../api/adadaptedApiRequests";
import { EnvironmentTypes } from "../componentTypes/Environment";
import { DeviceTypes } from "../componentTypes/Device";
import {
    ListManagerEventName,
    ListManagerEventSource,
    PayloadStatus,
    ReportedEventType,
} from "../api/adadaptedApiTypes";

jest.mock("axios");

const mockedAxios = axios as unknown as jest.Mock;

const APP_ID = "TEST_APP_ID";
const SESSION_ID = "RNABCDEFGHIJKLMNOPQRSTUVWXYZ012345";

/**
 * Reads the URL and config the single axios call was made with.
 * @returns the url and the request config.
 */
function lastCall(): { url: string; config: any } {
    expect(mockedAxios).toHaveBeenCalledTimes(1);

    const [url, config] = mockedAxios.mock.calls[0];

    return { url, config };
}

beforeEach(() => {
    mockedAxios.mockReset();
    mockedAxios.mockResolvedValue({ data: {} });
});

describe("v1.0.0 ad routes", () => {
    it("requests a single ad for one zone from the v1.0.0 retrieve route", async () => {
        await adadaptedApiRequests.retrieveAd(
            {
                sdkId: "1.2.3",
                bundleId: "com.test.app",
                userId: "test-udid",
                zoneId: "102110",
                storeId: "store-1",
                contextId: "context-1",
                sessionId: SESSION_ID,
                extra: "",
            },
            APP_ID,
            EnvironmentTypes.ApiEnv.Dev,
        );

        const { url, config } = lastCall();

        expect(url).toBe("https://sandbox.adadapted.com/v/1.0.0/ad/retrieve");
        expect(config.method).toBe("POST");
        expect(config.data.zoneId).toBe("102110");
        expect(config.data.sessionId).toBe(SESSION_ID);
    });

    it("authenticates with an x-api-key header and keeps the app ID out of the body", async () => {
        await adadaptedApiRequests.retrieveAd(
            {
                sdkId: "1.2.3",
                bundleId: "com.test.app",
                userId: "test-udid",
                zoneId: "102110",
                storeId: "",
                contextId: "",
                sessionId: SESSION_ID,
                extra: "",
            },
            APP_ID,
            EnvironmentTypes.ApiEnv.Dev,
        );

        const { config } = lastCall();

        expect(config.headers["x-api-key"]).toBe(APP_ID);
        expect(JSON.stringify(config.data)).not.toContain(APP_ID);
    });

    it("reports ad events to the v1.0.0 events route", async () => {
        await adadaptedApiRequests.reportAdEvent(
            {
                session_id: SESSION_ID,
                app_id: APP_ID,
                udid: "test-udid",
                events: [
                    {
                        ad_id: "ad-1",
                        zone_id: "102110",
                        impression_id: "impression-1",
                        event_type: ReportedEventType.IMPRESSION,
                        created_at: 1700000000,
                    },
                ],
            },
            APP_ID,
            EnvironmentTypes.ApiEnv.Prod,
        );

        const { url, config } = lastCall();

        expect(url).toBe("https://ads.adadapted.com/v/1.0.0/ad/events");
        expect(config.headers["x-api-key"]).toBe(APP_ID);
        expect(config.data.events[0].zone_id).toBe("102110");
    });
});

describe("v1.0.0 intercept routes", () => {
    it("retrieves intercepts over POST, not GET", async () => {
        await adadaptedApiRequests.getKeywordIntercepts(
            {
                sdkId: "1.2.3",
                bundleId: "com.test.app",
                userId: "test-udid",
                zoneId: "",
                sessionId: SESSION_ID,
                extra: "",
            },
            APP_ID,
            EnvironmentTypes.ApiEnv.Dev,
        );

        const { url, config } = lastCall();

        expect(url).toBe(
            "https://sandbox.adadapted.com/v/1.0.0/intercept/retrieve",
        );
        expect(config.method).toBe("POST");
        expect(config.headers["x-api-key"]).toBe(APP_ID);
    });

    it("reports intercept events to the v1.0.0 events route", async () => {
        await adadaptedApiRequests.reportInterceptEvent(
            {
                session_id: SESSION_ID,
                app_id: APP_ID,
                udid: "test-udid",
                events: [],
            },
            APP_ID,
            EnvironmentTypes.ApiEnv.Dev,
        );

        expect(lastCall().url).toBe(
            "https://sandbox.adadapted.com/v/1.0.0/intercept/events",
        );
    });
});

describe("v1 routes", () => {
    it("keeps the {os} path segment on list manager events", async () => {
        await adadaptedApiRequests.reportListManagerEvents(
            {
                session_id: SESSION_ID,
                app_id: APP_ID,
                udid: "test-udid",
                sdk_version: "1.2.3",
                bundle_id: "com.test.app",
                bundle_version: "1.0",
                locale: "en-US",
                allow_retargeting: 1,
                device: "test-device",
                os: "ios_react_native",
                osv: "17.0",
                timezone: "America/Detroit",
                carrier: "test-carrier",
                dw: 1170,
                dh: 2532,
                density: "3.0",
                events: [
                    {
                        event_source: ListManagerEventSource.APP,
                        event_name: ListManagerEventName.ADDED_TO_LIST,
                        event_timestamp: 1700000000,
                        event_params: {
                            item_name: "Milk",
                            list_name: "My list",
                        },
                    },
                ],
            },
            DeviceTypes.DeviceOS.IOS,
            EnvironmentTypes.ListManagerApiEnv.Dev,
        );

        const { url, config } = lastCall();

        expect(url).toBe("https://sandec.adadapted.com/v/1/ios/events");
        expect(config.headers["x-api-key"]).toBeUndefined();
    });

    it("resolves the {os} segment from the device OS it is given", async () => {
        await adadaptedApiRequests.reportListManagerEvents(
            {
                session_id: SESSION_ID,
                app_id: APP_ID,
                udid: "test-udid",
                sdk_version: "1.2.3",
                bundle_id: "com.test.app",
                bundle_version: "1.0",
                locale: "en-US",
                allow_retargeting: 0,
                device: "test-device",
                os: "ios_react_native",
                osv: "17.0",
                timezone: "America/Detroit",
                carrier: "test-carrier",
                dw: 1170,
                dh: 2532,
                density: "3.0",
                events: [],
            },
            DeviceTypes.DeviceOS.ANDROID,
            EnvironmentTypes.ListManagerApiEnv.Prod,
        );

        expect(lastCall().url).toBe(
            "https://ec.adadapted.com/v/1/android/events",
        );

        // NOTE: Whether the SDK actually puts locale and allow_retargeting in this
        //       envelope is asserted in session.test.ts. This layer only forwards
        //       the body it is handed, so asserting it here would test axios.
    });

    it("posts payload tracking and pickup to the payload server", async () => {
        await adadaptedApiRequests.reportPayloadContentStatus(
            {
                app_id: APP_ID,
                session_id: SESSION_ID,
                udid: "test-udid",
                tracking: [
                    {
                        payload_id: "payload-1",
                        status: PayloadStatus.DELIVERED,
                        event_timestamp: 1700000000,
                    },
                ],
            },
            EnvironmentTypes.PayloadApiEnv.Dev,
        );

        expect(lastCall().url).toBe(
            "https://sandpayload.adadapted.com/v/1/tracking",
        );

        mockedAxios.mockReset();
        mockedAxios.mockResolvedValue({ data: {} });

        await adadaptedApiRequests.retrievePayloadContent(
            {
                app_id: APP_ID,
                session_id: SESSION_ID,
                udid: "test-udid",
            },
            EnvironmentTypes.PayloadApiEnv.Prod,
        );

        expect(lastCall().url).toBe("https://payload.adadapted.com/v/1/pickup");
    });
});

describe("request timeouts", () => {
    it("bounds every request", async () => {
        await adadaptedApiRequests.retrieveAd(
            {
                sdkId: "1.2.3",
                bundleId: "com.test.app",
                userId: "test-udid",
                zoneId: "102110",
                storeId: "",
                contextId: "",
                sessionId: SESSION_ID,
                extra: "",
            },
            APP_ID,
            EnvironmentTypes.ApiEnv.Dev,
        );

        const { config } = lastCall();

        // A request that never settles leaves the requesting zone's in-flight
        // latch set, and that zone then never serves another ad for the rest of
        // the session. The bound must also stay under the 15s minimum refresh, so
        // a response cannot outlive the cycle that asked for it.
        expect(config.timeout).toBeGreaterThan(0);
        expect(config.timeout).toBeLessThan(15000);
    });
});

describe("the mock environment", () => {
    it("serves fixtures without touching the network", async () => {
        const response = await adadaptedApiRequests.retrieveAd(
            {
                sdkId: "1.2.3",
                bundleId: "com.test.app",
                userId: "test-udid",
                zoneId: "102110",
                storeId: "",
                contextId: "",
                sessionId: SESSION_ID,
                extra: "",
            },
            APP_ID,
            EnvironmentTypes.ApiEnv.Mock,
        );

        expect(mockedAxios).not.toHaveBeenCalled();
        expect(response.data.success).toBe(true);
    });
});

describe("event source values", () => {
    it("distinguishes SDK lifecycle events from app reported ones", () => {
        // The wire values are only written down in this enum, and the server keys
        // session reporting off them. Android sends "sdk" for its own lifecycle
        // events and "app" for user actions.
        expect(ListManagerEventSource.SDK).toBe("sdk");
        expect(ListManagerEventSource.APP).toBe("app");
    });
});
