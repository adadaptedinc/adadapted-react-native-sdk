/**
 * The AdadaptedReactNativeSdk package/module definition.
 */
import * as React from "react";
import { NativeModules } from "react-native";
import * as adadaptedApiRequests from "./api/adadaptedApiRequests";
import { adadaptedApiTypes } from "./api/adadaptedApiTypes";
import { AdZone } from "./components/AdZone";

/**
 * Class that acts as the AdAdapted SDK for react-native.
 */
export namespace AdadaptedReactNativeSdk {
    /**
     * The main content of the react-native SDK.
     */
    export class Sdk {
        /**
         * The client app ID used to send to API endpoints.
         */
        private appId: string = "";
        /**
         * The API environment to use when making API calls.
         */
        private apiEnv: ApiEnv;
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
        private sessionInfo: adadaptedApiTypes.models.AdSession | undefined;
        /**
         * The available ad zones.
         */
        private adZones: AdZoneInfo[] | undefined;
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
        private keywordIntercepts:
            | adadaptedApiTypes.models.KeywordIntercepts
            | undefined;

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
         * Gets the Ad Session Info object.
         * @returns the Ad Session Info object.
         */
        public getSessionInfo():
            | adadaptedApiTypes.models.AdSession
            | undefined {
            return this.sessionInfo;
        }

        /**
         * Gets the list of available Ad Zones.
         * @returns all available ad zones.
         */
        public getAdZones(): AdZoneInfo[] | undefined {
            return this.adZones;
        }

        /**
         * @inheritDoc
         */
        constructor() {
            this.apiEnv = ApiEnv.Prod;
            this.onAdZonesRefreshed = () => {
                // Defaulting to empty method.
            };
            this.keywordInterceptSearchValue = "";

            this.initialize = this.initialize.bind(this);
            this.unmount = this.unmount.bind(this);
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
        private generateAdZones(adZones: {
            [key: number]: adadaptedApiTypes.models.Zone;
        }): AdZoneInfo[] {
            const adZoneInfoList: AdZoneInfo[] = [];

            for (const adZoneId in adZones) {
                if (adZones.hasOwnProperty(adZoneId)) {
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
                                adZoneData={adZones[adZoneId]}
                            />
                        )
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
                            uid: this.deviceInfo!.udid
                        },
                        this.deviceOs!,
                        this.apiEnv
                    )
                    .then((response) => {
                        this.sessionInfo = response.data;
                        this.adZones = this.generateAdZones(
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
                        uid: this.deviceInfo!.udid
                    },
                    this.deviceOs!,
                    this.apiEnv
                )
                .then((response) => {
                    this.keywordIntercepts = response.data;

                    this.performKeywordSearch("mil");
                });
        }

        /**
         * Gets the Keyword Intercept Term based on the provided term ID.
         * @param termId - The term ID to get the term object for.
         * @returns the term if it was found based on the provided term ID.
         */
        private getKeywordInterceptTerm(
            termId: string
        ): adadaptedApiTypes.models.KeywordSearchTerm | undefined {
            let term: adadaptedApiTypes.models.KeywordSearchTerm | undefined;

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

            // If the callback for onAdZonesRefreshed was provided, set it
            // globally for use when the method needs to be triggered.
            if (props.onAdZonesRefreshed) {
                this.onAdZonesRefreshed = props.onAdZonesRefreshed;
            }

            return new Promise<void>((resolve, reject) => {
                this.getDeviceInformation()
                    .then((deviceInfoObj) => {
                        const deviceInfo = JSON.parse(
                            deviceInfoObj
                        ) as DeviceInfo;
                        this.deviceInfo = deviceInfo;
                        this.deviceOs =
                            deviceInfo.systemName === "ios"
                                ? DeviceOS.IOS
                                : DeviceOS.ANDROID;

                        // Pass device info along with API call
                        adadaptedApiRequests
                            .initializeSession(
                                {
                                    app_id: this.appId,
                                    udid: deviceInfo.udid,
                                    device_width: parseInt(
                                        deviceInfo.deviceWidth,
                                        10
                                    ),
                                    device_height: parseInt(
                                        deviceInfo.deviceHeight,
                                        10
                                    ),
                                    device_density:
                                        deviceInfo.deviceScreenDensity,
                                    device_name: deviceInfo.deviceName,
                                    device_os: deviceInfo.systemName,
                                    device_osv: deviceInfo.systemVersion,
                                    device_locale: deviceInfo.deviceLocale,
                                    device_timezone: deviceInfo.deviceTimezone,
                                    bundle_id: deviceInfo.bundleId,
                                    bundle_version: deviceInfo.bundleVersion,
                                    allow_retargeting:
                                        deviceInfo.isAdTrackingEnabled
                                },
                                this.deviceOs,
                                this.apiEnv
                            )
                            .then((response) => {
                                this.sessionId = response.data.session_id;
                                this.sessionInfo = response.data;
                                this.adZones = this.generateAdZones(
                                    response.data.zones
                                );

                                console.log(JSON.stringify(response.data));

                                // Start the session data refresh timer.
                                this.onRefreshAdZones();

                                // Get all possible keyword intercept values.
                                // We don't need to wait for this to complete
                                // prior to resolving initialization of the SDK.
                                this.getKeywordIntercepts();

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
         * Searches through available ad keywords and
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
                searchTerm.trim().length >=
                    this.keywordIntercepts.min_match_length
            ) {
                searchTerm = searchTerm.trim();

                const finalEventsList: adadaptedApiTypes.models.ReportedInterceptEvent[] = [];
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
                    } else if (
                        termObj.term
                            .toLowerCase()
                            .indexOf(searchTerm.toLowerCase()) !== -1
                    ) {
                        // If the term din't start with the search term, but
                        // still contains the search term, add it to the
                        // finalResultListContains list.
                        finalResultListContains.push(termObj);
                    }

                    if (
                        termObj.term
                            .toLowerCase()
                            .startsWith(searchTerm.toLowerCase()) ||
                        termObj.term
                            .toLowerCase()
                            .indexOf(searchTerm.toLowerCase()) !== -1
                    ) {
                        // Add the event to the list so we can report the
                        // "matched" event for this term.
                        finalEventsList.push({
                            term_id: termObj.term_id,
                            search_id: this.keywordIntercepts.search_id,
                            user_input: this.keywordInterceptSearchValue,
                            term: termObj.term,
                            event_type:
                                adadaptedApiTypes.models.ReportedEventType
                                    .MATCHED,
                            created_at: currentTs
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
                        event_type:
                            adadaptedApiTypes.models.ReportedEventType
                                .NOT_MATCHED,
                        created_at: currentTs
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
                            events: finalEventsList
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
                                    user_input: this
                                        .keywordInterceptSearchValue,
                                    term: termObj.term,
                                    event_type:
                                        adadaptedApiTypes.models
                                            .ReportedEventType.SELECTED,
                                    created_at: this.getCurrentUnixTimestamp()
                                }
                            ]
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
         * @param terms - The term IDs list to trigger the event for.
         */
        public reportKeywordInterceptTermsPresented(terms: string[]): void {
            const termObjs: adadaptedApiTypes.models.KeywordSearchTerm[] = [];

            for (const termId of terms) {
                const termObj = this.getKeywordInterceptTerm(termId);

                if (termObj) {
                    termObjs.push(termObj);
                }
            }

            if (!this.deviceInfo || !this.sessionId) {
                console.error("AdAdapted SDK has not been initialized.");
            } else if (!this.keywordIntercepts) {
                console.error("No available keyword intercepts.");
            } else if (!terms || terms.length === 0 || termObjs.length === 0) {
                console.error("Invalid or empty terms ID list provided.");
            } else {
                const termEvents: adadaptedApiTypes.models.ReportedInterceptEvent[] = [];
                const currentTs = this.getCurrentUnixTimestamp();

                for (const termObj of termObjs) {
                    termEvents.push({
                        term_id: termObj.term_id,
                        search_id: this.keywordIntercepts.search_id,
                        user_input: this.keywordInterceptSearchValue,
                        term: termObj.term,
                        event_type:
                            adadaptedApiTypes.models.ReportedEventType
                                .PRESENTED,
                        created_at: currentTs
                    });
                }

                adadaptedApiRequests
                    .reportInterceptEvent(
                        {
                            app_id: this.appId,
                            udid: this.deviceInfo.udid,
                            session_id: this.sessionId,
                            events: termEvents
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
         * Performs all clean up tasks for the SDK. Call this method when
         * the component that references this SDK will "unmount", otherwise you
         * can experience memory leaks.
         */
        public unmount(): void {
            if (this.refreshAdZonesTimer) {
                clearTimeout(this.refreshAdZonesTimer);
            }
        }
    }

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
        IOS = "ios"
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
         * Used only for unit testing/mocking data.
         */
        Mock = "MOCK_DATA"
    }

    /**
     * Interface defining inputs to the {@link Sdk.initialize} method.
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
         * Callback that gets triggered when the session/zones/ads data
         * gets refreshed and is now available for reference.
         */
        onAdZonesRefreshed?(): void;
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
        adZone: JSX.Element;
    }

    /**
     * Interface defining a keyword search result.
     * This is primarily used to export an interface directly from
     * {@link AdadaptedReactNativeSdk} so the interaction with the SDK all be
     * done through this namespace.
     */
    export interface KeywordSearchResult
        extends adadaptedApiTypes.models.KeywordSearchTerm {}
}
