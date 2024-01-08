/**
 * Contains all API request mocks for the Rewards API.
 */
import { AxiosHeaders, AxiosResponse } from "axios";
import {
    AdActionType,
    AdSession,
    InitializeSessionResponse,
    KeywordIntercepts,
    KeywordInterceptsResponse,
    RefreshSessionDataResponse,
    ReportAdEventResponse,
    ReportInterceptEventResponse,
    RetrievePayloadItemDataResponse,
} from "./adadaptedApiTypes";

/**
 * Mocks the API call for initializing a session.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function initializeSession(): Promise<
    AxiosResponse<InitializeSessionResponse>
> {
    return new Promise<AxiosResponse<InitializeSessionResponse>>((resolve) => {
        resolve({
            data: AD_SESSION_DATA,
            then: undefined,
            config: {
                headers: new AxiosHeaders(),
            },
            headers: {},
            status: 200,
            statusText: "200",
        });
    });
}

/**
 * Mocks the API call for refreshing session data.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function refreshSessionData(): Promise<
    AxiosResponse<RefreshSessionDataResponse>
> {
    return new Promise<AxiosResponse<RefreshSessionDataResponse>>((resolve) => {
        resolve({
            data: REFRESHED_AD_SESSION_DATA,
            then: undefined,
            config: {
                headers: new AxiosHeaders(),
            },
            headers: {},
            status: 200,
            statusText: "200",
        });
    });
}

/**
 * Mocks the API call for reporting an ad event.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function reportAdEvent(): Promise<AxiosResponse<ReportAdEventResponse>> {
    return new Promise<AxiosResponse<ReportAdEventResponse>>((resolve) => {
        resolve({
            data: {
                results: ["Ok"],
            },
            then: undefined,
            config: {
                headers: new AxiosHeaders(),
            },
            headers: {},
            status: 200,
            statusText: "200",
        });
    });
}

/**
 * Mocks the API call for getting keyword intercepts.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function getKeywordIntercepts(): Promise<
    AxiosResponse<KeywordInterceptsResponse>
> {
    return new Promise<AxiosResponse<KeywordInterceptsResponse>>((resolve) => {
        resolve({
            data: KEYWORD_INTERCEPT_DATA,
            then: undefined,
            config: {
                headers: new AxiosHeaders(),
            },
            headers: {},
            status: 200,
            statusText: "200",
        });
    });
}

/**
 * Mocks the API call for reporting an ad event.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function reportInterceptEvent(): Promise<
    AxiosResponse<ReportInterceptEventResponse>
> {
    return new Promise<AxiosResponse<ReportInterceptEventResponse>>(
        (resolve) => {
            resolve({
                data: {
                    results: ["Ok"],
                },
                then: undefined,
                config: {
                    headers: new AxiosHeaders(),
                },
                headers: {},
                status: 200,
                statusText: "200",
            });
        }
    );
}

/**
 * Mocks the API call for reporting List Manager events.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function reportListManagerEvents(): Promise<AxiosResponse<void>> {
    return new Promise<AxiosResponse<void>>((resolve) => {
        resolve({
            data: undefined,
            then: undefined,
            config: {
                headers: new AxiosHeaders(),
            },
            headers: {},
            status: 200,
            statusText: "200",
        });
    });
}

/**
 * Mocks the API call for reporting Payload content status.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function reportPayloadContentStatus(): Promise<AxiosResponse<void>> {
    return new Promise<AxiosResponse<void>>((resolve) => {
        resolve({
            data: undefined,
            then: undefined,
            config: {
                headers: new AxiosHeaders(),
            },
            headers: {},
            status: 200,
            statusText: "200",
        });
    });
}

/**
 * Mocks the API call for reporting Payload content status.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function retrievePayloadContent(): Promise<
    AxiosResponse<RetrievePayloadItemDataResponse>
> {
    return new Promise<AxiosResponse<RetrievePayloadItemDataResponse>>(
        (resolve) => {
            resolve({
                data: {
                    payloads: [
                        {
                            payload_id: "TEST_PAYLOAD_1",
                            detailed_list_items: [
                                {
                                    product_title: "Test Product 1",
                                    product_barcode: "",
                                    product_sku: "",
                                    product_image: "",
                                    product_discount: "",
                                    product_brand: "",
                                    product_category: "",
                                },
                            ],
                        },
                    ],
                },
                then: undefined,
                config: {
                    headers: new AxiosHeaders(),
                },
                headers: {},
                status: 200,
                statusText: "200",
            });
        }
    );
}

/**
 * Mock data for an {@link AdSession} object.
 */
const AD_SESSION_DATA: AdSession = {
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
                        "https://testurl.com/a/NTLKNZKYMMI2NTM1;100838;1815?session_id=TEST_SESSION_ID&amp;udid=00000000-0000-0000-0000-000000000000",
                    tracking_html: "<html></html>",
                    action_type: AdActionType.CONTENT,
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
                                product_title: "Sample Product",
                            },
                        ],
                    },
                },
            ],
        },
    },
};

/**
 * Mock data for an {@link AdSession} object.
 */
const REFRESHED_AD_SESSION_DATA: AdSession = {
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
                        "https://testurl.com/a/NTLKNZKYMMI2NTM1;100838;1815?session_id=TEST_SESSION_ID&amp;udid=00000000-0000-0000-0000-000000000000",
                    tracking_html: "<html></html>",
                    action_type: AdActionType.CONTENT,
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
                                product_title: "Sample Product",
                            },
                        ],
                    },
                },
            ],
        },
    },
};

/**
 * Mock data for an {@link AdSession} object.
 */
const KEYWORD_INTERCEPT_DATA: KeywordIntercepts = {
    search_id: "test-search-id",
    min_match_length: 3,
    terms: [
        {
            term_id: "test-term-id-1",
            term: "Milk",
            replacement: "Fairlife Milk",
            priority: 1,
        },
        {
            term_id: "test-term-id-2",
            term: "milk",
            replacement: "A2 Milk",
            priority: 0,
        },
        {
            term_id: "test-term-id-3",
            term: "CHEESE",
            replacement: "Kraft Singles",
            priority: 0,
        },
        {
            term_id: "test-term-id-4",
            term: "cOfFeE",
            replacement: "Folgers Instant Coffee",
            priority: 0,
        },
    ],
};
