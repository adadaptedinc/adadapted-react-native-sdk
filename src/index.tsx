/**
 * The AdadaptedReactNativeSdk package/module definition.
 */
// Installs crypto.getRandomValues as a side effect. React Native's runtime has no
// Web Crypto of its own, and the session ID is generated from it.
import "react-native-get-random-values";
import {
    AppState,
    AppStateStatus,
    EmitterSubscription,
    Linking,
    NativeModules,
    Platform,
} from "react-native";
import * as adadaptedApiRequests from "./api/adadaptedApiRequests";
import {
    DetailedListItem,
    KeywordIntercepts,
    KeywordSearchTerm,
    ListManagerEvent,
    ListManagerEventName,
    ListManagerEventSource,
    OutOfAppDataPayload,
    PayloadStatus,
    ReportedEventType,
    ReportedInterceptEvent,
    ReportListManagerDataRequest,
    SdkEventName,
} from "./api/adadaptedApiTypes";
import {
    AdEventReport,
    notifyAppActiveChanged,
    notifySdkTeardown,
    PendingAtlContent,
    setAdRequestContext,
} from "./adRequestContext";
import { safeInvoke } from "./util";
import packageJson from "../package.json";
import base64 from "react-native-base64";
import { DeviceTypes } from "./componentTypes/Device";
import { EnvironmentTypes } from "./componentTypes/Environment";

/**
 * Interface defining inputs to the {@link Sdk.initialize: AdadaptedReactNativeSdk} method.
 */
export interface InitializeProps {
    /**
     * The app ID provided by the client.
     */
    appId: string;
    /**
     * The API environment.
     * If undefined, defaults to production.
     */
    apiEnv?: EnvironmentTypes.ApiEnv;
    /**
     * Optional custom advertiserId to replace IDFA - ios only.
     */
    advertiserId?: string;
    /**
     * The touch sensitivity of the Ad Zone in both the X and Y directions.
     * This is used to determine the click/press sensitivity when the
     * Ad Zone is being touched by the user as a regular touch or while
     * scrolling the view. If the amount of touch "drag" distance in either
     * X or Y direction is less than this value, we will treat the action as
     * a click/press on the Ad Zone.
     */
    xyDragDistanceAllowed?: number;
    /**
     * The store to target ads for, if targeting ads by store.
     */
    storeId?: string;
    /**
     * Callback that gets triggered when an "add to list" item/items are clicked.
     * @param items - The array of items to "add to list".
     */
    onAddToListTriggered?(items: DetailedListItem[]): void;
    /**
     * Callback that gets triggered when an "add to list"
     * occurs by means of an "out of app" data payload.
     * @param payloads - All payloads the client must go through.
     */
    onOutOfAppPayloadAvailable?(payloads: OutOfAppDataPayload[]): void;
}

/**
 * Interface defining a keyword search result.
 * This is primarily used to export an interface directly from
 * {@link AdadaptedReactNativeSdk} so the interaction with the SDK all be
 * done through this namespace.
 */
export interface KeywordSearchResult extends KeywordSearchTerm {}

/**
 * Class that acts as the AdAdapted SDK for react-native.
 */
export class AdadaptedReactNativeSdk {
    /**
     * The client app ID used to send to API endpoints.
     */
    private appId: string = "";
    /**
     * The API environment to use when making API calls.
     */
    private apiEnv: EnvironmentTypes.ApiEnv;
    /**
     * The API environment to use when making API calls for List Manager.
     */
    private listManagerApiEnv: EnvironmentTypes.ListManagerApiEnv;
    /**
     * The API environment to use when making API calls for the Payload server.
     */
    private payloadApiEnv: EnvironmentTypes.PayloadApiEnv;
    /**
     * The device operating system.
     */
    private deviceOs: DeviceTypes.DeviceOS | undefined;
    /**
     * The session ID used for the API to properly identify a user.
     */
    private sessionId: string | undefined;
    /**
     * All device data gathered when "initialize" is called.
     */
    private deviceInfo: DeviceTypes.DeviceInfo | undefined;
    /**
     * The time at which the app was last sent to the background, in seconds.
     * The session window is measured from this.
     */
    private backgroundTime: number;
    /**
     * Whether the app has been backgrounded since the session was last resolved.
     *
     * Android guards its first onStart instead, because ProcessLifecycleOwner
     * replays the current state to a newly registered observer and would otherwise
     * report the session start() just resolved. AppState has no such replay, so
     * copying that guard would swallow the first real return from the background,
     * and with it the rotation of a session that had expired while away. Tracking
     * the background instead also absorbs the inactive -> active transition iOS
     * raises during the launch animation, which would otherwise report a resume
     * for a session that never left.
     */
    private hasBeenBackgrounded: boolean = false;
    /**
     * The store to target ads for, or an empty string.
     */
    private storeId: string = "";
    /**
     * The most recently clicked "add to list" ad per zone, held until the host app
     * confirms its items reached the user's list.
     *
     * Keyed by zone because several zones can be on screen at once, each with its
     * own ATL ad. A single slot meant a click in one zone discarded another zone's
     * pending content and lost its interaction. Android keeps them apart the same
     * way, publishing an AdContent per zone.
     */
    private pendingAtlContent = new Map<string, PendingAtlContent>();
    /**
     * The touch sensitivity of the Ad Zone in both the X and Y directions.
     * This is used to determine the click/press sensitivity when the
     * Ad Zone is being touched by the user as a regular touch or while
     * scrolling the view. If the amount of touch "drag" distance in either
     * X or Y direction is less than this value, we will treat the action as
     * a click/press on the Ad Zone.
     */
    private xyAdZoneDragDistanceAllowed: number | undefined;
    /**
     * The user input string provided by the client and used to return a
     * result of keyword intercept terms. This will always be the last
     * provided value.
     */
    private keywordInterceptSearchValue: string;
    /**
     * The current available keyword intercepts that can
     * be used when a search is provided by the user.
     */
    private keywordIntercepts: KeywordIntercepts | undefined;
    /**
     * If provided, triggers when an "add to list" item is
     * clicked in an ad zone.
     * @param items - The array of items to "add to list".
     * @param isExternalPayload - If true, the items are from an external payload.
     */
    private onAddToListTriggered: (
        items: DetailedListItem[],
        isExternalPayload?: boolean,
    ) => void | undefined;
    /**
     * If provided, triggers when an "add to list"
     * occurs by means of an "out of app" data payload.
     * @param payloads - All payloads the client must go through.
     */
    private onOutOfAppPayloadAvailable: (
        payloads: OutOfAppDataPayload[],
    ) => void | undefined;
    /**
     * Deeplink event listener.
     */
    private deepLinkOnEventListener: EmitterSubscription | undefined;
    /**
     * AppState event listener.
     */
    private AppStateOnEventListener: EmitterSubscription | undefined;

    /**
     * Gets the Session ID.
     * @returns the Session ID.
     */
    public getSessionId(): string | undefined {
        return this.sessionId;
    }

    /**
     * Gets the Device Info object.
     * @returns the Device Info object.
     */
    public getDeviceInfo(): DeviceTypes.DeviceInfo | undefined {
        return this.deviceInfo;
    }

    /**
     * @inheritDoc
     */
    constructor() {
        this.apiEnv = EnvironmentTypes.ApiEnv.Prod;
        this.listManagerApiEnv = EnvironmentTypes.ListManagerApiEnv.Prod;
        this.payloadApiEnv = EnvironmentTypes.PayloadApiEnv.Prod;
        this.backgroundTime = this.getCurrentUnixTimestamp();
        this.onAddToListTriggered = () => {
            // Defaulting to empty method.
        };
        this.onOutOfAppPayloadAvailable = () => {
            // Defaulting to empty method.
        };
        this.keywordInterceptSearchValue = "";

        this.initialize = this.initialize.bind(this);
        this.unmount = this.unmount.bind(this);
        this.handleAppStateChange = this.handleAppStateChange.bind(this);
        this.handleDeepLink = this.handleDeepLink.bind(this);
    }

    /**
     * Gets the users device info.
     * @returns a Promise of void.
     */
    private getDeviceInformation(): Promise<string> {
        return new Promise<string>((resolve) => {
            NativeModules.AdadaptedReactNativeSdk.getDeviceInfo().then(
                (response: string) => {
                    resolve(response);
                },
            );
        });
    }

    /**
     * How long a session survives being backgrounded before a new one is minted.
     * Matches THIRTY_MINUTES_IN_SECONDS in Android's SessionClient.
     */
    private static readonly SESSION_LIFETIME_SECONDS = 30 * 60;

    /**
     * The prefix identifying a session as having come from this SDK. Reporting
     * distinguishes platforms by this prefix, so it must not collide with the other
     * SDKs ("JS" on web, "ANDROID" on Android, "IOS" on iOS).
     */
    private static readonly SESSION_ID_PREFIX = "RN";

    /**
     * The number of random characters that follow the session ID prefix.
     */
    private static readonly SESSION_ID_LENGTH = 32;

    /**
     * The alphabet a session ID's random characters are drawn from.
     */
    private static readonly SESSION_ID_CHARACTERS =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

    /**
     * The shortest search term that will be matched against keyword intercepts.
     * The API no longer serves a minimum, so the SDK applies its own, matching
     * MIN_MATCH_LENGTH in Android's KeywordInterceptMatcher.
     */
    private static readonly MIN_KEYWORD_MATCH_LENGTH = 3;

    /**
     * Generates a new session ID.
     * Format: "RN" followed by 32 characters from [A-Z0-9], mirroring
     * SessionClient.generateId on Android.
     * @returns the generated session ID.
     */
    private generateSessionId(): string {
        const characters = AdadaptedReactNativeSdk.SESSION_ID_CHARACTERS;
        const length = AdadaptedReactNativeSdk.SESSION_ID_LENGTH;

        // The largest multiple of the alphabet length that fits in a byte.
        // Rejecting anything at or above it keeps every character equally likely,
        // rather than biasing towards the start of the alphabet.
        const rejectAtOrAbove = 256 - (256 % characters.length);

        let sessionId = "";

        while (sessionId.length < length) {
            const randomBytes = crypto.getRandomValues(new Uint8Array(length));

            for (const randomByte of randomBytes) {
                if (sessionId.length >= length) {
                    break;
                }

                if (randomByte < rejectAtOrAbove) {
                    sessionId += characters.charAt(
                        randomByte % characters.length,
                    );
                }
            }
        }

        return `${AdadaptedReactNativeSdk.SESSION_ID_PREFIX}${sessionId}`;
    }

    /**
     * Mints a new session, or resumes the current one if the app has not been
     * backgrounded for longer than the session window, and reports the matching
     * event. A direct port of SessionClient.createOrResumeSession.
     *
     * NOTE: The session is held in memory only and is never persisted, so a cold
     *       start always mints a new one. SESSION_RESUMED therefore only ever
     *       occurs when the app is foregrounded within the same process. This is
     *       deliberate parity with Android; the web SDK persists instead, because
     *       reloading a browser tab is normal where relaunching an app is not.
     */
    private createOrResumeSession(): void {
        const currentTime = this.getCurrentUnixTimestamp();
        const isNewSession =
            !this.sessionId ||
            currentTime - this.backgroundTime >=
                AdadaptedReactNativeSdk.SESSION_LIFETIME_SECONDS;

        if (isNewSession) {
            this.sessionId = this.generateSessionId();
        } else {
            this.backgroundTime = currentTime;
        }

        this.reportSdkEvent(
            isNewSession
                ? SdkEventName.SESSION_CREATED
                : SdkEventName.SESSION_RESUMED,
        );
    }

    /**
     * Stamps the time the app was backgrounded and reports the event.
     * A port of SessionClient.sessionBackgrounded.
     */
    private sessionBackgrounded(): void {
        this.backgroundTime = this.getCurrentUnixTimestamp();

        this.reportSdkEvent(SdkEventName.SESSION_BACKGROUNDED);
    }

    /**
     * Reports an SDK level event, carrying the session it describes.
     * @param eventName - The event to report.
     * @param extraParams - Any additional params the event carries.
     */
    private reportSdkEvent(
        eventName: SdkEventName,
        extraParams?: { [key: string]: string },
    ): void {
        if (!this.sessionId || !this.deviceInfo || !this.deviceOs) {
            return;
        }

        adadaptedApiRequests
            .reportListManagerEvents(
                {
                    ...this.getSdkEventRequestBase(),
                    events: [
                        {
                            // "sdk" rather than "app": these describe the SDK's own
                            // lifecycle, not a user action. Matches SDK_EVENT_TYPE
                            // in Android's EventStrings.
                            event_source: ListManagerEventSource.SDK,
                            event_name: eventName,
                            event_timestamp: this.getCurrentUnixTimestamp(),
                            event_params: {
                                sessionId: this.sessionId,
                                ...extraParams,
                            },
                        },
                    ],
                },
                this.deviceOs,
                this.listManagerApiEnv,
            )
            .catch(() => {
                // Reporting failures must not interrupt ad serving.
            });
    }

    /**
     * Reports an ad or zone level event. Exposed to ad zones through the request
     * context rather than being called directly.
     * @param event - What the event describes and what happened.
     */
    private reportAdEvent(event: AdEventReport): void {
        if (!this.sessionId || !this.deviceInfo) {
            return;
        }

        adadaptedApiRequests
            .reportAdEvent(
                {
                    app_id: this.appId,
                    session_id: this.sessionId,
                    udid: this.deviceInfo.udid,
                    events: [
                        {
                            ad_id: event.adId,
                            zone_id: event.zoneId,
                            impression_id: event.impressionId,
                            event_type: event.eventType,
                            // Left off the payload entirely rather than sent as
                            // null when there is no name for this event type.
                            ...(event.eventName
                                ? { event_name: event.eventName }
                                : {}),
                            created_at: this.getCurrentUnixTimestamp(),
                        },
                    ],
                },
                this.appId,
                this.apiEnv,
            )
            .catch(() => {
                // Reporting failures must not interrupt ad serving.
            });
    }

    /**
     * Registers the context ad zones read their session and device info from.
     */
    private registerAdRequestContext(): void {
        setAdRequestContext({
            appId: this.appId,
            apiEnv: this.apiEnv,
            udid: this.deviceInfo!.udid,
            bundleId: this.deviceInfo!.bundleId,
            sdkVersion: packageJson.version,
            storeId: this.storeId,
            xyDragDistanceAllowed: this.xyAdZoneDragDistanceAllowed,
            getSessionId: () => this.sessionId ?? "",
            reportAdEvent: (event) => this.reportAdEvent(event),
            reportSdkEvent: (eventName, extraParams) =>
                this.reportSdkEvent(eventName, extraParams),
            setPendingAtlContent: (content) => {
                // Delete first: Map.set on an existing key keeps its original
                // insertion position, so re-keying a zone would leave it where it
                // was and acknowledge()'s newest-first scan would pick an older
                // zone's ad instead.
                this.pendingAtlContent.delete(content.zoneId);
                this.pendingAtlContent.set(content.zoneId, content);
            },
            forwardAddToList: (items) => {
                safeInvoke(this.onAddToListTriggered, items);
            },
        });
    }

    /**
     * Trigger an API request to get all possible
     * keyword intercepts for the session.
     */
    private getKeywordIntercepts(): void {
        adadaptedApiRequests
            .getKeywordIntercepts(
                {
                    sdkId: packageJson.version,
                    bundleId: this.deviceInfo!.bundleId,
                    userId: this.deviceInfo!.udid,
                    zoneId: "",
                    sessionId: this.sessionId!,
                    extra: "",
                },
                this.appId,
                this.apiEnv,
            )
            .then((response) => {
                this.keywordIntercepts =
                    response.data && response.data.success
                        ? response.data.data
                        : undefined;
            })
            .catch(() => {
                // Keyword intercepts are optional; a failure here must not stop
                // the rest of the SDK from working.
            });
    }

    /**
     * Gets the Keyword Intercept Term based on the provided term ID.
     * @param termId - The term ID to get the term object for.
     * @returns the term if it was found based on the provided term ID.
     */
    private getKeywordInterceptTerm(
        termId: string,
    ): KeywordSearchTerm | undefined {
        let term: KeywordSearchTerm | undefined;

        if (this.keywordIntercepts && termId) {
            for (const termObj of this.keywordIntercepts.terms) {
                if (termObj.term_id === termId) {
                    term = termObj;
                }
            }
        }

        return term;
    }

    /**
     * Gets the current unix timestamp.
     * @returns the current unix timestamp.
     */
    private getCurrentUnixTimestamp(): number {
        return Math.round(new Date().getTime() / 1000);
    }

    /**
     * Gets all data needed to make a List Manager API request.
     * @param eventSource - The event source.
     * @param eventName - The event name.
     * @param itemNames - The items to report.
     * @param listName - The list associated to the items, if any.
     * @returns the data required for the request.
     */
    /**
     * Whether the SDK currently has what a reported event needs to identify
     * itself.
     *
     * The reporting methods are public and the host can call them whenever it
     * likes, including before initialize() has resolved and after unmount() has
     * released the session. Both leave the request unbuildable - the session and
     * device info are asserted non-null where the payload is assembled - so this
     * is checked at the entry point rather than crashing several frames down.
     * @param method - The method being called, named in the log.
     * @returns true when an event can be reported.
     */
    private canReport(method: string): boolean {
        if (!this.sessionId || !this.deviceInfo || !this.deviceOs) {
            console.error(
                `AdAdapted SDK cannot report "${method}" before initialize() has resolved or after unmount().`,
            );

            return false;
        }

        return true;
    }

    private getListManagerApiRequestData(
        eventSource: ListManagerEventSource,
        eventName: ListManagerEventName,
        itemNames: string[],
        listName?: string,
    ): ReportListManagerDataRequest {
        const eventList: ListManagerEvent[] = [];

        for (const itemName of itemNames) {
            eventList.push({
                event_source: eventSource,
                event_name: eventName,
                event_timestamp: this.getCurrentUnixTimestamp(),
                event_params: {
                    item_name: itemName,
                    list_name: listName,
                },
            });
        }

        return {
            ...this.getSdkEventRequestBase(),
            events: eventList,
        };
    }

    /**
     * The fields every SDK level event request carries.
     *
     * NOTE: locale and allow_retargeting used to travel on the session initialize
     *       body. With that request gone this is the only channel left for them,
     *       and it is the one the native SDKs already use, so a user's retargeting
     *       decision is still honored rather than silently dropped.
     * @returns the base request fields.
     */
    private getSdkEventRequestBase(): Omit<
        ReportListManagerDataRequest,
        "events"
    > {
        return {
            session_id: this.sessionId!,
            app_id: this.appId,
            udid: this.deviceInfo!.udid,
            sdk_version: packageJson.version,
            bundle_id: this.deviceInfo!.bundleId,
            bundle_version: this.deviceInfo!.bundleVersion,
            locale: this.deviceInfo!.deviceLocale,
            allow_retargeting: this.deviceInfo!.isAdTrackingEnabled ? 1 : 0,
            // The rest of what the native SDKs put on this same route. These used
            // to travel on the session initialize body and were lost with it; the
            // bridge has always gathered them. Field names match Android's
            // EventRequest exactly, because that is the wire contract.
            device: this.deviceInfo!.deviceName,
            os: this.deviceInfo!.systemName,
            osv: this.deviceInfo!.systemVersion,
            timezone: this.deviceInfo!.deviceTimezone,
            carrier: this.deviceInfo!.deviceCarrier,
            // Reported as strings over the bridge but numbers on the wire.
            dw: Number(this.deviceInfo!.deviceWidth) || 0,
            dh: Number(this.deviceInfo!.deviceHeight) || 0,
            density: this.deviceInfo!.deviceScreenDensity,
        };
        // NOTE: Android also sends device_udid and an errors array. Neither has an
        //       equivalent here: the bridge exposes only one device identifier, and
        //       this SDK does not report SDK errors yet, so inventing values for
        //       them would be worse than omitting them.
    }

    /**
     * Takes the deep link URL and extracts out the payload items data to
     * send to the client for adding to a user's list.
     * @param event - The event containing URL related info.
     */
    private handleDeepLink(event: any): void {
        const searchStr = "data=";
        const dataIndex: number = event.url.indexOf(searchStr);

        if (dataIndex !== -1) {
            // The two numbers are added, not concatenated. This was a template
            // literal, so an index of 30 with a 5 character search string sliced
            // from 305 instead of 35 and every out-of-app payload deep link threw
            // on the decode below.
            // Bounded at the next parameter. Slicing to the end of the url put
            // any trailing parameters inside the base64, so a link of the form
            // ...?data=<payload>&other=1 decoded to garbage — which the guard
            // below now swallows silently rather than throwing.
            const dataStart = dataIndex + searchStr.length;
            const nextParam = event.url.indexOf("&", dataStart);
            const encodedData: string =
                nextParam === -1
                    ? event.url.slice(dataStart)
                    : event.url.slice(dataStart, nextParam);

            let payloadData;

            try {
                payloadData = JSON.parse(base64.decode(encodedData));
            } catch {
                // A malformed link is the sender's problem, not something to crash
                // the host app for. This runs inside the Linking handler and inside
                // getInitialURL().then(), neither of which is guarded.
                return;
            }

            const payloadId = payloadData.payload_id;
            const itemDataList = payloadData.detailed_list_items;

            if (itemDataList && itemDataList.length > 0) {
                const finalItemList: OutOfAppDataPayload[] = [];

                for (const itemData of itemDataList) {
                    finalItemList.push({
                        payload_id: payloadId,
                        detailed_list_items: [
                            {
                                product_title: itemData.product_title,
                                product_brand: itemData.product_brand,
                                product_category: itemData.product_category,
                                product_barcode: itemData.product_barcode,
                                product_discount: itemData.product_discount,
                                product_image: itemData.product_image,
                                product_sku: itemData.product_sku,
                            },
                        ],
                    });
                }

                // Send the items to the client, so they can add them to the list.
                safeInvoke(this.onOutOfAppPayloadAvailable, finalItemList);
            }
        }
    }

    /**
     * Triggered when the state of the app changes.
     * @param state - The current state of the app.
     */
    private handleAppStateChange(state: AppStateStatus): void {
        if (state === "active") {
            // Only a genuine return from the background resolves the session
            // again. See hasBeenBackgrounded for why this differs from Android.
            if (this.hasBeenBackgrounded) {
                this.hasBeenBackgrounded = false;

                // Before the zones are told, never after. A zone returning to an
                // ad that outlived its refresh time refetches immediately and
                // reads the session synchronously, so telling it first would send
                // that request under the session about to be replaced and split
                // the retrieve and its impression across two sessions.
                const previousSessionId = this.sessionId;

                this.createOrResumeSession();

                // The intercepts belong to the session that fetched them:
                // search_id is minted with them and rides on every intercept
                // event. Fetched only at initialize(), a session replaced here
                // left the SDK reporting a search_id from the session that had
                // just ended. A resumed session keeps its own, which are still
                // the right ones.
                //
                // Compared by ID rather than done inside createOrResumeSession,
                // because initialize() resolves the session and fetches the
                // intercepts itself - doing it there sent the request twice on
                // every launch.
                if (this.sessionId !== previousSessionId) {
                    this.getKeywordIntercepts();
                }

                this.getPayloadItemData();

                // Only after a real background. Zones are paused on background
                // and nowhere else, so there is nothing to wake otherwise, and
                // iOS raises inactive then active for a glance at the app
                // switcher — poking every zone for that is churn at best.
                notifyAppActiveChanged(true);
            }
        } else if (state === "background") {
            this.hasBeenBackgrounded = true;

            // Zones first here, so each closes its impression while the session it
            // belongs to is still the current one.
            notifyAppActiveChanged(false);

            this.sessionBackgrounded();
        }

        // "inactive" is an iOS-only transient state raised for the app switcher,
        // control centre and incoming calls. Android has no analogue, so acting on
        // it would report churn the native SDKs never report.
    }

    /**
     * Call to acknowledge that an "add to list" item reached the user's list.
     *
     * This is what earns an ATL ad its interaction. Clicking the ad only offers the
     * items; the host app is the only party that knows whether they were actually
     * added, so the interaction is reported here rather than on the click. Ported
     * from AdContent.itemAcknowledge in the Android SDK, including its guard
     * against a second item reporting a second interaction for one click.
     *
     * Item names that belong to no recently clicked ad are ignored, so a host can
     * safely call this for every item a user adds, ad-sourced or not.
     * @param itemName - The product title of the item that was added.
     */
    public acknowledge(itemName: string): void {
        // Newest first: with several zones showing ATL ads, the most recent click
        // is the one the host is most likely acknowledging. A flat itemName is all
        // this API carries, so matching on it is the closest this can get to
        // Android, where the host holds the AdContent object for a specific zone.
        const content = [...this.pendingAtlContent.values()]
            .reverse()
            .find((candidate) =>
                candidate.items.some((item) => item.product_title === itemName),
            );

        if (!content) {
            return;
        }

        if (!content.isHandled) {
            content.isHandled = true;

            this.reportAdEvent({
                adId: content.adId,
                zoneId: content.zoneId,
                impressionId: content.impressionId,
                eventType: ReportedEventType.INTERACTION,
            });
        }

        this.reportSdkEvent(SdkEventName.ATL_ITEM_ADDED_TO_LIST, {
            ad_id: content.adId,
            item_name: itemName,
        });
    }

    /**
     * Gets all available Payload server item data for the user.
     */
    private getPayloadItemData(): void {
        adadaptedApiRequests
            .retrievePayloadContent(
                {
                    app_id: this.appId,
                    session_id: this.sessionId!,
                    udid: this.deviceInfo!.udid,
                },
                this.payloadApiEnv,
            )
            .then((response) => {
                const finalItemList: OutOfAppDataPayload[] = [];

                for (const payload of response.data.payloads) {
                    for (const itemData of payload.detailed_list_items) {
                        finalItemList.push({
                            payload_id: payload.payload_id,
                            detailed_list_items: [
                                {
                                    product_title: itemData.product_title,
                                    product_brand: itemData.product_brand,
                                    product_category: itemData.product_category,
                                    product_barcode: itemData.product_barcode,
                                    product_discount: itemData.product_discount,
                                    product_image: itemData.product_image,
                                    product_sku: itemData.product_sku,
                                },
                            ],
                        });
                    }
                }

                // Send the items to the client, so they can add them to the list.
                safeInvoke(this.onOutOfAppPayloadAvailable, finalItemList);
            })
            .catch(() => {
                // Do nothing.
            });
    }

    /**
     * Initializes the session for the AdAdapted API and sets up the SDK.
     * @param props - The props used to initialize the SDK.
     * @returns a Promise of void.
     */
    public initialize(props: InitializeProps): Promise<void> {
        // Set the app ID.
        this.appId = props.appId;

        // All three backends follow the environment the caller asked for.
        this.resolveApiEnvironments(props.apiEnv);

        // The ad zone touch drag sensitivity setting.
        if (props.xyDragDistanceAllowed) {
            this.xyAdZoneDragDistanceAllowed = props.xyDragDistanceAllowed;
        }

        // If the callback for onAddToListTriggered was provided, set it
        // globally for use when the method needs to be triggered.
        if (props.onAddToListTriggered) {
            this.onAddToListTriggered = props.onAddToListTriggered;
        }

        // If the callback for onOutOfAppPayloadAvailable was provided, set it
        // globally for use when the method needs to be triggered.
        if (props.onOutOfAppPayloadAvailable) {
            this.onOutOfAppPayloadAvailable = props.onOutOfAppPayloadAvailable;
        }

        // The store to target ads for, if any.
        if (props.storeId) {
            this.storeId = props.storeId;
        }

        return new Promise<void>((resolve, reject) => {
            this.getDeviceInformation()
                .then((deviceInfoObj) => {
                    const deviceInfo = JSON.parse(
                        deviceInfoObj,
                    ) as DeviceTypes.DeviceInfo;

                    this.deviceInfo = deviceInfo;
                    this.deviceOs = deviceInfo.systemName.includes("ios")
                        ? DeviceTypes.DeviceOS.IOS
                        : DeviceTypes.DeviceOS.ANDROID;

                    // Pass custom advertiserId - ios only
                    if (Platform.OS.includes("ios")) {
                        if (!(props.advertiserId === undefined)) {
                            deviceInfo.udid = props.advertiserId;
                        }
                    }

                    // There is no session request any more. The session is minted
                    // here and lives only for as long as this JS runtime does,
                    // exactly as Android's SessionClient does, so relaunching the
                    // app always starts a new session.
                    this.createOrResumeSession();

                    // Ad zones read their session and device info from here.
                    this.registerAdRequestContext();

                    // Get all possible keyword intercept values. We don't need to
                    // wait for this to complete prior to resolving initialization.
                    this.getKeywordIntercepts();

                    // Intercept an initial deep link here, if needed.
                    Linking.getInitialURL().then((url) => {
                        if (url) {
                            // Pass in as an object so it mimics the "url"
                            // property of Linking.addEventListener("url").
                            this.handleDeepLink({ url });
                        }
                    });

                    // Make the initial call to the Payload data server to see if
                    // the user has any outstanding items to be added to list.
                    this.getPayloadItemData();

                    // Any listeners from a previous initialize() go first, so a
                    // second call replaces them instead of stacking on top.
                    this.removeEventListeners();

                    // Intercept deep links while the app is running.
                    this.deepLinkOnEventListener = Linking.addEventListener(
                        "url",
                        this.handleDeepLink,
                    );

                    // Track app foreground and background transitions, which drive
                    // the session lifecycle events.
                    this.AppStateOnEventListener = AppState.addEventListener(
                        "change",
                        this.handleAppStateChange,
                    );

                    resolve();
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    /**
     * Searches through available ad keywords based on provided search term.
     * @param searchTerm - The search term used to match against
     *      available keyword intercepts.
     * @returns all keyword intercept terms that matched the search term.
     */
    public performKeywordSearch(searchTerm: string): KeywordSearchResult[] {
        const finalResultListStartsWith: KeywordSearchResult[] = [];

        this.keywordInterceptSearchValue = searchTerm;

        if (!this.deviceInfo) {
            console.error(
                "AdAdapted SDK has not been initialized with device info.",
            );
        } else if (!this.sessionId) {
            console.error(
                "AdAdapted SDK has not been initialized with session id.",
            );
        } else if (!this.keywordIntercepts) {
            console.error("No available keyword intercepts.");
        } else if (
            searchTerm &&
            searchTerm.trim() &&
            searchTerm.trim().length >=
                AdadaptedReactNativeSdk.MIN_KEYWORD_MATCH_LENGTH
        ) {
            searchTerm = searchTerm.trim();

            const finalEventsList: ReportedInterceptEvent[] = [];
            const currentTs = this.getCurrentUnixTimestamp();

            // Search for matching terms.
            for (const termObj of this.keywordIntercepts.terms) {
                if (
                    termObj.term
                        .toLowerCase()
                        .startsWith(searchTerm.toLowerCase())
                ) {
                    // If the term starts with the search term,
                    // add it to the finalResultListStartsWith list.
                    finalResultListStartsWith.push(termObj);

                    finalEventsList.push({
                        term_id: termObj.term_id,
                        search_id: this.keywordIntercepts.search_id,
                        user_input: this.keywordInterceptSearchValue,
                        term: termObj.term,
                        event_type: ReportedEventType.MATCHED,
                        created_at: currentTs,
                    });
                }
            }

            // Sort the final results by priority.
            finalResultListStartsWith.sort((a, b) =>
                a.priority > b.priority ? 1 : -1,
            );

            // If there are no events to report at this point,
            // we need to report the "not_matched" event.
            if (finalEventsList.length === 0) {
                finalEventsList.push({
                    term_id: "",
                    search_id: "NA",
                    user_input: this.keywordInterceptSearchValue,
                    term: "NA",
                    event_type: ReportedEventType.NOT_MATCHED,
                    created_at: currentTs,
                });
            }

            // Send up the "matched" event for the keyword search for
            // all terms that matched the users search.
            adadaptedApiRequests
                .reportInterceptEvent(
                    {
                        app_id: this.appId,
                        udid: this.deviceInfo.udid,
                        session_id: this.sessionId,
                        events: finalEventsList,
                    },
                    this.appId,
                    this.apiEnv,
                )
                .then(() => {
                    // Do nothing with the response for now...
                })
                .catch(() => {
                    // Reporting failures must not interrupt keyword search, and an
                    // unhandled rejection here surfaces as a red screen in dev.
                });
        }

        // The returned list will keep all terms found by matching the
        // beginning of the term string at the beginning of the list. All
        // terms found that didn't match the beginning of the string, but
        // still contained the search term will be concatenated to the end
        // of the list.
        // Only terms that start with the search term are returned. Matching terms
        // that merely contain it is deliberately not enabled - the JS SDK has the
        // same restriction, and turning it on here would both widen what the host
        // sees and start reporting "matched" for terms the product does not treat
        // as matches. The list it was concatenating was never populated, so this is
        // the behaviour that was already in effect.
        return finalResultListStartsWith;
    }

    /**
     * Client must trigger this method when a Keyword Intercept Term has
     * been "selected" by the user.
     * This will ensure that the event is properly recorded and enable
     * accuracy in client reports.
     * @param termId - The term ID to trigger the event for.
     */
    public reportKeywordInterceptTermSelected(termId: string): void {
        const termObj = this.getKeywordInterceptTerm(termId);

        if (!this.deviceInfo) {
            console.error(
                "AdAdapted SDK has not been initialized with device info.",
            );
        } else if (!this.sessionId) {
            console.error(
                "AdAdapted SDK has not been initialized with session id.",
            );
        } else if (!this.keywordIntercepts) {
            console.error("No available keyword intercepts.");
        } else if (!termId || !termObj) {
            console.error("Invalid term ID provided.");
        } else {
            adadaptedApiRequests
                .reportInterceptEvent(
                    {
                        app_id: this.appId,
                        udid: this.deviceInfo.udid,
                        session_id: this.sessionId,
                        events: [
                            {
                                term_id: termObj.term_id,
                                search_id: this.keywordIntercepts.search_id,
                                user_input: this.keywordInterceptSearchValue,
                                term: termObj.term,
                                event_type: ReportedEventType.SELECTED,
                                created_at: this.getCurrentUnixTimestamp(),
                            },
                        ],
                    },
                    this.appId,
                    this.apiEnv,
                )
                .then(() => {
                    // Do nothing with the response for now...
                })
                .catch(() => {
                    // Reporting failures must not interrupt keyword search, and an
                    // unhandled rejection here surfaces as a red screen in dev.
                });
        }
    }

    /**
     * Client must trigger this method when a Keyword Intercept Term has
     * been "presented" to the user. All terms that satisfy a search don't
     * have to be presented, so only provide term IDs for the terms that
     * ultimately get presented to the user.
     * This will ensure that the event is properly recorded and enable
     * accuracy in client reports.
     * @param termIds - The term IDs list to trigger the event for.
     */
    public reportKeywordInterceptTermsPresented(termIds: string[]): void {
        const termObjs: KeywordSearchTerm[] = [];

        for (const termId of termIds) {
            const termObj = this.getKeywordInterceptTerm(termId);

            if (termObj) {
                termObjs.push(termObj);
            }
        }

        if (!this.deviceInfo) {
            console.error(
                "AdAdapted SDK has not been initialized with device info.",
            );
        } else if (!this.sessionId) {
            console.error(
                "AdAdapted SDK has not been initialized with session id.",
            );
        } else if (!this.keywordIntercepts) {
            console.error("No available keyword intercepts.");
        } else if (!termIds || termIds.length === 0 || termObjs.length === 0) {
            console.error("Invalid or empty terms ID list provided.");
        } else {
            const termEvents: ReportedInterceptEvent[] = [];
            const currentTs = this.getCurrentUnixTimestamp();

            for (const termObj of termObjs) {
                termEvents.push({
                    term_id: termObj.term_id,
                    search_id: this.keywordIntercepts.search_id,
                    user_input: this.keywordInterceptSearchValue,
                    term: termObj.term,
                    event_type: ReportedEventType.PRESENTED,
                    created_at: currentTs,
                });
            }

            adadaptedApiRequests
                .reportInterceptEvent(
                    {
                        app_id: this.appId,
                        udid: this.deviceInfo.udid,
                        session_id: this.sessionId,
                        events: termEvents,
                    },
                    this.appId,
                    this.apiEnv,
                )
                .then(() => {
                    // Do nothing with the response for now...
                })
                .catch(() => {
                    // Reporting failures must not interrupt keyword search, and an
                    // unhandled rejection here surfaces as a red screen in dev.
                });
        }
    }

    /**
     * Client must trigger this method when any items
     * are added to a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - The list to associate the items with, if any.
     */
    public reportItemsAddedToList(
        itemNames: string[],
        listName?: string,
    ): void {
        if (!this.canReport("reportItemsAddedToList")) {
            return;
        }

        const requestData = this.getListManagerApiRequestData(
            ListManagerEventSource.APP,
            ListManagerEventName.ADDED_TO_LIST,
            itemNames,
            listName,
        );

        adadaptedApiRequests
            .reportListManagerEvents(
                requestData,
                this.deviceOs!,
                this.listManagerApiEnv,
            )
            .then()
            .catch(() => {
                // Do nothing.
            });
    }

    /**
     * Client must trigger this method when any items
     * are crossed off a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - The list the items are associated with, if any.
     */
    public reportItemsCrossedOffList(
        itemNames: string[],
        listName?: string,
    ): void {
        if (!this.canReport("reportItemsCrossedOffList")) {
            return;
        }

        const requestData = this.getListManagerApiRequestData(
            ListManagerEventSource.APP,
            ListManagerEventName.CROSSED_OFF_LIST,
            itemNames,
            listName,
        );

        adadaptedApiRequests
            .reportListManagerEvents(
                requestData,
                this.deviceOs!,
                this.listManagerApiEnv,
            )
            .then()
            .catch(() => {
                // Do nothing.
            });
    }

    /**
     * Client must trigger this method when any items
     * are deleted from a list for reports we provide to the client.
     * @param itemNames - The items to report.
     * @param listName - The list the items are associated with, if any.
     */
    public reportItemsDeletedFromList(
        itemNames: string[],
        listName?: string,
    ): void {
        if (!this.canReport("reportItemsDeletedFromList")) {
            return;
        }

        const requestData = this.getListManagerApiRequestData(
            ListManagerEventSource.APP,
            ListManagerEventName.DELETED_FROM_LIST,
            itemNames,
            listName,
        );

        adadaptedApiRequests
            .reportListManagerEvents(
                requestData,
                this.deviceOs!,
                this.listManagerApiEnv,
            )
            .then()
            .catch(() => {
                // Do nothing.
            });
    }

    /**
     * Client must trigger this method when any items
     * are deleted from a list for reports we provide to the client.
     * @param payloadId - The payload ID that we want to acknowledge.
     */
    public markPayloadContentAcknowledged(payloadId: string): void {
        adadaptedApiRequests
            .reportPayloadContentStatus(
                {
                    app_id: this.appId,
                    session_id: this.sessionId!,
                    udid: this.deviceInfo!.udid,
                    tracking: [
                        {
                            payload_id: payloadId,
                            status: PayloadStatus.DELIVERED,
                            event_timestamp: this.getCurrentUnixTimestamp(),
                        },
                    ],
                },
                this.payloadApiEnv,
            )
            .then()
            .catch(() => {
                // Do nothing.
            });
    }

    /**
     * Client must trigger this method when any items
     * are deleted from a list for reports we provide to the client.
     * @param payloadId - The payload ID that we want to acknowledge.
     */
    public markPayloadContentRejected(payloadId: string): void {
        adadaptedApiRequests
            .reportPayloadContentStatus(
                {
                    app_id: this.appId,
                    session_id: this.sessionId!,
                    udid: this.deviceInfo!.udid,
                    tracking: [
                        {
                            payload_id: payloadId,
                            status: PayloadStatus.REJECTED,
                            event_timestamp: this.getCurrentUnixTimestamp(),
                        },
                    ],
                },
                this.payloadApiEnv,
            )
            .then()
            .catch(() => {
                // Do nothing.
            });
    }

    /**
     * Performs all clean up tasks for the SDK. Call this method when
     * the component that references this SDK will "unmount", otherwise you
     * can experience memory leaks.
     */
    public unmount(): void {
        // Nothing acknowledged after this belongs to the session that is ending.
        this.pendingAtlContent.clear();

        // Zones close out first, while the context is still in place. Releasing it
        // beforehand makes reportAdEvent a no-op, which silently swallowed the
        // impression_end and zone_unmounted of every zone still mounted. The web
        // SDK closes its zones before teardown for the same reason.
        notifySdkTeardown();

        // Only then release the context, which stops any zone still mounted from
        // issuing further requests against a torn-down SDK.
        setAdRequestContext(undefined);

        this.removeEventListeners();

        // The session is over, so nothing that identifies it survives. Left in
        // place, the public reporting methods carried on posting under a session
        // the SDK had declared finished - they guard on these being present, not on
        // the SDK still being mounted - and a later initialize() could resume a
        // session that its own start had already replaced.
        this.sessionId = undefined;
        this.deviceInfo = undefined;
        this.keywordIntercepts = undefined;
        this.keywordInterceptSearchValue = "";
        this.hasBeenBackgrounded = false;
    }

    /**
     * Points the ad, list manager and payload backends at one environment.
     *
     * All three are separate hosts with their own production and sandbox tiers, so
     * each has to be derived. The payload environment was previously left at
     * whatever the constructor set and never revisited, which meant a sandbox
     * integration wrote its payload delivery and rejection tracking to production.
     * The list manager environment mapped anything that was not production to
     * sandbox, so the mock environment reached the real sandbox host instead of the
     * local fixtures it exists to serve.
     * @param apiEnv - The environment the caller asked for, if any.
     */
    private resolveApiEnvironments(
        apiEnv: EnvironmentTypes.ApiEnv | undefined,
    ): void {
        // Production unless told otherwise, which is the long-standing default.
        this.apiEnv = apiEnv ?? EnvironmentTypes.ApiEnv.Prod;

        switch (this.apiEnv) {
            case EnvironmentTypes.ApiEnv.Dev:
                this.listManagerApiEnv = EnvironmentTypes.ListManagerApiEnv.Dev;
                this.payloadApiEnv = EnvironmentTypes.PayloadApiEnv.Dev;
                break;

            case EnvironmentTypes.ApiEnv.Mock:
                this.listManagerApiEnv =
                    EnvironmentTypes.ListManagerApiEnv.Mock;
                this.payloadApiEnv = EnvironmentTypes.PayloadApiEnv.Mock;
                break;

            default:
                this.listManagerApiEnv =
                    EnvironmentTypes.ListManagerApiEnv.Prod;
                this.payloadApiEnv = EnvironmentTypes.PayloadApiEnv.Prod;
        }
    }

    /**
     * Removes the app state and deep link listeners, if they are registered.
     *
     * Called before registering as well as on unmount, because only the most
     * recent subscription is tracked: initializing twice without this leaves the
     * earlier listeners attached forever, and every background then reports
     * SESSION_BACKGROUNDED once per leaked listener. StrictMode and Fast Refresh
     * both initialize twice.
     */
    private removeEventListeners(): void {
        if (this.deepLinkOnEventListener) {
            this.deepLinkOnEventListener.remove();

            this.deepLinkOnEventListener = undefined;
        }

        if (this.AppStateOnEventListener) {
            this.AppStateOnEventListener.remove();

            this.AppStateOnEventListener = undefined;
        }
    }
}

// The ad zone component is now part of the public surface: the host app renders
// one per zone it has been allocated, the way AaZoneView is placed in an Android
// layout. It replaces the retired getAdZones() / AdZoneInfo model, which only
// existed because the removed session response happened to carry the zone list.
export { AdZone } from "./components/AdZone";
export type { AdZoneTypes } from "./componentTypes/AdZone";

// Re-exported because the public surface above refers to them: apiEnv on
// InitializeProps, the items handed to onAddToListTriggered and
// onOutOfAppPayloadAvailable, and the device info getDeviceInfo resolves. Without
// these a consumer cannot name the types of the API they are calling without
// reaching into src/, which the example app had to do and which is not covered by
// the published entry point at all.
export { EnvironmentTypes } from "./componentTypes/Environment";
export { DeviceTypes } from "./componentTypes/Device";
export type {
    DetailedListItem,
    OutOfAppDataPayload,
} from "./api/adadaptedApiTypes";
