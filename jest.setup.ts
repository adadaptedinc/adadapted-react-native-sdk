/**
 * Global setup for Jest unit tests.
 * @module
 */
import { NativeModules } from "react-native";
import { DeviceTypes } from "./src/componentTypes/Device";

/**
 * The device info the native bridge resolves, as the JSON string the real one
 * returns. Every test needs it, so it is stubbed once here.
 *
 * Typed rather than a loose literal on purpose. It is JSON.stringify'd, so nothing
 * would otherwise check it against DeviceInfo, and a fixture carrying fields the
 * bridge does not send (or missing ones it does) hides exactly the class of bug
 * where the SDK quietly drops device data from its requests.
 */
const DEVICE_INFO: DeviceTypes.DeviceInfo = {
    udid: "test-udid",
    deviceName: "test-device",
    systemName: "ios_react_native",
    systemVersion: "17.0",
    deviceCarrier: "test-carrier",
    deviceModel: "test-model",
    deviceHeight: "2532",
    deviceWidth: "1170",
    deviceScreenDensity: "3.0",
    deviceLocale: "en-US",
    deviceTimezone: "America/Detroit",
    bundleId: "com.test.app",
    bundleVersion: "1.0",
    isAdTrackingEnabled: true,
};

// Assigned onto NativeModules rather than through jest.mock("react-native").
// Mocking the whole module means spreading it, and React Native's index exposes
// its exports as lazy getters: spreading forces all of them, including DevMenu,
// which throws because no native binary is present.
NativeModules.AdadaptedReactNativeSdk = {
    getDeviceInfo: jest.fn(() => Promise.resolve(JSON.stringify(DEVICE_INFO))),
};

// The WebView renders a native view with no Jest equivalent. Rendering a plain
// View keeps the tree inspectable, so a test can assert which creative a zone is
// showing by the source it was handed.
jest.mock("react-native-webview", () => ({
    WebView: jest.requireActual("react-native").View,
}));
