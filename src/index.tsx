/**
 * The AdadaptedReactNativeSdk package/module definition.
 */
import { NativeModules } from "react-native";
import * as adadaptedApiRequests from "./api/adadaptedApiRequests";
import { ApiEnv, DeviceInfo, DeviceOS } from "./types";
import { adadaptedApiTypes } from "./api/adadaptedApiTypes";

/**
 * Class that acts as the AdAdapted SDK for react-native.
 */
export class AdadaptedReactNativeSdk {
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
     * Gets the Session ID.
     * @returns the Session ID.
     */
    public getSessionId(): string | undefined {
        return this.sessionId;
    }

    /**
     * Gets the Device OS.
     * @returns the Device OS.
     */
    public getDeviceOs(): string | undefined {
        return this.deviceOs;
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
    public getSessionInfo(): adadaptedApiTypes.models.AdSession | undefined {
        return this.sessionInfo;
    }

    /**
     * @inheritDoc
     */
    constructor() {
        this.apiEnv = ApiEnv.Prod;

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
     * Initializes the session for the AdAdapted API.
     * @param appId - The ID of the client app.
     * @param apiEnv - The API environment to use for API calls.
     *      This will default to production if not directly set.
     * @returns a Promise of void.
     */
    public initialize(appId: string, apiEnv?: ApiEnv): Promise<void> {
        // Set the API environment based on the provided override value.
        // If the apiEnv value is not provided, production will be used as default.
        if (apiEnv) {
            this.apiEnv = apiEnv;
        } else {
            this.apiEnv = ApiEnv.Prod;
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

                    // Pass device info along with API call
                    adadaptedApiRequests
                        .initializeSession(
                            {
                                app_id: appId,
                                udid: deviceInfo.udid,
                                device_width: parseInt(
                                    deviceInfo.deviceWidth,
                                    10
                                ),
                                device_height: parseInt(
                                    deviceInfo.deviceHeight,
                                    10
                                ),
                                device_density: deviceInfo.deviceScreenDensity,
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
}
