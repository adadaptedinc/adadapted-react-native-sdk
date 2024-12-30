/**
 * The AdadaptedReactNativeSdk package/module definition.
 */
import * as React from "react";
import {
    DeviceEventEmitter,
    EmitterSubscription,
    Linking,
    NativeModules,
    Platform,
} from "react-native";
import * as adadaptedApiRequests from "./api/adadaptedApiRequests";
import {
    AdSession,
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
    Zone,
} from "./api/adadaptedApiTypes";
import { AdZone } from "./components/AdZone";
import { safeInvoke } from "./util";
import packageJson from "../package.json";
import base64 from "react-native-base64";

/**
 * Enum representing possible device operating systems.
 */
export enum DeviceOS {
    /**
     * Represents the Android operating system.
     */
    ANDROID = "android",
    /**
     * Represents the iOS operating system.
     */
    IOS = "ios",
}

/**
 * Enum defining the different API environments.
 */
export enum ApiEnv {
    /**
     * The production API environment.
     */
    Prod = "https://ads.adadapted.com",
    /**
     * The development API environment.
     */
    Dev = "https://sandbox.adadapted.com",
    /**
     * Used only for unit testing/mock data.
     */
    Mock = "MOCK_DATA",
}

/**
 * Enum defining the different API environments for List Manager.
 */
export enum ListManagerApiEnv {
    /**
     * The production API environment.
     */
    Prod = "https://ec.adadapted.com",
    /**
     * The development API environment.
     */
    Dev = "https://sandec.adadapted.com",
    /**
     * Used only for unit testing/mocking data.
     */
    Mock = "MOCK_DATA",
}

/**
 * Enum defining the different API environments for the Payload Server.
 */
export enum PayloadApiEnv {
    /**
     * The production API environment.
     */
    Prod = "https://payload.adadapted.com",
    /**
     * The development API environment.
     */
    Dev = "https://sandpayload.adadapted.com",
    /**
     * Used only for unit testing/mocking data.
     */
    Mock = "MOCK_DATA",
}

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
    apiEnv?: ApiEnv;
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
     * Callback that gets triggered when the session/zones/ads data
     * gets refreshed and is now available for reference.
     */
    onAdZonesRefreshed?(): void;
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
    /**
     * Ad zones that contain off-screen ads.
     */
    offScreenAdZone?: [number];
}

/**
 * Interface defining properties of a user's Device.
 */
export interface DeviceInfo {
    /**
     * The unique device ID.
     */
    udid: string;
    /**
     * The device name.
     */
    deviceName: string;
    /**
     * The operating system name.
     */
    systemName: string;
    /**
     * The operating system version.
     */
    systemVersion: string;
    /**
     * The device model.
     */
    deviceModel: string;
    /**
     * The device screen width.
     */
    deviceWidth: string;
    /**
     * The device screen height.
     */
    deviceHeight: string;
    /**
     * The device screen density.
     */
    deviceScreenDensity: string;
    /**
     * The current device local.
     */
    deviceLocale: string;
    /**
     * The device carrier name.
     */
    deviceCarrier: string;
    /**
     * The bundle ID.
     */
    bundleId: string;
    /**
     * The bundle version.
     */
    bundleVersion: string;
    /**
     * The current device timezone.
     */
    deviceTimezone: string;
    /**
     * If true, ad tracking is enabled for the device.
     */
    isAdTrackingEnabled: boolean;
}

/**
 * Interface defining a wrapper for an {@link AdZone}.
 */
export interface AdZoneInfo {
    /**
     * The ad zone ID.
     */
    zoneId: string;
    /**
     * The ad zone component.
     */
    adZone: React.JSX.Element;
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
    private apiEnv: ApiEnv;
    /**
     * The API environment to use when making API calls for List Manager.
     */
    private listManagerApiEnv: ListManagerApiEnv;
    /**
     * The API environment to use when making API calls for the Payload server.
     */
    private payloadApiEnv: PayloadApiEnv;
    /**
     * The device operating system.
     */
    private deviceOs: DeviceOS | undefined;
    /**
     * The session ID used for the API to properly identify a user.
     */
    private sessionId: string | undefined;
    /**
     * All device data gathered when "initialize" is called.
     */
    private deviceInfo: DeviceInfo | undefined;
    /**
     * All current Session/Ad info.
     * This info can be refreshed based on the set interval.
     */
    private sessionInfo: AdSession | undefined;
    /**
     * The available ad zones.
     */
    private adZones: AdZoneInfo[] | undefined;
    /**
     * The available off-screen ad zones.
     */
    private offScreenAdZones: AdZoneInfo[] = [];
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
     * If provided, triggers when the overall session/zones/ads data is
     * refreshed and available for reference.
     */
    private onAdZonesRefreshed: () => void | undefined;
    /**
     * The current active "setTimeout" reference. This is needed so we
     * can reference this variable and clean up the timer when its no
     * longer needed so memory leaks do not occur.
     */
    private refreshAdZonesTimer: ReturnType<typeof setTimeout> | undefined;
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
        isExternalPayload?: boolean
    ) => void | undefined;
    /**
     * If provided, triggers when an "add to list"
     * occurs by means of an "out of app" data payload.
     * @param payloads - All payloads the client must go through.
     */
    private onOutOfAppPayloadAvailable: (
        payloads: OutOfAppDataPayload[]
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
     * Track ad zone visibility for off-screen ads.
     */
    private isAdZoneVisible: boolean = true;
    /**
     * Ad zones that contain off-screen ads..
     */
    private offScreenAdZone: [number] | undefined;
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
    public getDeviceInfo(): DeviceInfo | undefined {
        return this.deviceInfo;
    }

    /**
     * Gets the list of available Ad Zones.
     * @returns all available ad zones.
     */
    public getAdZones(): AdZoneInfo[] | undefined {
        return this.adZones;
    }

    /**
     * Gets the list of available off-screen Ad Zones.
     * @returns all available off-screen ad zones.
     */
    public getOffScreenAdZones(): AdZoneInfo[] | undefined {
        return this.offScreenAdZones;
    }

    /**
     * @inheritDoc
     */
    constructor() {
        this.apiEnv = ApiEnv.Prod;
        this.listManagerApiEnv = ListManagerApiEnv.Prod;
        this.payloadApiEnv = PayloadApiEnv.Prod;
        this.onAdZonesRefreshed = () => {
            // Defaulting to empty method.
        };
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
                }
            );
        });
    }

    /**
     * Creates all Ad Zone Info objects based on provided Ad Zones.
     * @param adZones - The object of available zones.
     * @returns the array of Ad Zone Info objects.
     */
    private generateAdZones(adZones: { [key: number]: Zone }): AdZoneInfo[] {
        const adZoneInfoList: AdZoneInfo[] = [];

        for (const adZoneId in adZones) {
            if (Object.prototype.hasOwnProperty.call(adZones, adZoneId)) {
                this.offScreenAdZone?.forEach((zone) => {
                    if (Number(adZones[adZoneId].id) !== zone) {
                        adZoneInfoList.push({
                            zoneId: adZones[adZoneId].id,
                            adZone: (
                                <AdZone
                                    key={adZoneId}
                                    appId={this.appId}
                                    sessionId={this.sessionId!}
                                    udid={this.deviceInfo!.udid}
                                    deviceOs={this.deviceOs!}
                                    apiEnv={this.apiEnv}
                                    xyDragDistanceAllowed={
                                        this.xyAdZoneDragDistanceAllowed || 25
                                    }
                                    adZoneData={adZones[adZoneId]}
                                    onAddToListTriggered={(items) => {
                                        safeInvoke(
                                            this.onAddToListTriggered,
                                            items
                                        );
                                    }}
                                    isAdZoneVisible={true}
                                    offScreenAdZone={false}
                                />
                            ),
                        });
                    }
                });
            }
        }
        return adZoneInfoList;
    }

    /**
     * Creates all off-screen Ad Zone Info objects based on provided off-screen Ad Zones.
     * @param adZones - The object of available zones.
     * @returns the array of off-screen Ad Zone Info objects.
     */
    private generateOffScreenAdZones(adZones: {
        [key: number]: Zone;
    }): AdZoneInfo[] {
        const adZoneInfoList: AdZoneInfo[] = [];

        for (const adZoneId in adZones) {
            if (Object.prototype.hasOwnProperty.call(adZones, adZoneId)) {
                this.offScreenAdZone?.forEach((zone) => {
                    if (Number(adZones[adZoneId].id) === zone) {
                        adZoneInfoList.push({
                            zoneId: adZones[adZoneId].id,
                            adZone: (
                                <AdZone
                                    key={adZoneId}
                                    appId={this.appId}
                                    sessionId={this.sessionId!}
                                    udid={this.deviceInfo!.udid}
                                    deviceOs={this.deviceOs!}
                                    apiEnv={this.apiEnv}
                                    xyDragDistanceAllowed={
                                        this.xyAdZoneDragDistanceAllowed || 25
                                    }
                                    adZoneData={adZones[adZoneId]}
                                    onAddToListTriggered={(items) => {
                                        safeInvoke(
                                            this.onAddToListTriggered,
                                            items
                                        );
                                    }}
                                    isAdZoneVisible={this.isAdZoneVisible}
                                    offScreenAdZone={true}
                                />
                            ),
                        });
                    }
                });
            }
        }
        return adZoneInfoList;
    }

    /**
     * Triggered when session data is initialized or refreshed. Creates
     * a timer based on the session data refresh value.
     */
    private onRefreshAdZones(): void {
        // Get the amount of time we will wait until a refresh occurs.
        // We are setting a minimum refresh time of 5 minutes, so if a
        // value provided by the API is lower, we don't refresh too often.
        const timerMs =
            this.sessionInfo!.polling_interval_ms >= 300000
                ? this.sessionInfo!.polling_interval_ms
                : 300000;

        this.refreshAdZonesTimer = setTimeout(() => {
            adadaptedApiRequests
                .refreshSessionData(
                    {
                        aid: this.appId,
                        sid: this.sessionId!,
                        uid: this.deviceInfo!.udid,
                    },
                    this.deviceOs!,
                    this.apiEnv
                )
                .then((response) => {
                    this.sessionInfo = response.data;
                    this.adZones = this.generateAdZones(response.data.zones);
                    this.offScreenAdZones = this.generateOffScreenAdZones(
                        response.data.zones
                    );

                    // Call the user defined callback indicating
                    // the session data has been refreshed.
                    this.onAdZonesRefreshed();

                    // Start the timer again based on the new session data.
                    this.onRefreshAdZones();
                })
                .catch((err) => {
                    console.error(err);

                    // Start the timer again so we can make another
                    // attempt to refresh the session data.
                    this.onRefreshAdZones();
                });
        }, timerMs);
    }

    /**
     * Trigger an API request to get all possible
     * keyword intercepts for the session.
     */
    private getKeywordIntercepts(): void {
        adadaptedApiRequests
            .getKeywordIntercepts(
                {
                    aid: this.appId,
                    sid: this.sessionId!,
                    uid: this.deviceInfo!.udid,
                },
                this.deviceOs!,
                this.apiEnv
            )
            .then((response) => {
                this.keywordIntercepts = response.data;
            });
    }

    /**
     * Gets the Keyword Intercept Term based on the provided term ID.
     * @param termId - The term ID to get the term object for.
     * @returns the term if it was found based on the provided term ID.
     */
    private getKeywordInterceptTerm(
        termId: string
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
    private getListManagerApiRequestData(
        eventSource: ListManagerEventSource,
        eventName: ListManagerEventName,
        itemNames: string[],
        listName?: string
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
            session_id: this.sessionId!,
            app_id: this.appId,
            udid: this.deviceInfo!.udid,
            events: eventList,
        };
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
            const encodedData: string = event.url.substr(
                `${dataIndex}${searchStr.length}`
            );
            const payloadData = JSON.parse(base64.decode(encodedData));
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
    private handleAppStateChange(state: string): void {
        if (state === "active") {
            this.getPayloadItemData();
        }
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
                this.payloadApiEnv
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
     * Notify the ad zone of visibility status change for off-screen ads.
     * @param isVisible - Ad Zone visibility tracking.
     */
    public onAdZoneVisibilityChanged(isVisible: boolean): void {
        this.isAdZoneVisible = isVisible;
        DeviceEventEmitter.emit("visibility-event", isVisible);
    }

    /**
     * Notify the adZone to send ad interaction report.
     * @param itemName - Detailed list item title from ad that was clicked.
     */
    public acknowledge(itemName: string): void {
        DeviceEventEmitter.emit("acknowledge", itemName);
    }

    /**
     * Initializes the session for the AdAdapted API and sets up the SDK.
     * @param props - The props used to initialize the SDK.
     * @returns a Promise of void.
     */
    public initialize(props: InitializeProps): Promise<void> {
        // Set the app ID.
        this.appId = props.appId;

        // Set the API environment based on the provided override value.
        // If the apiEnv value is not provided, production will be used as default.
        if (props.apiEnv) {
            this.apiEnv = props.apiEnv;
        } else {
            this.apiEnv = ApiEnv.Prod;
        }

        // Base the List Manager API environment off what
        // the user provides for the props.apiEnv value.
        if (props.apiEnv) {
            if (props.apiEnv === ApiEnv.Prod) {
                this.listManagerApiEnv = ListManagerApiEnv.Prod;
            } else {
                this.listManagerApiEnv = ListManagerApiEnv.Dev;
            }
        } else {
            this.listManagerApiEnv = ListManagerApiEnv.Prod;
        }

        // The ad zone touch drag sensitivity setting.
        if (props.xyDragDistanceAllowed) {
            this.xyAdZoneDragDistanceAllowed = props.xyDragDistanceAllowed;
        }

        // If the callback for onAdZonesRefreshed was provided, set it
        // globally for use when the method needs to be triggered.
        if (props.onAdZonesRefreshed) {
            this.onAdZonesRefreshed = props.onAdZonesRefreshed;
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

        // If provided set any off-screen ad zones.
        if (props.offScreenAdZone) {
            this.offScreenAdZone = props.offScreenAdZone;
        }

        return new Promise<void>((resolve, reject) => {
            this.getDeviceInformation()
                .then((deviceInfoObj) => {
                    const deviceInfo = JSON.parse(deviceInfoObj) as DeviceInfo;
                    this.deviceInfo = deviceInfo;
                    this.deviceOs =
                        deviceInfo.systemName === "ios"
                            ? DeviceOS.IOS
                            : DeviceOS.ANDROID;
                    // Pass custom advertiserId - ios only
                    if (Platform.OS === "ios") {
                        if (!(props.advertiserId === undefined)) {
                            deviceInfo.udid = props.advertiserId;
                        }
                    }
                    // Pass device info along with API call
                    adadaptedApiRequests
                        .initializeSession(
                            {
                                app_id: this.appId,
                                udid: deviceInfo.udid,
                                device_udid: deviceInfo.udid,
                                sdk_version: packageJson.version,
                                device_width: parseInt(
                                    deviceInfo.deviceWidth,
                                    10
                                ),
                                device_height: parseInt(
                                    deviceInfo.deviceHeight,
                                    10
                                ),
                                device_density: deviceInfo.deviceScreenDensity,
                                device_carrier: deviceInfo.deviceCarrier,
                                device_name: deviceInfo.deviceName,
                                device_os: deviceInfo.systemName,
                                device_osv: deviceInfo.systemVersion,
                                device_locale: deviceInfo.deviceLocale,
                                device_timezone: deviceInfo.deviceTimezone,
                                bundle_id: deviceInfo.bundleId,
                                bundle_version: deviceInfo.bundleVersion,
                                allow_retargeting:
                                    deviceInfo.isAdTrackingEnabled,
                            },
                            this.deviceOs,
                            this.apiEnv
                        )
                        .then((response) => {
                            NativeModules.AdadaptedReactNativeSdk.storeCurrentSessionId(
                                response.data.session_id
                            );
                            this.sessionId = response.data.session_id;
                            this.sessionInfo = response.data;
                            this.adZones = this.generateAdZones(
                                response.data.zones
                            );
                            this.offScreenAdZones =
                                this.generateOffScreenAdZones(
                                    response.data.zones
                                );

                            // Start the session data refresh timer.
                            this.onRefreshAdZones();

                            // Get all possible keyword intercept values.
                            // We don't need to wait for this to complete
                            // prior to resolving initialization of the SDK.
                            this.getKeywordIntercepts();

                            // Intercept an initial deep link here, if needed.
                            Linking.getInitialURL().then((url) => {
                                if (url) {
                                    // Pass in as an object so it mimics the "url"
                                    // property of the Linking.addEventListener("url") method.
                                    this.handleDeepLink({
                                        url,
                                    });
                                }
                            });

                            // Make the initial call to the Payload data server to see if
                            // the user has any outstanding items to be added to list.
                            this.getPayloadItemData();

                            // Initialize an event listener to intercept deep links while the app is running.
                            this.deepLinkOnEventListener =
                                Linking.addEventListener(
                                    "url",
                                    this.handleDeepLink
                                );

                            // // Initialize an event listener to intercept App state changes.
                            // this.AppStateOnEventListener =
                            //     AppState.addEventListener(
                            //         "change",
                            //         this.handleAppStateChange
                            //     );

                            resolve();
                        })
                        .catch((err) => {
                            reject(err);
                        });
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
        const finalResultListContains: KeywordSearchResult[] = [];

        this.keywordInterceptSearchValue = searchTerm;

        if (!this.deviceInfo || !this.sessionId) {
            console.error("AdAdapted SDK has not been initialized.");
        } else if (!this.keywordIntercepts) {
            console.error("No available keyword intercepts.");
        } else if (
            searchTerm &&
            searchTerm.trim() &&
            searchTerm.trim().length >= this.keywordIntercepts.min_match_length
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
                a.priority > b.priority ? 1 : -1
            );
            finalResultListContains.sort((a, b) =>
                a.priority > b.priority ? 1 : -1
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
                    this.deviceOs!,
                    this.apiEnv
                )
                .then(() => {
                    // Do nothing with the response for now...
                });
        }

        // The returned list will keep all terms found by matching the
        // beginning of the term string at the beginning of the list. All
        // terms found that didn't match the beginning of the string, but
        // still contained the search term will be concatenated to the end
        // of the list.
        return finalResultListStartsWith.concat(finalResultListContains);
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

        if (!this.deviceInfo || !this.sessionId) {
            console.error("AdAdapted SDK has not been initialized.");
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
                    this.deviceOs!,
                    this.apiEnv
                )
                .then(() => {
                    // Do nothing with the response for now...
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

        if (!this.deviceInfo || !this.sessionId) {
            console.error("AdAdapted SDK has not been initialized.");
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
                    this.deviceOs!,
                    this.apiEnv
                )
                .then(() => {
                    // Do nothing with the response for now...
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
        listName?: string
    ): void {
        const requestData = this.getListManagerApiRequestData(
            ListManagerEventSource.APP,
            ListManagerEventName.ADDED_TO_LIST,
            itemNames,
            listName
        );

        adadaptedApiRequests
            .reportListManagerEvents(
                requestData,
                this.deviceOs!,
                this.listManagerApiEnv
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
        listName?: string
    ): void {
        const requestData = this.getListManagerApiRequestData(
            ListManagerEventSource.APP,
            ListManagerEventName.CROSSED_OFF_LIST,
            itemNames,
            listName
        );

        adadaptedApiRequests
            .reportListManagerEvents(
                requestData,
                this.deviceOs!,
                this.listManagerApiEnv
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
        listName?: string
    ): void {
        const requestData = this.getListManagerApiRequestData(
            ListManagerEventSource.APP,
            ListManagerEventName.DELETED_FROM_LIST,
            itemNames,
            listName
        );

        adadaptedApiRequests
            .reportListManagerEvents(
                requestData,
                this.deviceOs!,
                this.listManagerApiEnv
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
                this.payloadApiEnv
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
                this.payloadApiEnv
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
        if (this.refreshAdZonesTimer) {
            clearTimeout(this.refreshAdZonesTimer);
        }

        if (this.deepLinkOnEventListener) {
            this.deepLinkOnEventListener.remove();
        }

        if (this.AppStateOnEventListener) {
            this.AppStateOnEventListener.remove();
        }
    }
}
