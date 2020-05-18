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
