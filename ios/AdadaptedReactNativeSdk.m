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
    NSNumber *isAdTrackingEnabled = [NSNumber numberWithBool: [[ASIdentifierManager sharedManager] isAdvertisingTrackingEnabled]];
    NSString *udid = [self identifierForAdvertising];

    NSString *carrierName = [carrierInfo carrierName];

    if (carrierName == nil) {
        carrierName = @"n/a";
    }

    // Create the dictionary that will be turned into the final JSON result.
    NSDictionary *finalDeviceData = @{
        @"udid": udid,
        @"deviceName": deviceInfo.model,
        @"systemName": @"ios",
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
    } else {
        NSString *sessionId = [[NSUserDefaults standardUserDefaults]
            stringForKey:@"aasdkSessionIdKey"];
        if (sessionId) {
            return sessionId;
        } 
    }
    return @"0000000-0000-0000-0000-000000000000";
}

RCT_EXPORT_METHOD(storeCurrentSessionId:(NSString *) sessionId) {
    [[NSUserDefaults standardUserDefaults] setObject:sessionId forKey:@"aasdkSessionIdKey"];
    [[NSUserDefaults standardUserDefaults] synchronize];
}

@end
