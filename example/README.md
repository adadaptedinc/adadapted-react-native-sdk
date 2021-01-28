# AdAdapted React Native SDK / Example App

Start by installing all NPM packages. From your console and within the `/example` directory run the following command:

## Installing Dependencies

```javascript
npm install
```

---

Next, from your console, navigate to the `/example/ios` directory and make sure all pod files are installed by running the following command:

```javascript
pod install
```

## Starting The App Server

Now, from the `/example` directory, start the react-native app server by running the following command:

```javascript
react-native start --reset-cache
```

Including the `--reset-cache` will make sure there are not any cached files being served when the app server is ran.

## Running Emulators

Once the react-native app server is running, we need to open a new console tab and once again navigate to the `/example` directory. From here, we will start the application using one of the two approaches below.

**NOTE:** _You can run both emulators at the same time, you just need to make sure you do so from two separate console tabs._

### iOS

Run the following command:

```javascript
react-native run-ios
```

This will run the test application within the iOS emulator once it has finished building (might take a minute or two in order to complete the initial build).

**NOTE:** _You must have Xcode installed in order to run the iOS emulator. You can download Xcode [here](https://developer.apple.com/xcode/resources/)._

---

### Android

Run the following command:

```javascript
react-native run-android
```

This will run the test application within the Android emulator once it has finished building (might take a minute or two in order to complete the initial build).

**NOTE:** _You must have Android Studio installed and setup in order to run the iOS emulator. You can download Android Studio [here](https://developer.android.com/studio). You will also need to have Java installed as well and can download it [here](https://www.oracle.com/java/technologies/javase-downloads.html)._

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
