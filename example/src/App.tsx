/**
 * Test app component for testing the
 * {@link AdadaptedReactNativeSdk} package/module.
 */
import React, { FC, ReactElement, useMemo, useRef } from "react";
import { useState, useEffect } from "react";
import {
    StyleSheet,
    View,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    SafeAreaView,
    Button,
} from "react-native";
import {
    AdadaptedReactNativeSdk,
    AdZoneInfo,
    ApiEnv,
    KeywordSearchResult,
} from "../../src/index";
import { DeepLinking, NativeRouter } from "react-router-native";

/**
 * Creates the main component for the App.
 */
export const App: FC = (): ReactElement => {
    /**
     * Determine if this is first mount for useEffects.
     */
    const isInitialMount = useRef(true);

    // - Define all useStates.
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const [adZoneInfoList, setAdZoneInfoList] = useState<
        AdZoneInfo[] | undefined
    >(undefined);
    const [searchValue, setSearchValue] = useState("");
    const [
        standardProductSearchResultItemList,
        setStandardProductSearchResultItemList,
    ] = useState<string[]>([]);
    const [aasdkSearchResultItemList, setAasdkSearchResultItemList] = useState<
        KeywordSearchResult[]
    >([]);
    const [selectedItemList, setSelectedItemList] = useState<string[]>([]);
    const [isVisible, setIsVisible] = useState<boolean>(true);

    /**
     * The {@link AdadaptedReactNativeSdk} instance.
     */
    const aaSdk = useMemo(() => {
        return new AdadaptedReactNativeSdk();
    }, []);

    // - Define all useEffect triggers.
    useEffect(() => {
        // You can use the "AdAdapted SDK Tester (iOS)" app in Platform dev for testing.
        aaSdk
            .initialize({
                appId: "7D58810X6333241C",
                apiEnv: ApiEnv.Dev,
                // iOS Optional custom advertiserID - Delete next line to use IDFA instead.
                advertiserId: "REACT-NATIVE-TEST-ADVERTISER-ID",
                xyDragDistanceAllowed: 30,
                onAdZonesRefreshed: () => {
                    setSessionId(aaSdk!.getSessionId());
                    setAdZoneInfoList(aaSdk!.getAdZones());
                },
                onAddToListTriggered: (items) => {
                    // Demonstrate adding all provided items to the
                    // client side list.
                    for (const item of items) {
                        selectItem({
                            itemName: item.product_title,
                        });
                    }
                },
                onOutOfAppPayloadAvailable: (payloads) => {
                    // Demonstrate adding all provided items to the
                    // client side list.
                    for (const payload of payloads) {
                        for (const item of payload.detailed_list_items) {
                            selectItem({
                                itemName: item.product_title,
                            });
                        }

                        // Mark this payload as acknowledged.
                        aaSdk.markPayloadContentAcknowledged(
                            payload.payload_id
                        );
                    }
                },
                // Set to true if ad zone is off-screen at initial render.
                defaultToInvisibleAdZone: false,
            })
            .then(() => {
                setSessionId(aaSdk.getSessionId());
                setAdZoneInfoList(aaSdk.getAdZones());
            })
            .catch((err) => {
                console.error(err);
            });
        return () => {
            // Unmount the SDK.
            if (aaSdk) {
                aaSdk.unmount();
            }
        };
    }, []);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            handleOnSearchValueChanged(searchValue);
        }
    }, [searchValue]);

    useEffect(() => {
        if (adZoneInfoList) {
            aaSdk.onAdZoneVisibilityChanged();
        }
    }, [isVisible]);

    /**
     * Triggered when the search text field's value has changed.
     * @param searchValue - The search string.
     */
    function handleOnSearchValueChanged(searchValue: string): void {
        if (aaSdk) {
            const aasdkSearchResults = aaSdk.performKeywordSearch(searchValue);

            // Randomly choose one of the resulting terms to display.
            // You can add multiple randomly chosen terms here too
            // if you would like.
            const finalAasdkSearchResults: KeywordSearchResult[] = [];

            if (aasdkSearchResults.length > 0) {
                const randomIndex = Math.floor(
                    Math.random() * aasdkSearchResults.length
                );
                finalAasdkSearchResults.push(aasdkSearchResults[randomIndex]);

                // Report up the "presented" event to the AA SDK.
                aaSdk.reportKeywordInterceptTermsPresented([
                    aasdkSearchResults[randomIndex].term_id,
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

            const finalSearchResult = finalStandardProductSearchResultsStringStart.concat(
                finalStandardProductSearchResultsStringContains
            );
            setStandardProductSearchResultItemList(finalSearchResult);
            setAasdkSearchResultItemList(finalAasdkSearchResults);
        }
    }

    /**
     * Adds the selected item to the selected item list.
     * @param selectedItem - The item to select.
     */
    function selectItem(selectedItem: SelectedItem): void {
        if (aaSdk) {
            let listItem = "";
            if (selectedItem.item) {
                // Report the ad item as added to list manager.
                aaSdk.reportItemsAddedToList(
                    [selectedItem.item.replacement],
                    "My grocery list"
                );
                listItem = selectedItem.item.replacement;
            } else if (selectedItem.itemName) {
                // Acknowledge item added to user list for reporting.
                aaSdk.acknowledge(selectedItem.itemName);

                // Report the non-ad item as added to list manager.
                aaSdk.reportItemsAddedToList(
                    [selectedItem.itemName],
                    "My grocery list"
                );
                listItem = selectedItem.itemName;
            }

            setSelectedItemList((prevSelectedItemList) => [
                ...prevSelectedItemList,
                listItem,
            ]);
        }
    }

    return (
        <NativeRouter>
            <DeepLinking />
            <SafeAreaView style={styles.safeAreaView}>
                <ScrollView
                    style={styles.mainView}
                    contentContainerStyle={{
                        alignItems: "center",
                        justifyContent: "center",
                        marginTop: 40,
                    }}
                >
                    <Text style={styles.sessionIdContainer}>
                        Session ID: {sessionId}
                    </Text>
                    <TextInput
                        value={searchValue}
                        style={styles.searchTextField}
                        onChangeText={(value) => {
                            setSearchValue(value);
                        }}
                    />
                    <View style={styles.searchView}>
                        <Text style={styles.searchResultsTitle}>
                            Search Results:
                        </Text>
                        {aasdkSearchResultItemList.map((itemObj) => (
                            <TouchableOpacity
                                key={itemObj.term_id}
                                style={styles.searchResultContainer}
                                onPress={() => {
                                    selectItem({
                                        item: itemObj,
                                    });

                                    setSearchValue("");
                                }}
                            >
                                <Text style={styles.searchResultText}>
                                    {itemObj.replacement}
                                </Text>
                                <Text style={styles.searchResultAdBadge}>
                                    AD
                                </Text>
                            </TouchableOpacity>
                        ))}
                        {standardProductSearchResultItemList.map(
                            (itemName, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={styles.searchResultContainer}
                                    onPress={() => {
                                        selectItem({
                                            itemName,
                                        });

                                        let isKeywordIntercept = false;

                                        for (const keywordSearchResultObj of aasdkSearchResultItemList) {
                                            if (
                                                keywordSearchResultObj.replacement ===
                                                itemName
                                            ) {
                                                isKeywordIntercept = true;
                                            }
                                        }

                                        if (aaSdk && isKeywordIntercept) {
                                            // Report up the "selected" event to the AA SDK.
                                            aaSdk.reportKeywordInterceptTermSelected(
                                                itemName
                                            );
                                        }
                                        setSearchValue("");
                                    }}
                                >
                                    <Text style={styles.searchResultText}>
                                        {itemName}
                                    </Text>
                                </TouchableOpacity>
                            )
                        )}
                    </View>
                    <Button
                        title="toggle visibility"
                        onPress={() =>
                            setIsVisible(
                                (prevVisibleState) => !prevVisibleState
                            )
                        }
                    ></Button>
                    {adZoneInfoList?.map((adZoneInfo, idx) => {
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
                        {selectedItemList?.map((item, idx) => {
                            return (
                                <Text key={idx} style={styles.listItem}>
                                    {item}
                                </Text>
                            );
                        })}
                    </View>
                </ScrollView>
            </SafeAreaView>
        </NativeRouter>
    );
};

/**
 * Interfaced used to pass in an item to the {@link App.selectItem} method.
 * Only one of the two properties should be provided.
 */
interface SelectedItem {
    /**
     * The object containing a keyword search item.
     */
    item?: KeywordSearchResult;
    /**
     * A standard product name.
     */
    itemName?: string;
}

const styles = StyleSheet.create({
    safeAreaView: {
        flex: 1,
    },
    mainView: {
        flex: 1,
        backgroundColor: "pink",
    },
    sessionIdContainer: {
        backgroundColor: "yellow",
        width: "100%",
        marginBottom: 20,
        padding: 10,
    },
    adZoneContainer: {
        paddingTop: 20,
        paddingBottom: 20,
        width: "100%",
        height: 130,
    },
    searchTextField: {
        flex: 0,
        width: "95%",
        height: 40,
        backgroundColor: "white",
        borderColor: "gray",
        borderWidth: 1,
        padding: 10,
        margin: 10,
    },
    searchView: {
        flex: 0,
        width: "100%",
    },
    searchResultsTitle: {
        backgroundColor: "orange",
        width: "100%",
        padding: 10,
        fontWeight: "bold",
    },
    searchResultContainer: {
        flexDirection: "row",
        padding: 10,
        marginTop: 1,
        backgroundColor: "#d9f9b1",
        alignItems: "flex-start",
    },
    searchResultText: {
        flex: 0,
        color: "#333333",
    },
    searchResultAdBadge: {
        flex: 1,
        color: "#ff605b",
        textAlign: "right",
    },
    listItemContainer: {
        flex: 0,
        width: "100%",
        marginBottom: 80,
    },
    listItem: {
        padding: 10,
        marginTop: 1,
        backgroundColor: "#6ca3f9",
        color: "#333333",
    },
    selectedItemResultsTitle: {
        backgroundColor: "orange",
        width: "100%",
        padding: 10,
        fontWeight: "bold",
    },
});

/**
 * Used to provide the app a set of non-ad products to display
 * along with ad products provided by the AdAdapted SDK.
 * Add additional products here as necessary.
 */
const AVAILABLE_PRODUCTS: string[] = ["milk", "coffee", "cheese"];
