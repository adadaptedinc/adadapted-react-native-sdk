/**
 * Test app component for testing the
 * {@link AdadaptedReactNativeSdk} package/module.
 */
import * as React from "react";
import {
    StyleSheet,
    View,
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
     * Search Result Item List.
     */
    searchResultItemList: AdadaptedReactNativeSdk.KeywordSearchResult[];
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
            searchResultItemList: []
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
                    this.setState(
                        {
                            sessionId: this.aaSdk.getSessionId(),
                            adZoneInfoList: this.aaSdk.getAdZones()
                        },
                        () => {
                            console.log("state updated");
                        }
                    );
                }
            })
            .then(() => {
                console.log("Session Initialized");

                this.setState({
                    sessionId: this.aaSdk.getSessionId(),
                    adZoneInfoList: this.aaSdk.getAdZones()
                });
            })
            .catch((err) => {
                console.log(err);
            });
    }

    /**
     * @inheritDoc
     */
    public componentWillUnmount(): void {
        // Unmount the SDK.
        this.aaSdk && this.aaSdk.unmount();
    }

    /**
     * @inheritDoc
     */
    public render(): JSX.Element {
        return (
            <View style={styles.mainView}>
                <TextInput
                    value={this.state.searchValue}
                    style={styles.searchTextField}
                    onChangeText={(value) => {
                        const searchResults = this.aaSdk.performKeywordSearch(
                            value
                        );

                        this.setState({
                            searchValue: value,
                            searchResultItemList: searchResults
                        });
                    }}
                />
                <View style={styles.searchView}>
                    <Text style={styles.searchResultsTitle}>
                        Search Results:
                    </Text>
                    {this.state.searchResultItemList.map((item) => (
                        <TouchableOpacity
                            key={item.term_id}
                            style={styles.searchResultContainer}
                            onPress={() => {
                                this.selectItem(item);
                            }}
                        >
                            <Text style={styles.searchResultText}>
                                {item.replacement}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
                <Text style={styles.sessionIdContainer}>
                    Session ID: {this.state.sessionId}
                </Text>
                {this.state.adZoneInfoList?.map((adZoneInfo, idx) => {
                    return (
                        <View key={idx} style={styles.adZoneContainer}>
                            {adZoneInfo.adZone}
                        </View>
                    );
                })}
            </View>
        );
    }

    /**
     * Alters the item name selected.
     * @param item - The item to alert data from.
     */
    private selectItem(
        item: AdadaptedReactNativeSdk.KeywordSearchResult
    ): void {
        alert(`Added "${item.replacement}" to your shopping list!`);
    }
}

const styles = StyleSheet.create({
    mainView: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "pink"
    },
    sessionIdContainer: {
        backgroundColor: "yellow",
        width: "100%",
        marginTop: 20,
        marginBottom: 20
    },
    adZoneContainer: {
        paddingTop: 20,
        paddingBottom: 20,
        width: "100%",
        height: 200
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
        width: "100%"
    },
    searchResultContainer: {
        padding: 10,
        marginTop: 3,
        backgroundColor: "#d9f9b1",
        alignItems: "center"
    },
    searchResultText: {
        color: "#4f603c"
    }
});
