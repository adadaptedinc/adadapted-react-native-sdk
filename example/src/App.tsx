/**
 * Test app component for testing the
 * {@link AdadaptedReactNativeSdk} package/module.
 */
import * as React from "react";
import {
    StyleSheet,
    View,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity
} from "react-native";
import { AdadaptedReactNativeSdk } from "adadapted-react-native-sdk";

/**
 * Props interface for {@link App}.
 */
interface Props {}

/**
 * State interface for {@link App}.
 */
interface State {
    /**
     * The session ID.
     */
    sessionId: string | undefined;
    /**
     * The Ad Zone Info list.
     */
    adZoneInfoList: AdadaptedReactNativeSdk.AdZoneInfo[] | undefined;
    /**
     * The test search term value.
     */
    searchValue: string;
    /**
     * Standard products search result item list.
     */
    standardProductSearchResultItemList: string[];
    /**
     * AdAdapted SDK Keyword Search result item list.
     */
    aasdkSearchResultItemList: AdadaptedReactNativeSdk.KeywordSearchResult[];
    /**
     * The selected item list.
     */
    selectedItemList: string[];
}

/**
 * Creates the main component for the App.
 */
export class App extends React.Component<Props, State> {
    /**
     * The {@link AdadaptedReactNativeSdk.Sdk} instance.
     */
    private readonly aaSdk: AdadaptedReactNativeSdk.Sdk;

    /**
     * @inheritDoc
     */
    constructor(props: Props, context?: any) {
        super(props, context);

        // Assign a reference to the SDK.
        this.aaSdk = new AdadaptedReactNativeSdk.Sdk();

        this.state = {
            sessionId: undefined,
            adZoneInfoList: undefined,
            searchValue: "",
            standardProductSearchResultItemList: [],
            aasdkSearchResultItemList: [],
            selectedItemList: []
        };
    }

    /**
     * @inheritDoc
     */
    public componentDidMount(): void {
        this.aaSdk
            .initialize({
                appId: "NTLKNZKYMMI2NTM1",
                apiEnv: AdadaptedReactNativeSdk.ApiEnv.Dev,
                onAdZonesRefreshed: () => {
                    this.setState({
                        sessionId: this.aaSdk.getSessionId(),
                        adZoneInfoList: this.aaSdk.getAdZones()
                    });
                }
            })
            .then(() => {
                this.setState({
                    sessionId: this.aaSdk.getSessionId(),
                    adZoneInfoList: this.aaSdk.getAdZones()
                });
            })
            .catch((err) => {
                console.error(err);
            });
    }

    /**
     * @inheritDoc
     */
    public componentWillUnmount(): void {
        // Unmount the SDK.
        if (this.aaSdk) {
            this.aaSdk.unmount();
        }
    }

    /**
     * @inheritDoc
     */
    public render(): JSX.Element {
        return (
            <ScrollView
                style={styles.mainView}
                contentContainerStyle={{
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 40
                }}
            >
                <Text style={styles.sessionIdContainer}>
                    Session ID: {this.state.sessionId}
                </Text>
                <TextInput
                    value={this.state.searchValue}
                    style={styles.searchTextField}
                    onChangeText={(value) => {
                        this.handleOnSearchValueChanged(value);
                    }}
                />
                <View style={styles.searchView}>
                    <Text style={styles.searchResultsTitle}>
                        Search Results:
                    </Text>
                    {this.state.aasdkSearchResultItemList.map((itemObj) => (
                        <TouchableOpacity
                            key={itemObj.term_id}
                            style={styles.searchResultContainer}
                            onPress={() => {
                                this.selectItem({
                                    item: itemObj
                                });
                            }}
                        >
                            <Text style={styles.searchResultText}>
                                {itemObj.replacement}
                            </Text>
                            <Text style={styles.searchResultAdBadge}>AD</Text>
                        </TouchableOpacity>
                    ))}
                    {this.state.standardProductSearchResultItemList.map(
                        (itemName, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.searchResultContainer}
                                onPress={() => {
                                    this.selectItem({
                                        itemName
                                    });
                                }}
                            >
                                <Text style={styles.searchResultText}>
                                    {itemName}
                                </Text>
                            </TouchableOpacity>
                        )
                    )}
                </View>
                {this.state.adZoneInfoList?.map((adZoneInfo, idx) => {
                    return (
                        <View key={idx} style={styles.adZoneContainer}>
                            {adZoneInfo.adZone}
                        </View>
                    );
                })}
                <View style={styles.listItemContainer}>
                    <Text style={styles.selectedItemResultsTitle}>
                        My Shopping List:
                    </Text>
                    {this.state.selectedItemList?.map((item, idx) => {
                        return (
                            <Text key={idx} style={styles.listItem}>
                                {item}
                            </Text>
                        );
                    })}
                </View>
            </ScrollView>
        );
    }

    /**
     * Triggered when the search text field's value has changed.
     * @param searchValue - The search string.
     */
    private handleOnSearchValueChanged(searchValue: string): void {
        const aasdkSearchResults = this.aaSdk.performKeywordSearch(searchValue);

        // Randomly choose one of the resulting terms to display.
        // You can add multiple randomly chosen terms here too
        // if you would like.
        const finalAasdkSearchResults: AdadaptedReactNativeSdk.KeywordSearchResult[] = [];

        if (aasdkSearchResults.length > 0) {
            const randomIndex = Math.floor(
                Math.random() * aasdkSearchResults.length
            );
            finalAasdkSearchResults.push(aasdkSearchResults[randomIndex]);

            // Report up the "presented" event to the AA SDK.
            this.aaSdk.reportKeywordInterceptTermsPresented([
                aasdkSearchResults[randomIndex].term_id
            ]);
        }

        // Search for all standard items using the search value.
        const finalStandardProductSearchResultsStringStart: string[] = [];
        const finalStandardProductSearchResultsStringContains: string[] = [];

        if (searchValue.trim().length > 0) {
            for (const productName of AVAILABLE_PRODUCTS) {
                if (
                    productName
                        .toLowerCase()
                        .startsWith(searchValue.toLowerCase())
                ) {
                    finalStandardProductSearchResultsStringStart.push(
                        productName
                    );
                } else if (
                    productName
                        .toLowerCase()
                        .indexOf(searchValue.toLowerCase()) !== -1
                ) {
                    finalStandardProductSearchResultsStringContains.push(
                        productName
                    );
                }
            }
        }

        this.setState({
            searchValue,
            standardProductSearchResultItemList: finalStandardProductSearchResultsStringStart.concat(
                finalStandardProductSearchResultsStringContains
            ),
            aasdkSearchResultItemList: finalAasdkSearchResults
        });
    }

    /**
     * Adds the selected item to the selected item list.
     * @param selectedItem - The item to select.
     */
    private selectItem(selectedItem: SelectedItem): void {
        if (selectedItem.item) {
            // Report up the "selected" event to the AA SDK.
            this.aaSdk.reportKeywordInterceptTermSelected(
                selectedItem.item.term_id
            );
        }

        this.setState((prevState) => {
            const finalList = prevState.selectedItemList;

            if (selectedItem.item) {
                finalList.push(selectedItem.item.replacement);
            } else if (selectedItem.itemName) {
                finalList.push(selectedItem.itemName);
            }

            return {
                selectedItemList: finalList
            };
        });
    }
}

/**
 * Interfaced used to pass in an item to the {@link App.selectItem} method.
 * Only one of the two properties should be provided.
 */
interface SelectedItem {
    /**
     * The object containing a keyword search item.
     */
    item?: AdadaptedReactNativeSdk.KeywordSearchResult;
    /**
     * A standard product name.
     */
    itemName?: string;
}

const styles = StyleSheet.create({
    mainView: {
        flex: 1,
        backgroundColor: "pink"
    },
    sessionIdContainer: {
        backgroundColor: "yellow",
        width: "100%",
        marginTop: 20,
        marginBottom: 20,
        padding: 10
    },
    adZoneContainer: {
        paddingTop: 20,
        paddingBottom: 20,
        width: "100%",
        height: 250
    },
    searchTextField: {
        flex: 0,
        width: "95%",
        height: 40,
        backgroundColor: "white",
        borderColor: "gray",
        borderWidth: 1,
        padding: 10,
        margin: 10
    },
    searchView: {
        flex: 0,
        width: "100%"
    },
    searchResultsTitle: {
        backgroundColor: "orange",
        width: "100%",
        padding: 10,
        fontWeight: "bold"
    },
    searchResultContainer: {
        flexDirection: "row",
        padding: 10,
        marginTop: 1,
        backgroundColor: "#d9f9b1",
        alignItems: "flex-start"
    },
    searchResultText: {
        flex: 0,
        color: "#333333"
    },
    searchResultAdBadge: {
        flex: 1,
        color: "#ff605b",
        textAlign: "right"
    },
    listItemContainer: {
        flex: 0,
        width: "100%",
        marginBottom: 80
    },
    listItem: {
        padding: 10,
        marginTop: 1,
        backgroundColor: "#6ca3f9",
        color: "#333333"
    },
    selectedItemResultsTitle: {
        backgroundColor: "orange",
        width: "100%",
        padding: 10,
        fontWeight: "bold"
    }
});

/**
 * Used to provide the app a set of non-ad products to display
 * along with ad products provided by the AdAdapted SDK.
 * Add additional products here as necessary.
 */
const AVAILABLE_PRODUCTS: string[] = [
    "Organic Valley Milk",
    "Dean's Milk",
    "Safeway Milk",
    "Shamrock Farms Milk",
    "Horizon Organic Milk",
    "Milk: Meijer",
    "Milk: Kroger",
    "Starbucks Coffee",
    "Folger's Classic Roast Coffee",
    "Newman's Own Organic Coffee",
    "Green Mountain Coffee",
    "Maxwell House Coffee",
    "Coffee: Meijer",
    "Coffee: Kroger",
    "Kraft Mac & Cheese",
    "Sargento Shredded Cheddar Cheese",
    "Philadelphia Cream Cheese",
    "Annie's Mac & Cheese",
    "Cheddar Cheese: Meijer",
    "Cheddar Cheese: Kroger",
    "Cheese: Meijer",
    "Cheese: Kroger"
];
