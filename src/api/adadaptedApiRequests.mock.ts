/**
 * Contains all API request mocks for the Rewards API.
 */
import { AxiosHeaders, AxiosResponse } from "axios";
import {
    AdActionType,
    AdRetrieveResponse,
    InterceptRetrieveResponse,
    KeywordIntercepts,
    ReportAdEventResponse,
    ReportInterceptEventResponse,
    RetrievePayloadItemDataResponse,
    Zone,
} from "./adadaptedApiTypes";

/**
 * Mocks the API call for retrieving a single ad for one zone.
 * @returns a promise of an {@link AxiosResponse} of the mocked data.
 */
export function retrieveAd(): Promise<AxiosResponse<AdRetrieveResponse>> {
    return new Promise<AxiosResponse<AdRetrieveResponse>>((resolve) => {
        resolve({
            data: { data: AD_ZONE_DATA, success: true },
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
    AxiosResponse<InterceptRetrieveResponse>
> {
    return new Promise<AxiosResponse<InterceptRetrieveResponse>>((resolve) => {
        resolve({
            data: { data: KEYWORD_INTERCEPT_DATA, success: true },
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
        },
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
        },
    );
}

/**
 * Mock data for a v1.0.0 {@link Zone} response, which carries exactly one ad.
 */
const AD_ZONE_DATA: Zone = {
    port_height: 250,
    port_width: 320,
    ad: {
        id: "1815",
        impression_id: "100838::C4D792785EA1EC91",
        refresh_time: 60,
        creative_url:
            "https://testurl.com/a/NTLKNZKYMMI2NTM1;100838;1815?session_id=TEST_SESSION_ID&amp;udid=00000000-0000-0000-0000-000000000000",
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
};

/**
 * Mock data for a {@link KeywordIntercepts} object.
 */
const KEYWORD_INTERCEPT_DATA: KeywordIntercepts = {
    search_id: "test-search-id",
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
