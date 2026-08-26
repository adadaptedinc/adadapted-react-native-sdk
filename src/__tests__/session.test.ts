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
import { AdadaptedReactNativeSdk } from "../index";
import { EnvironmentTypes } from "../componentTypes/Environment";
import { ListManagerEventSource, SdkEventName } from "../api/adadaptedApiTypes";

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
    return mockedAxios.mock.calls
        .filter(([url]) => String(url).includes("/events"))
        .flatMap(([, config]) =>
            (config.data.events ?? []).map((event: any) => ({
                name: event.event_name,
                source: event.event_source,
                body: config.data,
            })),
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

describe("teardown", () => {
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
