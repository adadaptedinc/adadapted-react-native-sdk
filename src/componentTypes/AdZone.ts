import { ViewStyle } from "react-native";
import { Zone, DetailedListItem } from "src/api/adadaptedApiTypes";
import { DeviceTypes } from "./Device";
import { EnvironmentTypes } from "./Environment";

/**
 * Namespace for AdZone types.
 */
export namespace AdZoneTypes {
    /**
     * Props interface for an ad zone.
     */
    export interface Props {
        /**
         * The app ID.
         */
        appId: string;
        /**
         * The session ID.
         */
        sessionId: string;
        /**
         * The UDID.
         */
        udid: string;
        /**
         * The touch sensitivity of the Ad Zone in both the X and Y directions.
         * This is used to determine the click/press sensitivity when the
         * Ad Zone is being touched by the user as a regular touch or while
         * scrolling the view. If the amount of touch "drag" distance in either
         * X or Y direction is less than this value, we will treat the action as
         * a click/press on the Ad Zone.
         */
        xyDragDistanceAllowed: number;
        /**
         * The device OS used for API requests.
         */
        deviceOs: DeviceTypes.DeviceOS;
        /**
         * The API environment to use when making an API request.
         */
        apiEnv: EnvironmentTypes.ApiEnv;
        /**
         * The ad zone data.
         */
        adZoneData: Zone;
        /**
         * Callback that gets triggered when an "add to list" item/items are clicked.
         * @param items - The array of items to "add to list".
         */
        onAddToListTriggered?(items: DetailedListItem[]): void;
        /**
         * An ad zone that is not visible on screen for the initial render.
         */
        offScreenAdZone: boolean;
        /**
         * Track the ad zone visibility in parent component. (for off-screen ads)
         */
        isAdZoneVisible?: boolean;
        /**
         * Flag to determine if the ad is contextual.
         */
        isContextualAd?: boolean;
    }

    /**
     * Interface for tracking "touch" coordinates.
     */
    export interface TouchCoordinates {
        /**
         * The X coordinate for the touch.
         */
        x: number;
        /**
         * The Y coordinate for the touch.
         */
        y: number;
    }

    /**
     * Defines the style typing for the component.
     */
    export interface StyleDef {
        /**
         * Styles for the main View element.
         */
        mainView: ViewStyle;
        /**
         * Styles for the WebView element.
         */
        webView: ViewStyle;
        /**
         * Styles for the ReportAdButton.
         */
        reportAd: ViewStyle;
    }
}
