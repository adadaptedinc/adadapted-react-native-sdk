/**
 * A namespace containing all API interfaces,
 * types, enums, etc. for the AdAdapted API.
 *
 * NOTE: In order for bable to translate namespaces properly, a plugin needed
 *      to be used and setup in the bable.config.js file.
 * https://babeljs.io/docs/en/babel-plugin-transform-typescript#impartial-namespace-support
 */
export namespace adadaptedApiTypes {
    /**
     * Namespace for all data models used for this API.
     */
    export namespace models {
        /**
         * The definition of an ad session data object.
         */
        export interface AdSession {
            /**
             * The session ID.
             */
            session_id: string;
            /**
             * If true, ads will be served.
             */
            will_serve_ads: boolean;
            /**
             * If true, there are active campaigns.
             */
            active_campaigns: boolean;
            /**
             * How often to refresh session/ad data?
             */
            polling_interval_ms: number;
            /**
             * The time at which the session will expire.
             */
            session_expires_at: number;
            /**
             * All ad zones.
             */
            zones: { [key: number]: Zone };
        }

        /**
         * The definition of a zone.
         */
        export interface Zone {
            /**
             * The zone ID.
             */
            id: string;
            /**
             * ?
             */
            land_height: number;
            /**
             * ?
             */
            land_width: number;
            /**
             * ?
             */
            port_height: number;
            /**
             * ?
             */
            port_width: number;
            /**
             * The available ads.
             */
            ads: Ad[];
        }

        /**
         * The definition of an Ad.
         */
        export interface Ad {
            /**
             * The ad ID.
             */
            ad_id: string;
            /**
             * The impression ID.
             */
            impression_id: string;
            /**
             * The type of ad this is.
             */
            type: string;
            /**
             * How often the ad refreshes? Swaps out for another?
             * Length of time in seconds.
             */
            refresh_time: number;
            /**
             * The URL for the ad image to display.
             */
            creative_url: string;
            /**
             * The tracking pixel to include in the zone view for this ad?
             */
            tracking_html: string;
            /**
             * ?
             */
            action_path: string;
            /**
             * ?
             */
            action_type: string;
            /**
             * If true, the ad will be hidden after interaction.
             */
            hide_after_interaction: boolean;
            /**
             * ?
             */
            payload: AdPayload;
            /**
             * ?
             */
            popup: AdPopup;
        }

        /**
         * The definition of an Ad Payload.
         */
        export interface AdPayload {
            /**
             * ?
             */
            detailed_list_items: DetailedListItem[];
        }

        /**
         * The definition of a Detailed List Item.
         */
        export interface DetailedListItem {
            /**
             * The barcode of the product.
             */
            product_barcode: string;
            /**
             * The brand of the product.
             */
            product_brand: string;
            /**
             * The category of the product.
             */
            product_category: string;
            /**
             * The discount given for the product.
             */
            product_discount: string;
            /**
             * The image used for display of the product.
             */
            product_image: string;
            /**
             * The SKU of the product.
             */
            product_sku: string;
            /**
             * The name/title of the product.
             */
            product_title: string;
        }

        /**
         * The definition of an Ad Popup.
         */
        export interface AdPopup {
            /**
             * ?
             */
            alt_close_btn: string;
            /**
             * ?
             */
            background_color: string;
            /**
             * ?
             */
            hide_banner: boolean;
            /**
             * ?
             */
            hide_browser_nav: boolean;
            /**
             * ?
             */
            hide_close_btn: boolean;
            /**
             * ?
             */
            text_color: string;
            /**
             * ?
             */
            title_text: string;
            /**
             * ?
             */
            type: string;
        }
    }

    /**
     * Namespace for all Request Models for this API.
     */
    export namespace requestModels {
        /**
         * Interface for the request of the Initialize Session API call.
         */
        export interface InitializeSessionRequest {
            /**
             * The app ID provided by the client using the API.
             */
            app_id: string;
            /**
             * The unique device ID of the users device.
             */
            udid: string;
            /**
             * The bundle ID.
             */
            bundle_id?: string;
            /**
             * The bundle version.
             */
            bundle_version?: string;
            /**
             * The name of the device.
             */
            device_name?: string;
            /**
             * The unique device ID of the users device.
             */
            device_udid?: string;
            /**
             * The OS of the device.
             */
            device_os?: string;
            /**
             * The OS version of the device.
             */
            device_osv?: string;
            /**
             * The locale the device is currently set for.
             */
            device_locale?: string;
            /**
             * The timezone the device is currently set for.
             */
            device_timezone?: string;
            /**
             * The device carrier name.
             */
            device_carrier?: string;
            /**
             * The height of the devices screen in pixels.
             */
            device_height?: number;
            /**
             * The width of the devices screen in pixels.
             */
            device_width?: number;
            /**
             * The density of the devices screen.
             */
            device_density?: string;
            /**
             * If true, the device allows for ad retargeting.
             */
            allow_retargeting?: boolean;
            /**
             * ?
             */
            created_at?: number;
            /**
             * The AdAdapted SDK version number.
             */
            sdk_version?: string;
            /**
             * ?
             */
            params?: { [key: string]: string };
        }

        /**
         * Interface for the request of the Refresh Session Data API call.
         */
        export interface RefreshSessionDataRequest {
            /**
             * The app ID provided by the client using the API.
             */
            aid: string;
            /**
             * The unique device ID.
             */
            uid: string;
            /**
             * The current session ID.
             */
            sid: string;
        }
    }

    /**
     * Namespace for all Response Models for this API.
     */
    export namespace responseModels {
        /**
         * Interface for the response of the Campaign API request.
         */
        export interface InitializeSessionResponse extends models.AdSession {}

        /**
         * Interface for the response of the Campaign API request.
         */
        export interface RefreshSessionDataResponse extends models.AdSession {}
    }
}
