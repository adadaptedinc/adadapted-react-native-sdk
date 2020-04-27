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
         */
        public getAdZones(): AdZoneInfo[] | undefined {
            return this.adZones;
        }

        /**
         * @inheritDoc
         */
        constructor() {
            this.apiEnv = ApiEnv.Prod;
            this.onAdZonesRefreshed = () => {};

            this.initialize = this.initialize.bind(this);
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
         * @params adZones - The object of available zones.
         * @returns the array of Ad Zone Info objects.
         */
        private generateAdZones(adZones: {
            [key: number]: adadaptedApiTypes.models.Zone;
        }): AdZoneInfo[] {
            const adZoneInfoList: AdZoneInfo[] = [];

            for (const adZoneId in adZones) {
                adZoneInfoList.push({
                    zoneId: adZones[adZoneId].id,
                    adZone: (
                        <AdZone key={adZoneId} adZoneData={adZones[adZoneId]} />
                    )
                });
            }

            return adZoneInfoList;
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

                                this.onRefreshAdZones();

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

        public onRefreshAdZones(): void {
            setTimeout(() => {
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
                        console.log("zone data refreshed");
                        this.onRefreshAdZones();
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }, this.sessionInfo!.polling_interval_ms);
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
}
