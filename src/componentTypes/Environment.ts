/**
 * Namespace for environment types.
 */
export namespace EnvironmentTypes {
    /**
     * Enum defining the different API environments.
     */
    export enum ApiEnv {
        /**
         * The production API environment.
         */
        Prod = "https://ads.adadapted.com",
        /**
         * The development API environment.
         */
        Dev = "https://sandbox.adadapted.com",
        /**
         * Used only for unit testing/mock data.
         */
        Mock = "MOCK_DATA",
    }

    /**
     * Enum defining the different API environments for List Manager.
     */
    export enum ListManagerApiEnv {
        /**
         * The production API environment.
         */
        Prod = "https://ec.adadapted.com",
        /**
         * The development API environment.
         */
        Dev = "https://sandec.adadapted.com",
        /**
         * Used only for unit testing/mocking data.
         */
        Mock = "MOCK_DATA",
    }

    /**
     * Enum defining the different API environments for the Payload Server.
     */
    export enum PayloadApiEnv {
        /**
         * The production API environment.
         */
        Prod = "https://payload.adadapted.com",
        /**
         * The development API environment.
         */
        Dev = "https://sandpayload.adadapted.com",
        /**
         * Used only for unit testing/mocking data.
         */
        Mock = "MOCK_DATA",
    }
}
