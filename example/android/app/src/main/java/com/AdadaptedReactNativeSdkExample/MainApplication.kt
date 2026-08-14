package com.adadaptedreactnativesdkexample;

import android.app.Application
import com.adadaptedreactnativesdk.AdadaptedReactNativeSdkPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  // React Native 0.87 removed the ReactNativeHost / DefaultReactNativeHost
  // pattern. Packages are now passed straight to getDefaultReactHost, and
  // loadReactNative replaces the old SoLoader.init +
  // DefaultNewArchitectureEntryPoint.load pair. New architecture and Hermes
  // are handled by the defaults, so they no longer need overriding here.
  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here.
          add(AdadaptedReactNativeSdkPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
