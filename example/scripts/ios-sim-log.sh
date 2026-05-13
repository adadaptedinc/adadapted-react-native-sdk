#!/bin/sh

DEVICES=$(xcrun simctl list devices | grep Booted | grep -E '\([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\)')

if [ -z "$DEVICES" ]; then
  echo "No booted iOS simulators found. Run 'npm run ios-sim-boot' first."
  exit 1
fi

echo "Booted simulators:"
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

echo "Streaming logs (Ctrl+C to stop)..."
xcrun simctl spawn "$UDID" log stream --level debug
