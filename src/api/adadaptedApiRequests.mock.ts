/**
 * Contains all API request mocks for the Rewards API.
 */
import { AxiosResponse } from "axios";
import { adadaptedApiTypes } from "./adadaptedApiTypes";

/**
 * Mocks the API call for initializing a session.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function initializeSession(): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.InitializeSessionResponse>
> {
    return new Promise<
        AxiosResponse<
            adadaptedApiTypes.responseModels.InitializeSessionResponse
        >
    >((resolve) => {
        resolve({
            data: AD_SESSION_DATA,
            then: undefined,
            config: {},
            headers: {},
            status: 200,
            statusText: "200"
        });
    });
}

/**
 * Mocks the API call for refreshing session data.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function refreshSessionData(): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.RefreshSessionDataResponse>
> {
    return new Promise<
        AxiosResponse<
            adadaptedApiTypes.responseModels.RefreshSessionDataResponse
        >
    >((resolve) => {
        resolve({
            data: REFRESHED_AD_SESSION_DATA,
            then: undefined,
            config: {},
            headers: {},
            status: 200,
            statusText: "200"
        });
    });
}

/**
 * Mocks the API call for reporting an ad event.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function reportAdEvent(): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.ReportAdEventResponse>
> {
    return new Promise<
        AxiosResponse<adadaptedApiTypes.responseModels.ReportAdEventResponse>
    >((resolve) => {
        resolve({
            data: {
                results: ["Ok"]
            },
            then: undefined,
            config: {},
            headers: {},
            status: 200,
            statusText: "200"
        });
    });
}

/**
 * Mocks the API call for getting keyword intercepts.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function getKeywordIntercepts(): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.KeywordInterceptsResponse>
> {
    return new Promise<
        AxiosResponse<
            adadaptedApiTypes.responseModels.KeywordInterceptsResponse
        >
    >((resolve) => {
        resolve({
            data: KEYWORD_INTERCEPT_DATA,
            then: undefined,
            config: {},
            headers: {},
            status: 200,
            statusText: "200"
        });
    });
}

/**
 * Mocks the API call for reporting an ad event.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function reportInterceptEvent(): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.ReportInterceptEventResponse>
> {
    return new Promise<
        AxiosResponse<
            adadaptedApiTypes.responseModels.ReportInterceptEventResponse
        >
    >((resolve) => {
        resolve({
            data: {
                results: ["Ok"]
            },
            then: undefined,
            config: {},
            headers: {},
            status: 200,
            statusText: "200"
        });
    });
}

/**
 * Mock data for an {@link adadaptedApiTypes.models.AdSession} object.
 */
const AD_SESSION_DATA: adadaptedApiTypes.models.AdSession = {
    session_id: "TEST_SESSION_ID",
    will_serve_ads: true,
    active_campaigns: true,
    session_expires_at: 1587684561,
    polling_interval_ms: 1000,
    zones: {
        100838: {
            id: "100838",
            port_height: 250,
            port_width: 320,
            land_height: 250,
            land_width: 320,
            ads: [
                {
                    ad_id: "1815",
                    impression_id: "100838::C4D792785EA1EC91",
                    refresh_time: 60,
                    hide_after_interaction: false,
                    type: "html",
                    creative_url:
                        "https://sandbox.adadapted.com/a/NTLKNZKYMMI2NTM1;100838;1815?session_id=TEST_SESSION_ID&amp;udid=00000000-0000-0000-0000-000000000000",
                    tracking_html: "<html></html>",
                    action_type: "c",
                    action_path: "",
                    payload: {
                        detailed_list_items: [
                            {
                                product_barcode: "0",
                                product_brand: "Brand",
                                product_category: "",
                                product_discount: "",
                                product_image: "",
                                product_sku: "",
                                product_title: "Sample Product"
                            }
                        ]
                    },
                    popup: {
                        title_text: "",
                        background_color: "",
                        text_color: "",
                        alt_close_btn: "",
                        type: "",
                        hide_banner: false,
                        hide_close_btn: false,
                        hide_browser_nav: false
                    }
                }
            ]
        }
    }
};

/**
 * Mock data for an {@link adadaptedApiTypes.models.AdSession} object.
 */
const REFRESHED_AD_SESSION_DATA: adadaptedApiTypes.models.AdSession = {
    session_id: "TEST_SESSION_ID",
    will_serve_ads: true,
    active_campaigns: true,
    session_expires_at: 1587684561,
    polling_interval_ms: 1000,
    zones: {
        100838: {
            id: "100838",
            port_height: 250,
            port_width: 320,
            land_height: 250,
            land_width: 320,
            ads: [
                {
                    ad_id: "1816",
                    impression_id: "100838::C4D792785EA1EC91",
                    refresh_time: 30,
                    hide_after_interaction: false,
                    type: "html",
                    creative_url:
                        "https://sandbox.adadapted.com/a/NTLKNZKYMMI2NTM1;100838;1815?session_id=TEST_SESSION_ID&amp;udid=00000000-0000-0000-0000-000000000000",
                    tracking_html: "<html></html>",
                    action_type: "c",
                    action_path: "",
                    payload: {
                        detailed_list_items: [
                            {
                                product_barcode: "0",
                                product_brand: "Brand",
                                product_category: "",
                                product_discount: "",
                                product_image: "",
                                product_sku: "",
                                product_title: "Sample Product"
                            }
                        ]
                    },
                    popup: {
                        title_text: "",
                        background_color: "",
                        text_color: "",
                        alt_close_btn: "",
                        type: "",
                        hide_banner: false,
                        hide_close_btn: false,
                        hide_browser_nav: false
                    }
                }
            ]
        }
    }
};

/**
 * Mock data for an {@link adadaptedApiTypes.models.AdSession} object.
 */
const KEYWORD_INTERCEPT_DATA: adadaptedApiTypes.models.KeywordIntercepts = {
    search_id: "test-search-id",
    min_match_length: 3,
    terms: [
        {
            term_id: "test-term-id-1",
            term: "Milk",
            replacement: "Fairlife Milk",
            priority: 1
        },
        {
            term_id: "test-term-id-2",
            term: "milk",
            replacement: "A2 Milk",
            priority: 0
        },
        {
            term_id: "test-term-id-3",
            term: "CHEESE",
            replacement: "Kraft Singles",
            priority: 0
        },
        {
            term_id: "test-term-id-4",
            term: "cOfFeE",
            replacement: "Folgers Instant Coffee",
            priority: 0
        }
    ]
};
