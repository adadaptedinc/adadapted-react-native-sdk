# AdAdapted React Native SDK

Allows for use of the AdAdapted SDK through react-native.

## Features

-   Ad zone creation
-   In-app ad display popup/browser
-   In-list add suggestion based on available keywords
-   Event tracking enabling reporting
-   Supported ad types:
    -   Add to list (reports a product to add to a list)
    -   Add to list circular (opens in-app within a popup view and displays a multi-item "add to list" circular)
    -   Standard external link (opens in external browser)
    -   Popup external link (opens in-app within popup view)

## Installation

```
npm install --save adadapted-react-native-sdk
```

## Usage

## Available Methods

### initialize()

The initialize method is where your SDK session is created. This method returns a promise that when completed, you will have a valid SDK session going forward and will be able to use other SDK methods. You should call this method from within the `componentDidMount()` react lifecycle method to ensure it is only called once upon component mount.

```javascript
aaSdk.initialize({
    /**
     * The app ID provided to you by AdAdapted.
     */
    appId: string,
    /**
     * (Optional)
     * Triggered when the available ad zones have
     * refreshed their data with the AdAdapted API.
     * Indicates that you can now pull the updated
     * ad zones from the SDK to update your state with.
     * NOTE: See the "Available Callbacks" section below for further details.
     */
    onAdZonesRefreshed(() => {}),
    /**
     * (Optional)
     * Triggered when an "add to list" action has taken
     * place by a user. An "items" list will be provided
     * with each item in the list representing an item
     * the user selected to add to their list from an ad.
     * NOTE: See the "Available Callbacks" section below for further details.
     */
    onAddToListTriggered((items[]) => {})
})
```

**Return Type:**

```
Promise<void>
```

### unmount()

This method will ensure the SDK is cleaned up when the component it is defined within is being destroyed. This method must be called within the `componentWillUnmount()` react lifecycle method. If you do not call this method, you risk creating a memory leak.

```javascript
aaSdk.unmount();
```

**Return Type:**

```
void
```

### getSessionId()

Once the SDK is initialized, this method returns the current session ID.

```javascript
aaSdk.getSessionId();
```

**Return Type:**

```
string
```

### getDeviceInfo()

Once the SDK is initialized, this method exposes device information based on the users current device.

```javascript
aaSdk.getDeviceInfo();
```

**Return Type:**

```javascript
{
    /**
     * The unique device ID.
     */
    udid: string;
    /**
     * The device name.
     */
    deviceName: string;
    /**
     * The operating system name.
     */
    systemName: string;
    /**
     * The operating system version.
     */
    systemVersion: string;
    /**
     * The device model.
     */
    deviceModel: string;
    /**
     * The device screen width.
     */
    deviceWidth: string;
    /**
     * The device screen height.
     */
    deviceHeight: string;
    /**
     * The device screen density.
     */
    deviceScreenDensity: string;
    /**
     * The current device local.
     */
    deviceLocale: string;
    /**
     * The bundle ID.
     */
    bundleId: string;
    /**
     * The bundle version.
     */
    bundleVersion: string;
    /**
     * The current device timezone.
     */
    deviceTimezone: string;
    /**
     * If true, ad tracking is enabled for the device.
     */
    isAdTrackingEnabled: boolean;
}
```

### getAdZones()

Once the SDK is initialized, this method gets all available ad zones that can be used. The resulting array of ad zone objects each contain a property called `adZone` which is a react-native component that manages all ad related operations for the ad zone. All you need to do with these components is to display them in the locations you would like the ads displayed in your app.

```javascript
aaSdk.getAdZones();
```

**Return Type:**

```javascript
[
    {
        /**
         * The ad zone ID.
         */
        zoneId: string;
        /**
         * The ad zone component.
         */
        adZone: JSX.Element;
    }
]
```

### performKeywordSearch()

Once the SDK is initialized, this method can be called when performing a search operation within your app. Call this method either as the user types in a search term or when the user executes a search after the term is entered. A list of keyword search results will be returned by this method that can then be used to display dynamically along with the search results your app displays to the user. The final result of the search may have many items, in which case you would determine how many of them you would like to display.

```javascript
aaSdk.performKeywordSearch((searchTerm: string));
```

**Return Type:**

```javascript
[
    /**
     * The search term ID.
     */
    term_id: string;
    /**
     * The search term that was used to validate
     * the provided search string against.
     */
    term: string;
    /**
     * The display string you can use to display the
     * resulting item in your search results list.
     */
    replacement: string;
    /**
     * The display priority of this item amongst all
     * other keyword search results. The priority acts
     * as a secondary sort. The primary sort is based
     * on whether the "term" starts with the provided
     * search term characters or not.
     *
     * NOTE: Sorting is already handled for you by the SDK.
     * The results will already be in the correct sort order.
     */
    priority: number;
]
```

The final result is sorted based on the following criteria:

-   First, the items are sorted based on which ones "started" with the characters in the provided search string
-   Second, they are then sorted by the "priority" property for each keyword that satisfied the search

**Search Example:** _che_

| Keyword Term        | Priority |
| ------------------- | -------- |
| **Che**x Mix        | 2        |
| **Che**ddar Cheese  | 3        |
| Sweet **Che**rries  | 1        |
| Mac & **Che**ese    | 4        |
| Water **Che**stnuts | 5        |

### reportKeywordInterceptTermsPresented()

This method must be called anytime a keyword suggestion is displayed as a result of the SDKs `performKeywordSearch()` method. Calling this method reports back the suggested keywords that were ultimately displayed to the user. Making sure to call this method when a keyword is displayed will ensure AdAdapted can provide you with the most accurate reporting results.

This method accepts a list of `term_id` of the displayed keywords. See `performKeywordSearch()` return type for more info.

```javascript
aaSdk.reportKeywordInterceptTermsPresented((termIds: string[]));
```

**Return Type:**

```
void
```

### reportKeywordInterceptTermSelected()

This method must be called anytime a keyword suggestion that was a result of the SDKs `performKeywordSearch()` method is selected by the user. Calling this method reports back the selected keyword. Making sure to call this method when a keyword is selected will ensure AdAdapted can provide you with the most accurate reporting results.

This method accepts the `term_id` from the selected keyword. See `performKeywordSearch()` return type for more info.

```javascript
aaSdk.reportKeywordInterceptTermSelected((termId: string));
```

**Return Type:**

```
void
```

## Available Callbacks

## License

AdAdapted Platform License
