// See https://facebook.github.io/react-native/docs/native-modules-android
package com.adadaptedreactnativesdk

import android.util.Log
import org.json.*
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class AdadaptedReactNativeSdkModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "AdadaptedReactNativeSdk"
    }

    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        var finalDeviceData: HashMap<String, Any> = HashMap<String, Any>()

        finalDeviceData.put("udid", "00000000-0000-0000-0000-000000000000")
        finalDeviceData.put("deviceName", "")
        finalDeviceData.put("systemName", "")
        finalDeviceData.put("systemVersion", "")
        finalDeviceData.put("deviceModel", "")
        finalDeviceData.put("identifierForVendor", "")
        finalDeviceData.put("deviceWidth", 1000)
        finalDeviceData.put("deviceHeight", 1000)
        finalDeviceData.put("deviceScreenDensity", "")
        finalDeviceData.put("deviceLocale", "")
        finalDeviceData.put("bundleId", "")
        finalDeviceData.put("bundleVersion", "")
        finalDeviceData.put("deviceTimezone", "")
        finalDeviceData.put("isAdTrackingEnabled", true)

        var finalResult = JSONObject(finalDeviceData).toString()

        Log.d("ReactNative", "MY_MAP" + finalResult)

        // android.os.Build.MODEL
        promise.resolve(finalResult)
    }
}
