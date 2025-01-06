// See https://facebook.github.io/react-native/docs/native-modules-android
package com.adadaptedreactnativesdk;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.util.DisplayMetrics;
import android.util.Log;
import org.json.*;
import java.io.IOException;
import java.util.Locale;
import java.util.TimeZone;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Promise;
import com.google.android.gms.ads.identifier.AdvertisingIdClient;
import android.telephony.TelephonyManager;
import android.content.Context;

class AdadaptedReactNativeSdkModule(private val _reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(_reactContext) {
    private val reactContext = _reactContext;

    private val tag: String = "ReactNative";
    private val unknownValue: String = "Unknown";

    override fun getName(): String {
        return "AdadaptedReactNativeSdk";
    }

    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        val deviceDisplayMetrics: DisplayMetrics = reactContext.resources.displayMetrics;
        var gaidInfo: AdvertisingIdClient.Info? = null;
        var bundleVersion: String;
        var deviceCarrier: String = "n/a";
        var gaid: String = "";
        var adTrackingEnabled: Boolean = false;

        val mTelephonyMgr: TelephonyManager = reactContext.getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager;

        if (mTelephonyMgr.networkOperatorName != null) {
            deviceCarrier = mTelephonyMgr.networkOperatorName;
        }

        try {
            gaidInfo = AdvertisingIdClient.getAdvertisingIdInfo(reactContext);
        }
        catch (ex: IOException) {
            logGaidException();
        }

        try {
            val packageInfo: PackageInfo = reactContext.packageManager.getPackageInfo(reactContext.packageName, 0);

          bundleVersion = packageInfo.versionName
        }
        catch(ex: PackageManager.NameNotFoundException) {
            bundleVersion = unknownValue;
        }

        if (gaidInfo != null) {
            gaid = gaidInfo.id!!;
            adTrackingEnabled = !gaidInfo.isLimitAdTrackingEnabled;
        }

      val deviceWidth: Int = deviceDisplayMetrics.widthPixels;
      val deviceHeight: Int = deviceDisplayMetrics.heightPixels;
      val deviceDensity: String = deviceDisplayMetrics.density.toString();

      // Create the HashMap that will be turned into a final JSON result.
      val finalDeviceData: HashMap<String, Any> = HashMap<String, Any>();

      finalDeviceData["udid"] = gaid;
      finalDeviceData["deviceName"] = android.os.Build.DEVICE;
      finalDeviceData["systemName"] = "android";
      finalDeviceData["systemVersion"] = android.os.Build.VERSION.RELEASE;
      finalDeviceData["deviceCarrier"] = deviceCarrier;
      finalDeviceData["deviceModel"] = android.os.Build.MODEL;
      finalDeviceData["deviceWidth"] = deviceWidth;
      finalDeviceData["deviceHeight"] = deviceHeight;
      finalDeviceData["deviceScreenDensity"] = deviceDensity;
      finalDeviceData["deviceLocale"] = Locale.getDefault().toString();
      finalDeviceData["bundleId"] = reactContext.packageName;
      finalDeviceData["bundleVersion"] = bundleVersion;
      finalDeviceData["deviceTimezone"] = TimeZone.getDefault().id;
      finalDeviceData["isAdTrackingEnabled"] = adTrackingEnabled;

      promise.resolve((finalDeviceData as Map<*, *>?)?.let { JSONObject(it).toString() });
    }

    private fun logGaidException() {
        Log.w(tag, "Problem retrieving Google Play Advertiser Info");
        Log.w(tag, "GAID_UNAVAILABLE");
    }

    @ReactMethod
    fun storeCurrentSessionId(sessionId: String) {
        // noop
    }
}
