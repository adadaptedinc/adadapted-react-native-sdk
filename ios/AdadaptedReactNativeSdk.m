// See https://facebook.github.io/react-native/docs/native-modules-ios
#import "AdadaptedReactNativeSdk.h"

@implementation AdadaptedReactNativeSdk

RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(
    getDeviceInfo,
    findEventsWithResolver:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject
){
    CGRect screenBounds = [[UIScreen mainScreen] bounds];
    CGFloat screenScale = [[UIScreen mainScreen] scale];
    CGSize screenSize = CGSizeMake(screenBounds.size.width * screenScale, screenBounds.size.height * screenScale);

    UIDevice *deviceInfo = [UIDevice currentDevice];
    NSString *bundleId = [[NSBundle mainBundle] bundleIdentifier];
    NSString *bundleVersion = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleShortVersionString"];
    NSString *idfaString = [[[ASIdentifierManager sharedManager] advertisingIdentifier] UUIDString];
    NSString *deviceWidth = [NSString stringWithFormat:@"%1.0f", screenSize.width];
    NSString *deviceHeight = [NSString stringWithFormat:@"%1.0f", screenSize.height];
    NSString *deviceScreenDensity = [NSString stringWithFormat:@"%0.0f", [[UIScreen mainScreen] scale]];
    NSString *deviceLocal = [[NSLocale preferredLanguages] objectAtIndex:0];
    NSString *timezoneName = [[NSTimeZone localTimeZone] name];
    NSNumber *isAdTrackingEnabled = [NSNumber numberWithBool: [[ASIdentifierManager sharedManager] isAdvertisingTrackingEnabled]];

    // Create the dictionary that will be turned into the final JSON result.
    NSDictionary *finalDeviceData = @{
        @"udid": idfaString,
        @"deviceName": deviceInfo.name,
        @"systemName": @"ios",
        @"systemVersion": deviceInfo.systemVersion,
        @"deviceModel": deviceInfo.model,
        @"deviceWidth": deviceWidth,
        @"deviceHeight": deviceHeight,
        @"deviceScreenDensity": deviceScreenDensity,
        @"deviceLocale": deviceLocal,
        @"bundleId": bundleId,
        @"bundleVersion": bundleVersion,
        @"deviceTimezone": timezoneName,
        @"isAdTrackingEnabled": isAdTrackingEnabled
    };

    NSError *error;
    NSData *jsonData = [
        NSJSONSerialization dataWithJSONObject: finalDeviceData
        options: 0
        error: &error
    ];

    resolve([[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding]);
}

@end
