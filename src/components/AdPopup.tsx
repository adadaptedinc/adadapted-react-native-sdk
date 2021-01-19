/**
 * Component for creating an {@link AdPopup}.
 * @module
 */
import * as React from "react";
import { WebView } from "react-native-webview";
import Modal from "react-native-modal";
import {
    ActivityIndicator,
    Image,
    ImageStyle,
    SafeAreaView,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { Ad, AdActionType, DetailedListItem } from "../api/adadaptedApiTypes";
import { safeInvoke } from "../util";

/**
 * Props interface for {@link AdPopup}.
 */
interface Props {
    /**
     * The add to display in the popup.
     */
    ad: Ad;
    /**
     * If true, the ad popup is displayed.
     */
    isOpen?: boolean;
    /**
     * Triggered when the popup is closing.
     */
    onClose?(): void;
    /**
     * Triggered when an ad circular item is clicked and
     * the item should be "added to list".
     * @param item - The item to add to list.
     */
    onAddToListItemClicked(item: DetailedListItem): void;
}

/**
 * State interface for {@link AdPopup}.
 */
interface State {
    /**
     * If true, the popup web view can navigate back.
     */
    canGoBack: boolean;
    /**
     * If true, the popup web view can navigate forward.
     */
    canGoForward: boolean;
    /**
     * If true, the webview is loading a new page.
     */
    isPageLoading: boolean;
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
     * Styles for the close button View element.
     */
    closeButtonView: ViewStyle;
    /**
     * Styles for the navigation header View element.
     */
    navHeaderView: ViewStyle;
    /**
     * Styles for the nav arrow buttons view.
     */
    navArrowsContainer: ViewStyle;
    /**
     * Styles for the navigation left arrow button.
     */
    navLeftArrow: ImageStyle;
    /**
     * Styles for the navigation right arrow button.
     */
    navRightArrow: ImageStyle;
    /**
     * Styles for the nav bar title container.
     */
    navBarTitleView: ViewStyle;
    /**
     * Styles for the title text.
     */
    titleText: TextStyle;
    /**
     * Styles for the loading indicator container.
     */
    loadingIndicatorContainer: ViewStyle;
    /**
     * Styles for the close button opacity container.
     */
    closeButtonContainer: ViewStyle;
    /**
     * Styles for the button text.
     */
    closeButtonText: TextStyle;
}

/**
 * Creates the AdPopup component.
 */
export class AdPopup extends React.Component<Props, State> {
    /**
     * The web view element reference.
     */
    private webViewElementRef: WebView | null = null;

    /**
     * @inheritDoc
     */
    constructor(props: Props, context?: any) {
        super(props, context);

        this.state = {
            canGoBack: false,
            canGoForward: false,
            isPageLoading: true,
        };
    }

    /**
     * @inheritDoc
     */
    public render(): JSX.Element {
        // Generate the styles each render in case the ad is updated with
        // new settings that need to be reflected in the styles of the view.
        const styles = this.generateStyles();

        return (
            <Modal
                style={styles.mainView}
                isVisible={this.props.isOpen}
                hasBackdrop={false}
                coverScreen={true}
            >
                <SafeAreaView style={{ flex: 1 }}>
                    <SafeAreaView style={styles.navHeaderView}>
                        <View style={styles.navArrowsContainer}>
                            <View
                                onTouchStart={() => {
                                    if (
                                        this.webViewElementRef &&
                                        this.state.canGoBack
                                    ) {
                                        this.webViewElementRef.goBack();
                                    }
                                }}
                            >
                                <Image
                                    source={{
                                        uri:
                                            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABpUlEQVRoQ+2YvUrFQBBGZ59Hq8QXsLcVLCwsFBQUFBQUlHsFBQUFBQUFLSwsBB9C+/2m0ifxAUYCCinM5i47c83Cpgy7yznzzZAfR5lfLnN+KgL/nWBJoCSQWIHSQokFTN5eEogtYVVVY+fcAhF9icg7M49jz2ivn2oCP/CjFsAngNksBP6Ab7gBYG7wAh3wJCLHg2+hLngiOgJwklL9Zq/pDATgDwCcpcKbCgTg9wBcaMCbCQR6foeZr7TgTQS64J1zW977G014dYFA22wAuNOGVxUIwK8BeLCAVxMIwK8AeLKCVxEIDOwyMz9bwqsI1HX9QUQzbVARWWLmF2t4LQFPRHW2Atm3UFP5rIf4t3UCD7BV7/2j1TyovswFJNa99/cWEqoCoXYSkU1mvtWWUBfomYltANeaEiYCPRK7AC61JMwEeiT2AZxrSJgKhCScc4fe+9NUCXOBnsEe/kd9z3Min/9CHUm8AZhPaaOptFAbsKqqkXNusbknIq+D/y+UUt1J9k49gUmgYtYUgZhqWawtCVhUNebMkkBMtSzWlgQsqhpz5jfHSasx85A3NgAAAABJRU5ErkJggg==",
                                    }}
                                    style={styles.navLeftArrow}
                                />
                            </View>
                            <View
                                onTouchStart={() => {
                                    if (
                                        this.webViewElementRef &&
                                        this.state.canGoForward
                                    ) {
                                        this.webViewElementRef.goForward();
                                    }
                                }}
                            >
                                <Image
                                    source={{
                                        uri:
                                            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAABnklEQVRoQ+3YsUoEMRAG4H8ewCfRKpNeH0KwsLBQUFBQUFBQ8ERBQUFBQUELCwsLS3tfwFylzzOykAVZmz0yM+dCrs7O/d9Mwu2FMPAPDTw/KmDaE6wTqBMo7EDdQoUNLH68TiCEMCKieQAzIvI+Ho9HxW2doEDxBJj5C8Bs+50icuKJ0AB8AuDfTfNEFAPyFjruTt0LUQxogjPzEYDTaSBUABlxAODcG6EGyIg9AJeeCFVAEzyEsENE114IdUATPMa4JSK3HggTQN5OGwDurRFmgIxYA/BoiTAFZMQKgGcrhDkgH+xlInqxQLgAMmKJiF47iO+U0twE725/lk4bkFJK8d8DQgjD3ULMPNxDHGNcFZEni8Pb1jQ7AzHGdRF5sAzf1DYBhBA2iejOOrwJgJm3Adx4hFcHMPMugCuv8KoAZt4HcOEZXg0QYzwUkTPv8CqAwf+p794LNV3xupFQmQAzfwBYaLePZ3gVQN5Ci7nzb563ciqAkjdJjWdNfok1gvWtUQF9O2W1rk7AqrN969YJ9O2U1bo6AavO9q37A5jF5jGXG4ruAAAAAElFTkSuQmCC",
                                    }}
                                    style={styles.navRightArrow}
                                />
                            </View>
                        </View>
                        <View style={styles.navBarTitleView}>
                            <Text
                                style={styles.titleText}
                                numberOfLines={1}
                                ellipsizeMode={"tail"}
                            >
                                {this.props.ad.popup.title_text}
                            </Text>
                        </View>
                        <View style={styles.loadingIndicatorContainer}>
                            {this.state.isPageLoading ? (
                                <ActivityIndicator
                                    size="large"
                                    color="#2969a0"
                                />
                            ) : undefined}
                        </View>
                    </SafeAreaView>
                    <WebView
                        source={{
                            uri: this.props.ad.action_path,
                        }}
                        ref={(ref) => {
                            this.webViewElementRef = ref;
                        }}
                        automaticallyAdjustContentInsets={false}
                        allowFileAccess={true}
                        style={styles.webView}
                        javaScriptEnabled={true}
                        injectedJavaScript={
                            this.props.ad.action_type === AdActionType.POPUP ||
                            this.props.ad.action_type === AdActionType.LINK
                                ? this.getAddToListCircularJavascript()
                                : ""
                        }
                        onMessage={(event) => {
                            const responseObj: DetailedListItem = JSON.parse(
                                event.nativeEvent.data
                            );

                            safeInvoke(
                                this.props.onAddToListItemClicked,
                                responseObj
                            );
                        }}
                        onNavigationStateChange={(navState) => {
                            this.setState({
                                canGoBack: navState.canGoBack,
                                canGoForward: navState.canGoForward,
                            });
                        }}
                        onLoadStart={() => {
                            this.setState({
                                isPageLoading: true,
                            });
                        }}
                        onLoadEnd={() => {
                            this.setState({
                                isPageLoading: false,
                            });
                        }}
                    />
                    <SafeAreaView style={styles.closeButtonView}>
                        <TouchableOpacity
                            style={styles.closeButtonContainer}
                            onPress={() => {
                                safeInvoke(this.props.onClose);
                            }}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </SafeAreaView>
                </SafeAreaView>
            </Modal>
        );
    }

    /**
     * Generates the javascript to pass down to the Web View that extracts the
     * clicked product information based on the circular ad design.
     * @returns the javascript string to pass to the Web View.
     */
    private getAddToListCircularJavascript(): string {
        // TODO: This method should ultimately be removed. We shouldn't have to
        //      hack the web view's javascript just to get the correct data to
        //      return. When the circular templates get reworked, we should
        //      build in an onMessage response within the circulars page so we
        //      don't have to do it this way.
        return `
            const adButtons = document.getElementsByTagName("button");

            if (adButtons.length > 0) {
                if (adButtons.length > 1 && adButtons[1].getAttribute("data-payload-id")) {
                    for (let x = 0; x < adButtons.length; x++) {
                        if (adButtons[x].getAttribute("data-payload-id")) {
                            adButtons[x].addEventListener("click", (event) => {
                                window.ReactNativeWebView.postMessage(
                                    JSON.stringify(
                                        window.AdAdapted.payloads[adButtons[x].getAttribute("data-payload-id")]
                                    )
                                );
                            });
                        }
                    }
                } else {
                    const onDataPostMessage = (imgSrc) => {
                        const valueAfterLastSlash = imgSrc.match(/(?:[^\\/](?!(\\/)))+$/g).toString();
                        const upcValueWithLeadingZeros = valueAfterLastSlash.match(/[^.]*/).toString();
                        const finalUpcValue = parseInt(upcValueWithLeadingZeros, 10);
                        const itemData = window.__NUXT__.data[0].items;
                        let clickedItem = {};
                        
                        for (let i = 0; i < itemData.length; i++) {
                            if (itemData[i].upc == finalUpcValue) {
                                clickedItem = itemData[i];
                            }
                        }
                        
                        window.ReactNativeWebView.postMessage(
                            JSON.stringify({
                                product_barcode: clickedItem.upc,
                                product_brand: clickedItem.brand,
                                product_category: clickedItem.category,
                                product_discount: clickedItem.sale_price,
                                product_image: clickedItem.image,
                                product_sku: clickedItem.retailer_sku,
                                product_title: clickedItem.title
                            })
                        );
                    };
                    
                    const onItemDialogLoad = () => {
                        setTimeout(() => {
                            document.getElementsByClassName("modal-body")[0].getElementsByTagName("button")[0].addEventListener("click", (event) => {
                                onDataPostMessage(
                                    event.target.parentElement.getElementsByTagName("img")[0].getAttribute("src")
                                );
                            });
                        }, 100);
                    };
                    
                    const adItemImages = document.querySelectorAll(".item img");
                    const adItemPromotionDivs = document.querySelectorAll(".item .promotion");
                    const adItemTitleDivs = document.querySelectorAll(".item .title");
                    const adItemPricingDivs = document.querySelectorAll(".item .pricing");
                    
                    for (let x = 0; x < adItemImages.length; x++) {
                        adItemImages[x].addEventListener("click", (event) => {
                            onItemDialogLoad();
                        });
                    }
                    
                    for (let x = 0; x < adItemPromotionDivs.length; x++) {
                        adItemPromotionDivs[x].addEventListener("click", (event) => {
                            onItemDialogLoad();
                        });
                    }
                    
                    for (let x = 0; x < adItemTitleDivs.length; x++) {
                        adItemTitleDivs[x].addEventListener("click", (event) => {
                            onItemDialogLoad();
                        });
                    }
                    
                    for (let x = 0; x < adItemPricingDivs.length; x++) {
                        adItemPricingDivs[x].addEventListener("click", (event) => {
                            onItemDialogLoad();
                        });
                    }
                    
                    for (let x = 0; x < adButtons.length; x++) {
                        adButtons[x].addEventListener("click", (event) => {
                            onDataPostMessage(
                                event.target.parentElement.getElementsByTagName("img")[0].getAttribute("src")
                            );
                        });
                    }
                }
            }
        `;
    }

    /**
     * Generates all component related styles.
     * @returns the styles needed for the component.
     */
    private generateStyles(): StyleDef {
        const backButtonOpacity = this.state.canGoBack ? 1 : 0.3;
        const forwardButtonOpacity = this.state.canGoForward ? 1 : 0.3;

        return StyleSheet.create({
            mainView: {
                display: "flex",
                flexDirection: "column",
                position: "relative",
                margin: 0,
                width: "100%",
                height: "100%",
            },
            navHeaderView: {
                display: "flex",
                flexDirection: "row",
                height: 60,
                width: "100%",
                backgroundColor: "#dadada",
                zIndex: 1,
            },
            navArrowsContainer: {
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
            },
            navLeftArrow: {
                width: 48,
                height: 48,
                marginRight: 5,
                marginLeft: 10,
                opacity: backButtonOpacity,
            },
            navRightArrow: {
                width: 48,
                height: 48,
                marginRight: 10,
                marginLeft: 5,
                opacity: forwardButtonOpacity,
            },
            navBarTitleView: {
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                flex: 1,
            },
            titleText: {
                color: "#333333",
                fontWeight: "bold",
                fontSize: 18,
                overflow: "hidden",
                flexWrap: "nowrap",
            },
            loadingIndicatorContainer: {
                display: "flex",
                flexDirection: "row",
                justifyContent: "center",
                alignItems: "center",
                marginLeft: 10,
                marginRight: 10,
            },
            webView: {
                width: "100%",
                height: "100%",
                zIndex: 0,
            },
            closeButtonView: {
                height: 60,
                width: "100%",
                backgroundColor: "#dadada",
                zIndex: 1,
            },
            closeButtonContainer: {
                display: "flex",
                justifyContent: "center",
                width: "100%",
                height: "100%",
            },
            closeButtonText: {
                width: "100%",
                color: "#2969a0",
                margin: "auto",
                fontSize: 18,
                textAlign: "center",
            },
        });
    }
}
