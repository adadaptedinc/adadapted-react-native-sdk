// See https://facebook.github.io/react-native/docs/native-modules-ios
#import "AdadaptedReactNativeSdk.h"
#import <CoreTelephony/CTTelephonyNetworkInfo.h>
#import <CoreTelephony/CTCarrier.h>

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

    CTTelephonyNetworkInfo *networkInfo = [[CTTelephonyNetworkInfo alloc] init];
    CTCarrier *carrierInfo = [networkInfo subscriberCellularProvider];

    UIDevice *deviceInfo = [UIDevice currentDevice];
    NSString *bundleId = [[NSBundle mainBundle] bundleIdentifier];
    NSString *bundleVersion = [[[NSBundle mainBundle] infoDictionary] objectForKey:@"CFBundleShortVersionString"];
    NSString *deviceWidth = [NSString stringWithFormat:@"%1.0f", screenSize.width];
    NSString *deviceHeight = [NSString stringWithFormat:@"%1.0f", screenSize.height];
    NSString *deviceScreenDensity = [NSString stringWithFormat:@"%0.0f", [[UIScreen mainScreen] scale]];
    NSString *deviceLocal = [[NSLocale preferredLanguages] objectAtIndex:0];
    NSString *timezoneName = [[NSTimeZone localTimeZone] name];
    // Via the ATT-aware helper below, not ASIdentifierManager directly: Apple made
    // isAdvertisingTrackingEnabled always return NO from iOS 14, so reading it here
    // reported every user as having refused tracking, including those who granted
    // it. This is the same signal that decides whether an advertising identifier is
    // reported, so the two must agree.
    NSNumber *isAdTrackingEnabled = [NSNumber numberWithBool: [self isAdTrackingEnabled]];
    NSString *udid = [self identifierForAdvertising];

    NSString *carrierName = [carrierInfo carrierName];

    if (carrierName == nil) {
        carrierName = @"n/a";
    }

    // Create the dictionary that will be turned into the final JSON result.
    NSDictionary *finalDeviceData = @{
        @"udid": udid,
        @"deviceName": deviceInfo.model,
        @"systemName": @"ios_react_native",
        @"systemVersion": deviceInfo.systemVersion,
        @"deviceCarrier": carrierName,
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

-(BOOL)isAdTrackingEnabled {
    if(@available(iOS 14.0, *)) {
        ATTrackingManagerAuthorizationStatus status = [ATTrackingManager trackingAuthorizationStatus];
            if(status == ATTrackingManagerAuthorizationStatusAuthorized) {
                return YES;
            }
    } else if([[ASIdentifierManager sharedManager] isAdvertisingTrackingEnabled]) {
        return YES;
    }
    return NO;
}

- (NSString *)identifierForAdvertising {
    if([self isAdTrackingEnabled]) {
        NSUUID *identifier = [[ASIdentifierManager sharedManager] advertisingIdentifier];
        return [identifier UUIDString];
    }

    // Nothing is substituted when the user has not permitted tracking. This
    // matches the Android module, which leaves the identifier empty when the
    // advertising ID is unavailable rather than reporting something else.
    //
    // Two previous behaviours are deliberately gone. This used to return the
    // session ID that storeCurrentSessionId wrote to NSUserDefaults, so the device
    // looked brand new on every session; sessions are generated in JS now and that
    // method no longer exists. It then briefly returned identifierForVendor, which
    // is stable and needs no prompt but is shared across this vendor's apps, and
    // sending it to an ad service after tracking was denied is the sort of linkage
    // App Tracking Transparency exists to prevent.
    return @"";
}

@end
