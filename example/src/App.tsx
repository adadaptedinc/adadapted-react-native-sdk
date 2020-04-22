/**
 * Test app component for testing the
 * {@link AdadaptedReactNativeSdk} package/module.
 */
import * as React from "react";
import { StyleSheet, View, Text } from "react-native";
import { AdadaptedReactNativeSdk } from "adadapted-react-native-sdk";
import { ApiEnv } from "../../src/types";

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
}

/**
 * Creates the main component for the App.
 */
export class App extends React.Component<Props, State> {
    /**
     * The {@link AdadaptedReactNativeSdk} instance.
     */
    private adadaptedReactNativeSdk: AdadaptedReactNativeSdk | undefined;

    /**
     * @inheritDoc
     */
    constructor(props: Props, context?: any) {
        super(props, context);

        this.state = {
            sessionId: undefined
        };
    }

    /**
     * @inheritDoc
     */
    public componentDidMount(): void {
        this.adadaptedReactNativeSdk = new AdadaptedReactNativeSdk();

        this.adadaptedReactNativeSdk
            .initialize("NTLKNZKYMMI2NTM1", ApiEnv.Dev)
            .then(() => {
                console.log("Initialized");
                this.setState({
                    sessionId: this.adadaptedReactNativeSdk?.getSessionId()
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
            <View style={styles.container}>
                <Text>Session ID: {this.state.sessionId}</Text>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center"
    }
});

export default App;
