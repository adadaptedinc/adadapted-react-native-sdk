# AdAdapted React Native SDK / Example App

All commands below are run from the `/example` directory unless noted otherwise.

## Installing Dependencies

Install the NPM packages:

```bash
npm install
```

**iOS only** — install the CocoaPods dependencies. This project uses Bundler to pin the CocoaPods version, so install the gems first, then the pods:

```bash
bundle install                 # first time only
bundle exec pod install --project-directory=ios
```

(Alternatively, from the repository root you can run `npm run example-app-install-pods`, which runs `pod install` in `example/ios` using whatever CocoaPods is on your PATH.)

## Starting The App Server

Start the Metro bundler and leave it running in its own terminal tab:

```bash
npm start
```

This runs `react-native start --reset-cache`. The `--reset-cache` flag makes sure no stale cached files are served.

## Running Emulators

With Metro running (`npm start`), open a **new** terminal tab in `/example` and launch the app using one of the platform workflows below.

**NOTE:** _You can run both the iOS and Android emulators at the same time — just launch each from its own terminal tab._

### iOS

**NOTE:** _You must have Xcode installed in order to run the iOS emulator. You can download Xcode [here](https://developer.apple.com/xcode/resources/)._

**Daily workflow** (app already installed on simulator):

```bash
# Terminal 1 — keep running
npm start

# Terminal 2 — boot simulator (if not already running), then launch the app
npm run ios-sim-boot
npm run ios-sim-launch
```

**After native code changes** (full rebuild required):

```bash
# Terminal 1 — keep running
npm start

# Terminal 2
npm run ios-sim-build
```

| Script | What it does |
|--------|-------------|
| `npm run ios-sim-boot` | Prompts for a simulator to boot and opens the Simulator app |
| `npm run ios-sim-launch` | Prompts for a booted simulator and launches the app on it |
| `npm run ios-sim-build` | Prompts for a simulator, then does a full rebuild — builds, installs, and launches (takes a few minutes) |
| `npm run ios-sim-log` | Prompts for a booted simulator and streams its logs to the terminal (Ctrl+C to stop) |

---

### Android

Start an Android emulator first (launch one from Android Studio's Device Manager, or run a booted device), then run:

```bash
# Terminal 1 — keep running
npm start

# Terminal 2 — builds, installs, and launches the app on the running emulator
npm run run-android
```

The initial build may take a minute or two to complete. To stream the device logs in another tab:

```bash
npm run log-android
```

Both scripts set `JAVA_HOME` to your installed Java 21 (`/usr/libexec/java_home -v 21`) and point `ANDROID_HOME` at `$HOME/Library/Android/sdk` before invoking `react-native`, so you don't need those environment variables exported globally.

| Script | What it does |
|--------|-------------|
| `npm run run-android` | Builds, installs, and launches the app on the running Android emulator |
| `npm run log-android` | Streams the Android device logs to the terminal (Ctrl+C to stop) |

**NOTE:** _You must have Android Studio installed and set up in order to run the Android emulator. You can download Android Studio [here](https://developer.android.com/studio). You also need Java 21 installed; the `run-android`/`log-android` scripts expect it at the path returned by `/usr/libexec/java_home -v 21`._

---

### Testing Deep Links

To quickly test deep links, you can use `uri-scheme` directly from the `/example` root folder in your console.

Close the app that's running in the emulator and then run the following to open the app using the deeplink:

For running in Android, run the following:
```shell
npx uri-scheme open "example://adadapted.com/addit_add_list_items?data=eyJwYXlsb2FkX2lkIjoiVEVTVF9QQVlMT0FEX0lEIiwicGF5bG9hZF9tZXNzYWdlIjoiU2luZ2xlIFNhbXBsZSBQcm9kdWN0IiwicGF5bG9hZF9pbWFnZSI6IjIwMTkwMTIyXzIwNTA0MV90ZXN0X2ltYWdlXzIucG5nIiwiY2FtcGFpZ25faWQiOiIxMjMiLCJhcHBfaWQiOiJleGFtcGxlIiwiZXhwaXJlX3NlY29uZHMiOjYwNDgwMCwiZGV0YWlsZWRfbGlzdF9pdGVtcyI6W3sidHJhY2tpbmdfaWQiOiJ0cmFja2luZ19pZF8xIiwicHJvZHVjdF90aXRsZSI6IlNpbmdsZSBTYW1wbGUgUHJvZHVjdCIsInByb2R1Y3RfYnJhbmQiOiJTYW1wbGUgQnJhbmQiLCJwcm9kdWN0X2NhdGVnb3J5IjoiIiwicHJvZHVjdF9iYXJjb2RlIjoiMDEyMzQiLCJwcm9kdWN0X3NrdSI6IjU2Nzg5IiwicHJvZHVjdF9kaXNjb3VudCI6IiIsInByb2R1Y3RfaW1hZ2UiOiJodHRwczovL2ltYWdlcy5hZGFkYXB0ZWQuY29tLzIwMTkwMTIyXzIwNTA0MV90ZXN0X2ltYWdlXzIucG5nIn1dfQ==" --android
```

For running in iOS, run the following:
```shell
npx uri-scheme open "example://adadapted.com/addit_add_list_items?data=eyJwYXlsb2FkX2lkIjoiVEVTVF9QQVlMT0FEX0lEIiwicGF5bG9hZF9tZXNzYWdlIjoiU2luZ2xlIFNhbXBsZSBQcm9kdWN0IiwicGF5bG9hZF9pbWFnZSI6IjIwMTkwMTIyXzIwNTA0MV90ZXN0X2ltYWdlXzIucG5nIiwiY2FtcGFpZ25faWQiOiIxMjMiLCJhcHBfaWQiOiJleGFtcGxlIiwiZXhwaXJlX3NlY29uZHMiOjYwNDgwMCwiZGV0YWlsZWRfbGlzdF9pdGVtcyI6W3sidHJhY2tpbmdfaWQiOiJ0cmFja2luZ19pZF8xIiwicHJvZHVjdF90aXRsZSI6IlNpbmdsZSBTYW1wbGUgUHJvZHVjdCIsInByb2R1Y3RfYnJhbmQiOiJTYW1wbGUgQnJhbmQiLCJwcm9kdWN0X2NhdGVnb3J5IjoiIiwicHJvZHVjdF9iYXJjb2RlIjoiMDEyMzQiLCJwcm9kdWN0X3NrdSI6IjU2Nzg5IiwicHJvZHVjdF9kaXNjb3VudCI6IiIsInByb2R1Y3RfaW1hZ2UiOiJodHRwczovL2ltYWdlcy5hZGFkYXB0ZWQuY29tLzIwMTkwMTIyXzIwNTA0MV90ZXN0X2ltYWdlXzIucG5nIn1dfQ==" --ios
```
