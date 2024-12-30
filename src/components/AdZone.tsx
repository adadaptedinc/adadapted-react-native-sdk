/**
 * Component for creating an {@link AdZone}.
 * @module
 */
import * as React from "react";
import {
    DeviceEventEmitter,
    Linking,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import * as adadaptedApiRequests from "../api/adadaptedApiRequests";
import {
    Ad,
    AdActionType,
    DetailedListItem,
    ReportedEventType,
    Zone,
} from "../api/adadaptedApiTypes";
import { WebView } from "react-native-webview";
import { ApiEnv, DeviceOS } from "../index";
import { safeInvoke } from "../util";
import { useEffect, useState } from "react";
import { ReportAdButton } from "./ReportAdButton";

/**
 * Props interface for {@link AdZone}.
 */
interface Props {
    /**
     * The app ID.
     */
    appId: string;
    /**
     * The session ID.
     */
    sessionId: string;
    /**
     * The UDID.
     */
    udid: string;
    /**
     * The touch sensitivity of the Ad Zone in both the X and Y directions.
     * This is used to determine the click/press sensitivity when the
     * Ad Zone is being touched by the user as a regular touch or while
     * scrolling the view. If the amount of touch "drag" distance in either
     * X or Y direction is less than this value, we will treat the action as
     * a click/press on the Ad Zone.
     */
    xyDragDistanceAllowed: number;
    /**
     * The device OS used for API requests.
     */
    deviceOs: DeviceOS;
    /**
     * The API environment to use when making an API request.
     */
    apiEnv: ApiEnv;
    /**
     * The ad zone data.
     */
    adZoneData: Zone;
    /**
     * Callback that gets triggered when an "add to list" item/items are clicked.
     * @param items - The array of items to "add to list".
     */
    onAddToListTriggered?(items: DetailedListItem[]): void;
    /**
     * Is the ad zone visible on render.
     */
    offScreenAdZone: boolean;
    /**
     * Track the ad zone visibility in parent component. (for off-screen ads)
     */
    isAdZoneVisible?: boolean;
}

/**
 * Interface for tracking "touch" coordinates.
 */
interface TouchCoordinates {
    /**
     * The X coordinate for the touch.
     */
    x: number;
    /**
     * The Y coordinate for the touch.
     */
    y: number;
}

/**
 * Defines the style typing for the component.
 */
interface StyleDef {
    /**
     * Styles for the main View element.
     */
    mainView: ViewStyle;
    /**
     * Styles for the WebView element.
     */
    webView: ViewStyle;
    /**
     * Styles for the ReportAdButton.
     */
    reportAd: ViewStyle;
}
/**
 * Timer used for cycling through ads in the zone
 * based on the ad "refresh time" for each ad.
 */
let cycleAdTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Creates the AdZone component.
 * @param props - properties passed to AdZone.
 * @returns an AdZone JSX Element.
 */
export function AdZone(props: Props): React.JSX.Element {
    // Generates a random number between 0 and (number of available ads - 1).
    const startingAdIndex = Math.floor(
        Math.random() * props.adZoneData.ads.length
    );

    /**
     * Tracks the current ad index being shown.
     */
    const [adIndexShown, setAdIndexShown] = useState(startingAdIndex);
    /**
     * Tracks the coordinates when the user started touching the Ad View.
     */
    const [touchStartCoords, setTouchStartCoords] = useState({ x: 0, y: 0 });
    /**
     * Track ad visibility (for off-screen ads).
     */
    const [isAdVisible, setIsAdVisibile] = useState(props.isAdZoneVisible);

    // Setup device listeners.
    useEffect(() => {
        DeviceEventEmitter.addListener("visibility-event", (event: boolean) => {
            setIsAdVisibile(event);
        });

        DeviceEventEmitter.addListener("acknowledge", (itemName: string) => {
            acknowledge(itemName);
        });

        if (props.offScreenAdZone && isAdVisible) {
            sendAdImpression();
        } else if (!props.offScreenAdZone) {
            sendAdImpression();
        }

        return () => {
            clearTimeout(cycleAdTimer);
            DeviceEventEmitter.removeAllListeners("visibility-event");
            DeviceEventEmitter.removeAllListeners("acknowledge");
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Send impression on ad cycle.
    useEffect(() => {
        startAdTimer();
        if (props.offScreenAdZone && isAdVisible) {
            sendAdImpression();
        } else if (!props.offScreenAdZone) {
            sendAdImpression();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [adIndexShown]);

    // Send impression based on visibility change. (for off-screen ads)
    useEffect(() => {
        if (props.offScreenAdZone && isAdVisible) {
            sendAdImpression();
        } else if (!props.offScreenAdZone) {
            sendAdImpression();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdVisible]);

    /**
     * Generates all component related styles.
     * @returns the styles needed for the component.
     */
    function generateStyles(): StyleDef {
        return StyleSheet.create({
            mainView: {
                width: "100%",
                height: "100%",
            },
            webView: {
                width: "100%",
                height: "100%",
            },
            reportAd: {
                position: "absolute",
                top: 10,
                right: 10,
            },
        });
    }

    // Generate the styles each render in case the ad is updated with
    // new settings that need to be reflected in the styles of the view.
    const styles = generateStyles();
    const currentAd: Ad | undefined =
        props.adZoneData.ads[adIndexShown] || undefined;
    const finalMainViewStyle = styles.mainView;

    if (!currentAd || !currentAd.creative_url) {
        // If there is no ad to display, make the view take up no space.
        finalMainViewStyle.width = 0;
        finalMainViewStyle.height = 0;
    }

    /**
     * Triggers when the user selects the ad zone.
     * @param currentlyDisplayedAd - The ad currently displayed.
     */
    function onAdZoneSelected(currentlyDisplayedAd: Ad): void {
        // Determine the "action type" and perform that specific action.
        if (
            currentlyDisplayedAd.action_type === AdActionType.EXTERNAL &&
            currentlyDisplayedAd.action_path
        ) {
            // Action Type: EXTERNAL
            Linking.openURL(currentlyDisplayedAd.action_path).then();
        } else if (
            currentlyDisplayedAd.action_type === AdActionType.CONTENT &&
            currentlyDisplayedAd.payload &&
            currentlyDisplayedAd.payload.detailed_list_items
        ) {
            safeInvoke(
                props.onAddToListTriggered,
                currentlyDisplayedAd.payload.detailed_list_items
            );
        }

        cycleDisplayedAd();
    }

    /**
     * Call to acknowledge ATL item(s) added to user list.
     * @param itemName - Detailed list item title from ad that was clicked.
     */
    function acknowledge(itemName: string): void {
        if (props.adZoneData.ads) {
            props.adZoneData.ads.forEach((ad) => {
                if (ad.action_type === "c") {
                    ad.payload.detailed_list_items.forEach((item) => {
                        if (item.product_title === itemName) {
                            triggerReportAdEvent(
                                ad,
                                ReportedEventType.INTERACTION
                            );
                        }
                    });
                }
            });
        }
    }

    /**
     * Triggered when we need to report an ad event to the API.
     * @param ad - The ad to send an event for.
     * @param eventType - The event type for the reported event.
     */
    function triggerReportAdEvent(ad: Ad, eventType: ReportedEventType): void {
        // The event timestamp has to be sent as a unix timestamp.
        const currentTs = Math.round(new Date().getTime() / 1000);

        // Log the taken action/event with the API.
        adadaptedApiRequests
            .reportAdEvent(
                {
                    app_id: props.appId,
                    session_id: props.sessionId,
                    udid: props.udid,
                    events: [
                        {
                            ad_id: ad.ad_id,
                            impression_id: ad.impression_id,
                            event_type: eventType,
                            created_at: currentTs,
                        },
                    ],
                },
                props.deviceOs,
                props.apiEnv
            )
            .then(() => {
                // Do nothing with the response for now...
            });
    }

    /**
     * Generates a new timer for cycling to the next ad.
     */
    function startAdTimer(): void {
        clearTimeout(cycleAdTimer);

        if (props.adZoneData.ads.length > 0) {
            const refreshTime: number =
                props.adZoneData.ads[adIndexShown].refresh_time * 1000;
            cycleAdTimer = setTimeout(cycleDisplayedAd, refreshTime);
        }
    }

    /**
     * Cycles to the next ad to display in the current available sequence of ads.
     */
    function cycleDisplayedAd(): void {
        // Start by determining the next ad index to display.
        let nextAdIndex = 0;
        const lastAd = props.adZoneData.ads[adIndexShown];

        if (adIndexShown < props.adZoneData.ads.length - 1) {
            nextAdIndex = adIndexShown + 1;
        }

        if (nextAdIndex !== adIndexShown && lastAd.impression_tracked) {
            // Reset ad impression tracking status.
            lastAd.impression_tracked = false;
        } else {
            // Send invisible ad impression if ad was not visible before end of timer cycle.
            triggerReportAdEvent(
                lastAd,
                ReportedEventType.INVISIBLE_IMPRESSION
            );
        }

        setAdIndexShown(nextAdIndex);
    }

    /**
     * Send ad tracking impression.
     */
    function sendAdImpression(): void {
        const ad = props.adZoneData.ads[adIndexShown];

        if (!ad.impression_tracked) {
            triggerReportAdEvent(ad, ReportedEventType.IMPRESSION);
            ad.impression_tracked = true;
        }
    }

    // Returned JSX.
    return (
        <View style={finalMainViewStyle}>
            {currentAd && currentAd.creative_url ? (
                <WebView
                    source={{
                        uri: currentAd.creative_url,
                    }}
                    androidLayerType="hardware"
                    automaticallyAdjustContentInsets={false}
                    style={styles.webView}
                    onTouchStart={(e) => {
                        setTouchStartCoords({
                            x: e.nativeEvent.pageX,
                            y: e.nativeEvent.pageY,
                        });
                    }}
                    onTouchEnd={(e) => {
                        if (touchStartCoords) {
                            const touchEndCoords: TouchCoordinates = {
                                x: e.nativeEvent.pageX,
                                y: e.nativeEvent.pageY,
                            };

                            if (
                                Math.abs(
                                    touchStartCoords.x - touchEndCoords.x
                                ) < props.xyDragDistanceAllowed &&
                                Math.abs(
                                    touchStartCoords.y - touchEndCoords.y
                                ) < props.xyDragDistanceAllowed
                            ) {
                                onAdZoneSelected(currentAd);
                            }

                            // Make sure to reset the start coords
                            setTouchStartCoords({ x: 0, y: 0 });
                        }
                    }}
                />
            ) : undefined}
            <View style={styles.reportAd}>
                <ReportAdButton adId={currentAd.ad_id} udid={props.udid} />
            </View>
        </View>
    );
}
