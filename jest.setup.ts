/**
 * Global setup for Jest unit tests.
 * @module
 */
import { NativeModules } from "react-native";

/**
 * The device info the native bridge resolves, as the JSON string the real one
 * returns. Every test needs it, so it is stubbed once here.
 */
const DEVICE_INFO = {
    udid: "test-udid",
    deviceName: "test-device",
    systemName: "ios_react_native",
    systemVersion: "17.0",
    deviceCarrier: "test-carrier",
    deviceHeight: 2532,
    deviceWidth: 1170,
    deviceScreenCustom: "3.0",
    bundleId: "com.test.app",
    bundleVersion: "1.0",
    allowRetargeting: true,
    isAdTrackingEnabled: true,
    deviceLocale: "en-US",
    deviceUTCOffset: "-0500",
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
