/**
 * Component for creating an {@link AdZone}.
 * @module
 */
import * as React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { adadaptedApiTypes } from "../api/adadaptedApiTypes";
import { WebView } from "react-native-webview";

/**
 * Props interface for {@link AdZone}.
 */
interface Props {
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
                />
            </View>
        );
    }

    /**
     * Generates a new timer for cycling to the next ad.
     */
    private createAdTimer(): void {
        if (this.props.adZoneData.ads.length > 0) {
            setTimeout(() => {
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
