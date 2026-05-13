#!/bin/sh

DEVICES=$(xcrun simctl list devices available | grep -E '\([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\)')

if [ -z "$DEVICES" ]; then
  echo "No available iOS simulators found."
  exit 1
fi

echo "Available simulators:"
echo "$DEVICES" | awk '{print NR") "$0}'
echo ""
printf "Select a simulator (enter number): "
read CHOICE

SELECTED=$(echo "$DEVICES" | awk "NR==$CHOICE")

if [ -z "$SELECTED" ]; then
  echo "Invalid selection."
  exit 1
fi

UDID=$(echo "$SELECTED" | grep -oE '[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}')

cd ios && \
xcodebuild \
  -workspace AdadaptedReactNativeSdkExample.xcworkspace \
  -scheme AdadaptedReactNativeSdkExample \
  -configuration Debug \
  -sdk iphonesimulator \
  -destination "id=$UDID" \
  -derivedDataPath ~/Library/Developer/Xcode/DerivedData/AdadaptedReactNativeSdkExample \
  build && \
xcrun simctl install "$UDID" ~/Library/Developer/Xcode/DerivedData/AdadaptedReactNativeSdkExample/Build/Products/Debug-iphonesimulator/AdadaptedReactNativeSdkExample.app && \
echo "Booting simulator..." && \
xcrun simctl boot "$UDID" 2>/dev/null || true && \
open -a Simulator && \
xcrun simctl launch "$UDID" org.reactjs.native.AdadaptedReactNativeSdkExample.AdadaptedReactNativeSdkExample
