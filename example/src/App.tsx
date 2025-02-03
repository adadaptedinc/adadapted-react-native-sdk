/**
 * Test app component for testing the
 * {@link AdadaptedReactNativeSdk} package/module.
 */
import React, { useMemo } from "react";
import { useState, useEffect } from "react";
import {
    AdadaptedReactNativeSdk,
    AdZoneInfo,
    KeywordSearchResult,
} from "../../src/index";
import { EnvironmentTypes } from "../../src/componentTypes/Environment";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StandardAdZonePage } from "./StandardAdZone";
import { OffScreenAdZonePage } from "./OffScreenAdZone";

/**
 * Interfaced used to pass in an item to the {@link StandardAdZonePage.selectItem} method.
 * Only one of the two properties should be provided.
 */
export interface SelectedItem {
    /**
     * The object containing a keyword search item.
     */
    item?: KeywordSearchResult;
    /**
     * A standard product name.
     */
    itemName?: string;
}

export type RootStackParamList = {
    StandardAdZone: undefined;
    OffScreenAdZone: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Creates the main component for the App.
 */
export const App = () => {
    // - Define all useStates.
    const [sessionId, setSessionId] = useState<string | undefined>(undefined);
    const [adZoneInfoList, setAdZoneInfoList] = useState<
        AdZoneInfo[] | undefined
    >(undefined);
    const [offScreenAdZoneInfoList, setOffScreenAdZoneInfoList] =
        useState<AdZoneInfo[]>();
    const [selectedItemList, setSelectedItemList] = useState<string[]>([]);

    /**
     * The {@link AdadaptedReactNativeSdk} instance.
     */
    const aaSdk = useMemo(() => {
        return new AdadaptedReactNativeSdk();
    }, []);

    // - Define all useEffect triggers.
    useEffect(() => {
        aaSdk
            .initialize({
                appId: "7D58810X6333241C",
                apiEnv: EnvironmentTypes.ApiEnv.Dev,
                // Optional custom advertiserID - Delete next line to use IDFA instead.
                advertiserId: "REACT-NATIVE-TEST-ADVERTISER-ID",
                xyDragDistanceAllowed: 30,
                onAdZonesRefreshed: () => {
                    setSessionId(aaSdk!.getSessionId());
                    setAdZoneInfoList(aaSdk!.getAdZones());
                    setOffScreenAdZoneInfoList(aaSdk.getOffScreenAdZones());
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
                onOutOfAppPayloadAvailable: (items) => {
                    // Demonstrate adding all provided items to the
                    // client side list.
                    for (const payload of items) {
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
                // List an array of ad zones that contain off-screen ads here if applicable.
                offScreenAdZoneIds: [110003],
            })
            .then(() => {
                setSessionId(aaSdk.getSessionId());
                setAdZoneInfoList(aaSdk.getAdZones());
                setOffScreenAdZoneInfoList(aaSdk.getOffScreenAdZones());
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

    /**
     * Adds the selected item to the selected item list.
     * @param selectedItem - The item to select.
     */
    const selectItem = (selectedItem: SelectedItem): void => {
        if (aaSdk) {
            let listItem = "";
            if (selectedItem.item) {
                aaSdk.acknowledge(selectedItem.item.replacement);
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
    };

    return (
        <NavigationContainer>
            <Stack.Navigator initialRouteName="StandardAdZone">
                <Stack.Screen name="StandardAdZone">
                    {() => (
                        <StandardAdZonePage
                            aaSdk={aaSdk}
                            sessionId={sessionId}
                            adZoneInfoList={adZoneInfoList}
                            selectedItemList={selectedItemList}
                            selectItem={selectItem}
                        />
                    )}
                </Stack.Screen>
                <Stack.Screen name="OffScreenAdZone">
                    {() => (
                        <OffScreenAdZonePage
                            aaSdk={aaSdk}
                            sessionId={sessionId}
                            adZoneInfoList={offScreenAdZoneInfoList}
                            selectedItemList={selectedItemList}
                            selectItem={selectItem}
                        />
                    )}
                </Stack.Screen>
            </Stack.Navigator>
        </NavigationContainer>
    );
};
