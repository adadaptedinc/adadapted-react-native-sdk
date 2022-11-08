/**
 * Component for creating an {@link AdZone}.
 * @module
 */
import * as React from "react";
import { Linking, StyleSheet, View, ViewStyle } from "react-native";
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
import { AdPopup } from "./AdPopup";
import { safeInvoke } from "../util";

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
}

/**
 * State interface for {@link AdZone}.
 */
interface State {
    /**
     * Tracks the current ad index being shown.
     */
    adIndexShown: number;
    /**
     * If true, the ad popup(if available) is open.
     */
    isAdPopupOpen: boolean;
    /**
     * Tracks the coordinates when the user started touching the Ad View.
     */
    touchStartCoords: TouchCoordinates | undefined;
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
}

/**
 * Creates the AdZone component.
 */
export class AdZone extends React.Component<Props, State> {
    /**
     * Timer used for cycling through ads in the zone
     * based on the ad "refresh time" for each ad.
     */
    private cycleAdTimer: ReturnType<typeof setTimeout> | undefined;

    /**
     * @inheritDoc
     */
    constructor(props: Props, context?: any) {
        super(props, context);

        // Generates a random number between 0 and (number of available ads - 1).
        const startingAdIndex = Math.floor(
            Math.random() * this.props.adZoneData.ads.length
        );

        this.state = {
            adIndexShown: startingAdIndex,
            isAdPopupOpen: false,
            touchStartCoords: undefined,
        };
    }

    /**
     * @inheritDoc
     */
    public componentDidMount(): void {
        this.initializeAd();
    }

    /**
     * @inheritDoc
     */
    public componentWillUnmount(): void {
        if (this.cycleAdTimer) {
            clearTimeout(this.cycleAdTimer);
        }
    }

    /**
     * @inheritDoc
     */
    public render(): JSX.Element {
        // Generate the styles each render in case the ad is updated with
        // new settings that need to be reflected in the styles of the view.
        const styles = this.generateStyles();
        const currentAd: Ad | undefined =
            this.props.adZoneData.ads[this.state.adIndexShown] || undefined;
        const finalMainViewStyle = styles.mainView;

        if (!currentAd || !currentAd.creative_url) {
            // If there is no ad to display, make the view take up no space.
            finalMainViewStyle.width = 0;
            finalMainViewStyle.height = 0;
        }

        return (
            <View style={finalMainViewStyle}>
                {currentAd && currentAd.creative_url ? (
                    <WebView
                        source={{
                            uri: currentAd.creative_url,
                        }}
                        androidHardwareAccelerationDisabled={true}
                        automaticallyAdjustContentInsets={false}
                        style={styles.webView}
                        onTouchStart={(e) => {
                            this.setState({
                                touchStartCoords: {
                                    x: e.nativeEvent.pageX,
                                    y: e.nativeEvent.pageY,
                                },
                            });
                        }}
                        onTouchEnd={(e) => {
                            if (this.state.touchStartCoords) {
                                const touchEndCoords: TouchCoordinates = {
                                    x: e.nativeEvent.pageX,
                                    y: e.nativeEvent.pageY,
                                };

                                if (
                                    Math.abs(
                                        this.state.touchStartCoords.x -
                                            touchEndCoords.x
                                    ) < this.props.xyDragDistanceAllowed &&
                                    Math.abs(
                                        this.state.touchStartCoords.y -
                                            touchEndCoords.y
                                    ) < this.props.xyDragDistanceAllowed
                                ) {
                                    this.onAdZoneSelected(currentAd);
                                }

                                // Make sure to reset the start coords
                                this.setState({
                                    touchStartCoords: undefined,
                                });
                            }
                        }}
                    />
                ) : undefined}
                {currentAd && currentAd.creative_url ? (
                    <AdPopup
                        ad={currentAd}
                        isOpen={this.state.isAdPopupOpen}
                        onClose={() => {
                            this.setState({
                                isAdPopupOpen: false,
                            });
                        }}
                        onAddToListItemClicked={(item) => {
                            safeInvoke(this.props.onAddToListTriggered, [item]);
                        }}
                    />
                ) : undefined}
            </View>
        );
    }

    /**
     * Triggers when the user selects the ad zone.
     * @param currentAd - The ad currently displayed.
     */
    private onAdZoneSelected(currentAd: Ad): void {
        // Determine the "action type" and perform that specific action.
        if (
            currentAd.action_type === AdActionType.EXTERNAL &&
            currentAd.action_path
        ) {
            // Action Type: EXTERNAL
            Linking.openURL(currentAd.action_path).then();
        } else if (
            (currentAd.action_type === AdActionType.POPUP ||
                currentAd.action_type === AdActionType.LINK) &&
            currentAd.action_path
        ) {
            // Action Type: POPUP or LINK
            this.setState({
                isAdPopupOpen: true,
            });
        } else if (
            currentAd.action_type === AdActionType.CONTENT &&
            currentAd.payload &&
            currentAd.payload.detailed_list_items
        ) {
            safeInvoke(
                this.props.onAddToListTriggered,
                currentAd.payload.detailed_list_items
            );
        }

        this.triggerReportAdEvent(currentAd, ReportedEventType.INTERACTION);
        if (this.cycleAdTimer) {
            clearTimeout(this.cycleAdTimer);
        }
        this.cycleDisplayedAd();
    }

    /**
     * Triggered when we need to report an ad event to the API.
     * @param currentAd - The ad to send an event for.
     * @param eventType - The event type for the reported event.
     */
    private triggerReportAdEvent(
        currentAd: Ad,
        eventType: ReportedEventType
    ): void {
        // The event timestamp has to be sent as a unix timestamp.
        const currentTs = Math.round(new Date().getTime() / 1000);

        // Log the taken action/event with the API.
        adadaptedApiRequests
            .reportAdEvent(
                {
                    app_id: this.props.appId,
                    session_id: this.props.sessionId,
                    udid: this.props.udid,
                    events: [
                        {
                            ad_id: currentAd.ad_id,
                            impression_id: currentAd.impression_id,
                            event_type: eventType,
                            created_at: currentTs,
                        },
                    ],
                },
                this.props.deviceOs,
                this.props.apiEnv
            )
            .then(() => {
                // Do nothing with the response for now...
            });
    }

    /**
     * Generates a new timer for cycling to the next ad.
     * @param timerLength - The length of time(in milliseconds) to initialize
     *      the timer with.
     */
    private createAdTimer(timerLength: number): void {
        if (this.props.adZoneData.ads.length > 0) {
            this.cycleAdTimer = setTimeout(() => {
                this.cycleDisplayedAd();
            }, timerLength);
        }
    }

    /**
     * Cycles to the next ad to display in the current available sequence of ads.
     */
    private cycleDisplayedAd(): void {
        if (!this.state.isAdPopupOpen) {
            // Start by determining the next ad index to display.
            let nextAdIndex = 0;

            if (
                this.state.adIndexShown <
                this.props.adZoneData.ads.length - 1
            ) {
                nextAdIndex = this.state.adIndexShown + 1;
            }

            this.setState(
                {
                    adIndexShown: nextAdIndex,
                },
                () => {
                    this.initializeAd();
                }
            );
        } else {
            // Create a new timer with a timer length of just 10 seconds.
            // This will allow us to re-check if the popup is still open
            // quicker and handle switching to the next ad sooner instead of
            // just restarting the current timer. We do this, because we must
            // maintain the current ad shown or the popup will cycle to the
            // next ad while the user is actively engaged with it. Then when
            // the user closes the popup, the ad will cycle to the next quickly.
            this.createAdTimer(10000);
        }
    }

    /**
     * Performs all ad initialization tasks when a new ad is being displayed.
     */
    private initializeAd(): void {
        // Create the new timer based on the new ad index.
        this.createAdTimer(
            this.props.adZoneData.ads[this.state.adIndexShown].refresh_time *
                1000
        );

        // Trigger an impression event for the ad.
        this.triggerReportAdEvent(
            this.props.adZoneData.ads[this.state.adIndexShown],
            ReportedEventType.IMPRESSION
        );
    }

    /**
     * Generates all component related styles.
     * @returns the styles needed for the component.
     */
    private generateStyles(): StyleDef {
        return StyleSheet.create({
            mainView: {
                width: "100%",
                height: "100%",
            },
            webView: {
                width: "100%",
                height: "100%",
            },
        });
    }
}
