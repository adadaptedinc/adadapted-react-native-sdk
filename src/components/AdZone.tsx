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
            adIndexShown: startingAdIndex
        };
    }

    /**
     * @inheritDoc
     */
    public componentDidMount(): void {
        this.createAdTimer();
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
                        // If the "action_path" value is defined, follow the URL.
                        if (currentAd.action_path) {
                            Linking.openURL(currentAd.action_path).then();
                        }

                        this.triggerReportAdEvent(
                            currentAd,
                            adadaptedApiTypes.models.ReportedEventType
                                .INTERACTION
                        );
                    }}
                />
            </View>
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
     */
    private createAdTimer(): void {
        if (this.props.adZoneData.ads.length > 0) {
            this.cycleAdTimer = setTimeout(() => {
                this.cycleDisplayedAd();
            }, this.props.adZoneData.ads[this.state.adIndexShown].refresh_time * 1000);
        }
    }

    /**
     * Cycles to the next ad to display in the current available sequence of ads.
     */
    private cycleDisplayedAd(): void {
        // Start by determining the next ad index to display.
        let nextAdIndex = 0;

        if (this.state.adIndexShown < this.props.adZoneData.ads.length - 1) {
            nextAdIndex = this.state.adIndexShown + 1;
        }

        this.setState(
            {
                adIndexShown: nextAdIndex
            },
            () => {
                // Create the new timer based on the new ad index.
                this.createAdTimer();
            }
        );
    }

    /**
     * Generates all component related styles.
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
