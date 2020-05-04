/**
 * Component for creating an {@link AdZone}.
 * @module
 */
import * as React from "react";
import { Linking, StyleSheet, View, ViewStyle } from "react-native";
import * as adadaptedApiRequests from "../api/adadaptedApiRequests";
import { adadaptedApiTypes } from "../api/adadaptedApiTypes";
import { WebView } from "react-native-webview";
import { AdadaptedReactNativeSdk } from "../index";
import { AdPopup } from "./AdPopup";

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
     * The device OS used for API requests.
     */
    deviceOs: AdadaptedReactNativeSdk.DeviceOS;
    /**
     * The API environment to use when making an API request.
     */
    apiEnv: AdadaptedReactNativeSdk.ApiEnv;
    /**
     * The ad zone data.
     */
    adZoneData: adadaptedApiTypes.models.Zone;
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
            isAdPopupOpen: false
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
        const currentAd = this.props.adZoneData.ads[this.state.adIndexShown];

        return (
            <View style={styles.mainView}>
                <WebView
                    source={{
                        uri: currentAd.creative_url
                    }}
                    automaticallyAdjustContentInsets={false}
                    style={styles.webView}
                    onTouchEnd={() => {
                        this.onAdZoneSelected(currentAd);
                    }}
                />
                <AdPopup
                    ad={currentAd}
                    isOpen={this.state.isAdPopupOpen}
                    onClose={() => {
                        this.setState({
                            isAdPopupOpen: false
                        });
                    }}
                />
            </View>
        );
    }

    /**
     * Triggers when the user selects the ad zone.
     * @param currentAd - The ad currently displayed.
     */
    private onAdZoneSelected(currentAd: adadaptedApiTypes.models.Ad): void {
        // Determine the "action type" and perform that specific action.
        if (
            currentAd.action_type ===
                adadaptedApiTypes.models.AdActionType.EXTERNAL &&
            currentAd.action_path
        ) {
            // Action Type: EXTERNAL
            Linking.openURL(currentAd.action_path).then();
        } else if (
            (currentAd.action_type ===
                adadaptedApiTypes.models.AdActionType.POPUP ||
                currentAd.action_type ===
                    adadaptedApiTypes.models.AdActionType.LINK) &&
            currentAd.action_path
        ) {
            // Action Type: POPUP or LINK
            this.setState({
                isAdPopupOpen: true
            });
        }

        this.triggerReportAdEvent(
            currentAd,
            adadaptedApiTypes.models.ReportedEventType.INTERACTION
        );
    }

    /**
     * Triggered when we need to report an ad event to the API.
     * @param currentAd - The ad to send an event for.
     * @param eventType - The event type for the reported event.
     */
    private triggerReportAdEvent(
        currentAd: adadaptedApiTypes.models.Ad,
        eventType: adadaptedApiTypes.models.ReportedEventType
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
                            created_at: currentTs
                        }
                    ]
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
        console.log("cycleDisplayedAd");
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
                    adIndexShown: nextAdIndex
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
            adadaptedApiTypes.models.ReportedEventType.IMPRESSION
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
                height: "100%"
            },
            webView: {
                width: "100%",
                height: "100%"
            }
        });
    }
}
