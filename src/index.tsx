/**
 * The AdadaptedReactNativeSdk package/module definition.
 */
import { NativeModules } from "react-native";
import * as adadaptedApiRequests from "./api/adadaptedApiRequests";
import { ApiEnv, DeviceInfo, DeviceOS } from "./types";

export class AdadaptedReactNativeSdk {
    /**
     * The API environment to use when making API calls.
     */
    private apiEnv: ApiEnv;

    /**
     * The session ID used for the API to properly identify a user.
     */
    private sessionId: string | undefined;

    /**
     * Gets the Session ID.
     * @returns the Session ID.
     */
    public getSessionId(): string | undefined {
        return this.sessionId;
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
    private getDeviceInfo(): Promise<string> {
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
            this.getDeviceInfo()
                .then((deviceInfoObj) => {
                    // TODO: fix iOS to send back a json string as a result for this device/native call.
                    // const deviceInfoJson = JSON.stringify(deviceInfoObj);
                    const deviceInfo = JSON.parse(deviceInfoObj) as DeviceInfo;
                    let deviceOs = DeviceOS.ANDROID;

                    if (
                        deviceInfo.systemName.toLowerCase() === "ios" ||
                        deviceInfo.systemName.toLowerCase() === "iphone os"
                    ) {
                        deviceOs = DeviceOS.IOS;
                    }

                    // Pass device info along with API call
                    adadaptedApiRequests
                        .initializeSession(
                            {
                                app_id: appId,
                                udid: deviceInfo.udid,
                                device_width: parseInt(deviceInfo.deviceWidth),
                                device_height: parseInt(
                                    deviceInfo.deviceHeight
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
                            deviceOs,
                            this.apiEnv
                        )
                        .then((response) => {
                            // @ts-ignore
                            this.sessionId = response.data.session_id;

                            console.log(response);
                            resolve();
                        })
                        .catch((err) => {
                            console.log(err.response.request._response);
                            reject(err);
                        });
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }
}
