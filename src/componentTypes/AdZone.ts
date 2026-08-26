import { StyleProp, ViewStyle } from "react-native";
import { DetailedListItem } from "src/api/adadaptedApiTypes";

/**
 * Namespace for AdZone types.
 */
export namespace AdZoneTypes {
    /**
     * Props interface for an ad zone.
     *
     * NOTE: The zone declares only its own ID. App ID, session, device info and
     *       environment all come from the SDK, the same way AaZoneView reads them
     *       from the Android SDK's singletons rather than taking them as arguments.
     */
    export interface Props {
        /**
         * The ad zone ID to serve ads for. Supplied by the host app, which is the
         * only party that knows which zones it has been allocated.
         */
        zoneId: string;
        /**
         * Whether the zone is currently on screen. Defaults to true.
         *
         * The SDK cannot determine this in React Native, so the host app reports
         * it, exactly as AaZoneView.setAdZoneVisibility requires on Android. While
         * false the zone neither refreshes nor records impressions.
         */
        isVisible?: boolean;
        /**
         * The recipe context this zone is currently showing, if any. Equivalent to
         * AaZoneView.setAdZoneContextId.
         */
        contextId?: string;
        /**
         * The touch sensitivity of the Ad Zone in both the X and Y directions.
         * This is used to determine the click/press sensitivity when the
         * Ad Zone is being touched by the user as a regular touch or while
         * scrolling the view. If the amount of touch "drag" distance in either
         * X or Y direction is less than this value, we will treat the action as
         * a click/press on the Ad Zone.
         */
        xyDragDistanceAllowed?: number;
        /**
         * Style applied to the zone's outer View.
         */
        style?: StyleProp<ViewStyle>;
        /**
         * Callback that gets triggered when an "add to list" item/items are clicked.
         * @param items - The array of items to "add to list".
         */
        onAddToListTriggered?(items: DetailedListItem[]): void;
        /**
         * Called whenever the zone's fill state changes, so the host can collapse
         * or reveal the space around it. Mirrors AaZoneView.Listener.onZoneHasAds.
         * @param hasAds - True when an ad is currently available for the zone.
         */
        onZoneHasAds?(hasAds: boolean): void;
        /**
         * Called when an ad has been retrieved and displayed.
         * Mirrors AaZoneView.Listener.onAdLoaded.
         */
        onAdLoaded?(): void;
        /**
         * Called when an ad could not be retrieved or displayed.
         * Mirrors AaZoneView.Listener.onAdLoadFailed.
         */
        onAdLoadFailed?(): void;
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
     *
     * Declared as a type alias rather than an interface on purpose. React
     * Native's Strict TypeScript API constrains StyleSheet.create to a type
     * with a `readonly [key: string]` index signature, and interfaces do not
     * get an implicit index signature the way type aliases do.
     */
    export type StyleDef = {
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
    };
}
