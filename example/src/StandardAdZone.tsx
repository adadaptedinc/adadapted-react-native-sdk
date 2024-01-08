/**
 * Test app component for testing the
 * {@link AdadaptedReactNativeSdk} package/module.
 */
import React, { useRef } from "react";
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
    KeywordSearchResult,
} from "../../src/index";
import { RootStackParamList, SelectedItem } from "./App";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";

type StandardAdZoneProp = NativeStackNavigationProp<
    RootStackParamList,
    "StandardAdZone"
>;

/**
 * Props interface for {@link StandardAdZonePage}.
 */
interface StandardAdZonePageProps {
    /**
     * The adadapted sdk instance.
     */
    aaSdk: AdadaptedReactNativeSdk;
    /**
     * The current session's id.
     */
    sessionId: string | undefined;
    /**
     * The ad zones' data.
     */
    adZoneInfoList: AdZoneInfo[] | undefined;
    /**
     * The selected list items array.
     */
    selectedItemList: string[];
    /**
     * Adds selected item to grocery list;
     */
    selectItem(item: SelectedItem): void;
}

/**
 * Creates a standard ad zone exmple component.
 */
export const StandardAdZonePage = (props: StandardAdZonePageProps) => {
    // navigation
    const navigation = useNavigation<StandardAdZoneProp>();
    /**
     * Determine if this is first mount for useEffects.
     */
    const isInitialMount = useRef(true);

    // - Define all useStates.
    const [searchValue, setSearchValue] = useState("");
    const [
        standardProductSearchResultItemList,
        setStandardProductSearchResultItemList,
    ] = useState<string[]>([]);
    const [aasdkSearchResultItemList, setAasdkSearchResultItemList] = useState<
        KeywordSearchResult[]
    >([]);

    // - Define all useEffect triggers.
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
        } else {
            handleOnSearchValueChanged(searchValue);
        }
    }, [searchValue]);

    /**
     * Triggered when the search text field's value has changed.
     * @param searchValue - The search string.
     */
    function handleOnSearchValueChanged(searchValue: string): void {
        if (props.aaSdk) {
            const aasdkSearchResults =
                props.aaSdk.performKeywordSearch(searchValue);

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
                props.aaSdk.reportKeywordInterceptTermsPresented([
                    aasdkSearchResults[randomIndex].term_id,
                ]);
            }

            // Search for all standard items using the search value.
            const finalStandardProductSearchResultsStringStart: string[] = [];
            const finalStandardProductSearchResultsStringContains: string[] =
                [];

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

            const finalSearchResult =
                finalStandardProductSearchResultsStringStart.concat(
                    finalStandardProductSearchResultsStringContains
                );
            setStandardProductSearchResultItemList(finalSearchResult);
            setAasdkSearchResultItemList(finalAasdkSearchResults);
        }
    }

    return (
        <SafeAreaView style={styles.safeAreaView}>
            <ScrollView
                style={styles.mainView}
                contentContainerStyle={{
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 40,
                }}
            >
                <Button
                    title="off-screen ad zone"
                    onPress={() => navigation.navigate("OffScreenAdZone")}
                ></Button>
                <Text style={styles.sessionIdContainer}>
                    Session ID: {props.sessionId}
                </Text>
                {props.adZoneInfoList?.map((adZoneInfo, idx) => {
                    return (
                        <View key={idx} style={styles.adZoneContainer}>
                            {adZoneInfo.adZone}
                        </View>
                    );
                })}
                <TextInput
                    value={searchValue}
                    style={styles.searchTextField}
                    onChangeText={(value) => {
                        setSearchValue(value);
                    }}
                />
                <View style={styles.searchView}>
                    {aasdkSearchResultItemList.map((itemObj) => (
                        <TouchableOpacity
                            key={itemObj.term_id}
                            style={styles.searchResultContainer}
                            onPress={() => {
                                props.selectItem({
                                    item: itemObj,
                                });

                                setSearchValue("");
                            }}
                        >
                            <Text style={styles.searchResultText}>
                                {itemObj.replacement}
                            </Text>
                            <Text style={styles.searchResultAdBadge}>AD</Text>
                        </TouchableOpacity>
                    ))}
                    {standardProductSearchResultItemList.map(
                        (itemName, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.searchResultContainer}
                                onPress={() => {
                                    props.selectItem({
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

                                    if (props.aaSdk && isKeywordIntercept) {
                                        // Report up the "selected" event to the AA SDK.
                                        props.aaSdk.reportKeywordInterceptTermSelected(
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
                <View style={styles.listItemContainer}>
                    <Text style={styles.selectedItemResultsTitle}>
                        My Shopping List:
                    </Text>
                    {props.selectedItemList?.map((item, idx) => {
                        return (
                            <Text key={idx} style={styles.listItem}>
                                {item}
                            </Text>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeAreaView: {
        flex: 1,
    },
    mainView: {
        flex: 1,
        backgroundColor: "white",
    },
    sessionIdContainer: {
        backgroundColor: "#F67A48",
        width: "100%",
        padding: 10,
    },
    adZoneContainer: {
        borderColor: "gray",
        borderWidth: 2,
        marginTop: 10,
        marginBottom: 10,
        width: "100%",
        height: 120,
    },
    searchTextField: {
        flex: 0,
        width: "95%",
        height: 40,
        backgroundColor: "white",
        borderColor: "gray",
        borderWidth: 1,
        padding: 10,
        marginTop: 10,
    },
    searchView: {
        flex: 0,
        width: "95%",
    },
    searchResultContainer: {
        flexDirection: "row",
        padding: 10,
        marginTop: 1,
        backgroundColor: "#78C7EA",
        alignItems: "flex-start",
    },
    searchResultText: {
        flex: 0,
        color: "#172B61",
    },
    searchResultAdBadge: {
        flex: 1,
        color: "#F67A48",
        textAlign: "right",
    },
    listItemContainer: {
        flex: 0,
        width: "100%",
        marginTop: 10,
    },
    listItem: {
        padding: 10,
        marginTop: 1,
        backgroundColor: "#78C7EA",
        color: "#172B61",
    },
    selectedItemResultsTitle: {
        backgroundColor: "#172B61",
        color: "#E6E7E8",
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
