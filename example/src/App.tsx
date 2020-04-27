/**
 * Test app component for testing the
 * {@link AdadaptedReactNativeSdk} package/module.
 */
import * as React from "react";
import { StyleSheet, View, Text } from "react-native";
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
}

/**
 * Creates the main component for the App.
 */
export class App extends React.Component<Props, State> {
    /**
     * The {@link AdadaptedReactNativeSdk.Sdk} instance.
     */
    private aaSdk: AdadaptedReactNativeSdk.Sdk | undefined;

    /**
     * @inheritDoc
     */
    constructor(props: Props, context?: any) {
        super(props, context);

        this.state = {
            sessionId: undefined,
            adZoneInfoList: undefined
        };
    }

    /**
     * @inheritDoc
     */
    public componentDidMount(): void {
        this.aaSdk = new AdadaptedReactNativeSdk.Sdk();

        this.aaSdk
            .initialize({
                appId: "NTLKNZKYMMI2NTM1",
                apiEnv: AdadaptedReactNativeSdk.ApiEnv.Dev,
                onAdZonesRefreshed: () => {
                    this.setState(
                        {
                            sessionId: this.aaSdk?.getSessionId(),
                            adZoneInfoList: this.aaSdk?.getAdZones()
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
                    sessionId: this.aaSdk?.getSessionId(),
                    adZoneInfoList: this.aaSdk?.getAdZones()
                });
            })
            .catch((err) => {
                console.log(err);
            });
    }

    /**
     * @inheritDoc
     */
    public render(): JSX.Element {
        return (
            <View style={styles.mainView}>
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
        width: "100%"
    },
    adZoneContainer: {
        paddingTop: 20,
        paddingBottom: 20,
        backgroundColor: "purple",
        width: "100%",
        height: 200
    }
});
