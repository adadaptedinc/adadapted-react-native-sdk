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
import com.google.android.gms.common.GooglePlayServicesNotAvailableException;
import com.google.android.gms.common.GooglePlayServicesRepairableException;

class AdadaptedReactNativeSdkModule(val _reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(_reactContext) {
    val reactContext = _reactContext;

    val TAG: String = "ReactNative";
    val UNKNOWN_VALUE: String = "Unknown";

    override fun getName(): String {
        return "AdadaptedReactNativeSdk";
    }

    @ReactMethod
    fun getDeviceInfo(promise: Promise) {
        val deviceDisplayMetrics: DisplayMetrics = reactContext.getResources().getDisplayMetrics();
        var gaidInfo: AdvertisingIdClient.Info? = null;
        var bundleVersion: String = UNKNOWN_VALUE;
        var deviceWidth: Int = 0;
        var deviceHeight: Int = 0;
        var deviceDensity: String = "";
        var gaid: String = "";
        var adTrackingEnabled: Boolean = false;

        try {
            gaidInfo = AdvertisingIdClient.getAdvertisingIdInfo(reactContext);
        }
        catch (ex: GooglePlayServicesNotAvailableException) {
            logGaidException();
        }
        catch (ex: GooglePlayServicesRepairableException) {
            logGaidException();
        }
        catch (ex: IOException) {
            logGaidException();
        }

        try {
            val packageInfo: PackageInfo = reactContext.getPackageManager().getPackageInfo(reactContext.getPackageName(), 0);

            if (packageInfo != null) {
                bundleVersion = packageInfo.versionName;
            }
        }
        catch(ex: PackageManager.NameNotFoundException) {
            bundleVersion = UNKNOWN_VALUE;
        }

        if (gaidInfo != null) {
            gaid = gaidInfo.getId();
            adTrackingEnabled = !gaidInfo.isLimitAdTrackingEnabled();
        }

        if (deviceDisplayMetrics != null) {
            deviceWidth = deviceDisplayMetrics.widthPixels;
            deviceHeight = deviceDisplayMetrics.heightPixels;
            deviceDensity = deviceDisplayMetrics.density.toString();
        }

        // Create the HashMap that will be turned into a final JSON result.
        var finalDeviceData: HashMap<String, Any> = HashMap<String, Any>();

        finalDeviceData.put("udid", gaid);
        finalDeviceData.put("deviceName", android.os.Build.DEVICE);
        finalDeviceData.put("systemName", "android");
        finalDeviceData.put("systemVersion", android.os.Build.VERSION.RELEASE);
        finalDeviceData.put("deviceModel", android.os.Build.MODEL);
        finalDeviceData.put("deviceWidth", deviceWidth);
        finalDeviceData.put("deviceHeight", deviceHeight);
        finalDeviceData.put("deviceScreenDensity", deviceDensity);
        finalDeviceData.put("deviceLocale", Locale.getDefault().toString());
        finalDeviceData.put("bundleId", reactContext.getPackageName());
        finalDeviceData.put("bundleVersion", bundleVersion);
        finalDeviceData.put("deviceTimezone", TimeZone.getDefault().getID());
        finalDeviceData.put("isAdTrackingEnabled", adTrackingEnabled);

        promise.resolve(JSONObject(finalDeviceData).toString());
    }

    fun logGaidException() {
        Log.w(TAG, "Problem retrieving Google Play Advertiser Info");
        Log.w(TAG, "GAID_UNAVAILABLE");
    }
}
