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
         * The definition of a reward campaign.
         */
        export interface InitializeSession {}
    }

    /**
     * Namespace for all Request Models for this API.
     */
    export namespace requestModels {
        /**
         * Interface for the request of the Reward Verify API call.
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
             * ?
             */
            device_osv?: string;
            /**
             * ?
             */
            device_locale?: string;
            /**
             * ?
             */
            device_timezone?: string;
            /**
             * ?
             */
            device_carrier?: string;
            /**
             * ?
             */
            device_height?: number;
            /**
             * ?
             */
            device_width?: number;
            /**
             * ?
             */
            device_density?: string;
            /**
             * ?
             */
            allow_retargeting?: boolean;
            /**
             * ?
             */
            created_at?: number;
            /**
             * ?
             */
            sdk_version?: string;
            /**
             * ?
             */
            params?: { [key: string]: string };
        }
    }

    /**
     * Namespace for all Response Models for this API.
     */
    export namespace responseModels {
        /**
         * The base properties for an API response.
         */
        interface BaseResponse {
            /**
             * The response status.
             */
            status: string;
            /**
             * The response message.
             */
            message: string;
            /**
             * The time at which the response was created.
             */
            created_at: string;
        }

        /**
         * Interface for the response of the Campaign API request.
         */
        export interface InitializeSessionResponse extends BaseResponse {}
    }
}
