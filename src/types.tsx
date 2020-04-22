import * as React from "react";

/**
 * A type that can be null or undefined.
 */
export type nil = null | undefined;

/**
 * Extracts the type of a React component's props from the React component type T.
 * Usage example: type MyComponentProps = ExtractReactPropsType<typeof MyComponent>;
 */
export type ExtractReactPropsType<T> = T extends React.ComponentType<infer P>
    ? P
    : T extends React.Component<infer P>
    ? P
    : never;

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
     * The vendor UUID.
     */
    identifierForVendor: string;
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
