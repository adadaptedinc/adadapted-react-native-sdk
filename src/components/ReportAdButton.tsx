import React, { useEffect } from "react";
import { Image, Linking, StyleSheet, TouchableOpacity } from "react-native";

interface Props {
    /**
     * The ad id of the current ad.
     */
    adId: string;
    /**
     *  The current user's udid.
     */
    udid: string;
}

/**
 * Creates the ReportAdButton component.
 * @param props The component's props.
 * @returns a reportSdButton JSX Element.
 */
export function ReportAdButton(props: Props): React.JSX.Element {
    const reportAdUrlBase = new URL("https://feedback.add-it.io/");

    const styles = StyleSheet.create({
        buttonStyle: {
            width: 14,
            height: 14,
        },
    });

    useEffect(() => {
        reportAdUrlBase.searchParams.append("aid", props.adId);
        reportAdUrlBase.searchParams.append("uid", props.udid);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props]);

    return (
        <TouchableOpacity
            style={styles.buttonStyle}
            onPress={() => {
                Linking.openURL(reportAdUrlBase.toString());
            }}
        >
            <Image source={require("../images/ReportIcon.png")} />
        </TouchableOpacity>
    );
}
