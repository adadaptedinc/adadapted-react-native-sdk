/**
 * API requests focused around Settings.
 */
import {
    InitializeSessionRequest,
    InitializeSessionResponse,
    KeywordInterceptsRequest,
    KeywordInterceptsResponse,
    RefreshSessionDataRequest,
    RefreshSessionDataResponse,
    ReportAdEventRequest,
    ReportAdEventResponse,
    ReportInterceptEventRequest,
    ReportInterceptEventResponse,
    ReportListManagerDataRequest,
    ReportPayloadDataRequest,
    RetrievePayloadItemDataRequest,
    RetrievePayloadItemDataResponse,
} from "./adadaptedApiTypes";
import axios, { AxiosResponse } from "axios";
import * as adadaptedApiRequestMocks from "./adadaptedApiRequests.mock";
import { ApiEnv, DeviceOS, ListManagerApiEnv, PayloadApiEnv } from "../index";

/**
 * Makes an API request to initialize the session for the AdAdapted API.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function initializeSession(
    requestData: InitializeSessionRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<InitializeSessionResponse>> {
    return apiEnv === ApiEnv.Mock
        ? adadaptedApiRequestMocks.initializeSession()
        : axios(`${apiEnv}/v/0.9.5/${deviceOS}/sessions/initialize`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
              },
          });
}

/**
 * Makes an API request to refresh the session data.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function refreshSessionData(
    requestData: RefreshSessionDataRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<RefreshSessionDataResponse>> {
    return apiEnv === ApiEnv.Mock
        ? adadaptedApiRequestMocks.refreshSessionData()
        : axios(
              `${apiEnv}/v/0.9.5/${deviceOS}/ads/retrieve?aid=${requestData.aid}&sid=${requestData.sid}&uid=${requestData.uid}&sdk=${requestData.sdkVersion}&contextID=${requestData.adContext?.contextIds}&zoneID=${requestData.adContext?.zoneIds}`,
              {
                  method: "GET",
                  headers: {
                      accept: "application/json",
                  },
              }
          );
}

/**
 * Makes an API request to report an ad event that has occurred.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function reportAdEvent(
    requestData: ReportAdEventRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<ReportAdEventResponse>> {
    return apiEnv === ApiEnv.Mock
        ? adadaptedApiRequestMocks.reportAdEvent()
        : axios(`${apiEnv}/v/0.9.5/${deviceOS}/ads/events`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
              },
          });
}

/**
 * Makes an API request to get all possible keyword intercepts for the session.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function getKeywordIntercepts(
    requestData: KeywordInterceptsRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<KeywordInterceptsResponse>> {
    return apiEnv === ApiEnv.Mock
        ? adadaptedApiRequestMocks.getKeywordIntercepts()
        : axios(
              `${apiEnv}/v/0.9.5/${deviceOS}/intercepts/retrieve?aid=${requestData.aid}&sid=${requestData.sid}&uid=${requestData.uid}`,
              {
                  method: "GET",
                  headers: {
                      accept: "application/json",
                  },
              }
          );
}

/**
 * Makes an API request to report an intercept event that has occurred.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function reportInterceptEvent(
    requestData: ReportInterceptEventRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<AxiosResponse<ReportInterceptEventResponse>> {
    return apiEnv === ApiEnv.Mock
        ? adadaptedApiRequestMocks.reportInterceptEvent()
        : axios(`${apiEnv}/v/0.9.5/${deviceOS}/intercepts/events`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
              },
          });
}

/**
 * Makes an API request to report List Manager events.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function reportListManagerEvents(
    requestData: ReportListManagerDataRequest,
    deviceOS: DeviceOS,
    apiEnv: ListManagerApiEnv
): Promise<AxiosResponse<void>> {
    return apiEnv === ListManagerApiEnv.Mock
        ? adadaptedApiRequestMocks.reportListManagerEvents()
        : axios(`${apiEnv}/v/1/${deviceOS}/events`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
              },
          });
}

/**
 * Makes an API request to report the results of the
 * "out of app" add to list payload received.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function reportPayloadContentStatus(
    requestData: ReportPayloadDataRequest,
    apiEnv: PayloadApiEnv
): Promise<AxiosResponse<void>> {
    return apiEnv === PayloadApiEnv.Mock
        ? adadaptedApiRequestMocks.reportPayloadContentStatus()
        : axios(`${apiEnv}/v/1/tracking`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
              },
          });
}

/**
 * Makes an API request to get all outstanding add to list payloads for a given user.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function retrievePayloadContent(
    requestData: RetrievePayloadItemDataRequest,
    apiEnv: PayloadApiEnv
): Promise<AxiosResponse<RetrievePayloadItemDataResponse>> {
    return apiEnv === PayloadApiEnv.Mock
        ? adadaptedApiRequestMocks.retrievePayloadContent()
        : axios(`${apiEnv}/v/1/pickup`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
              },
          });
}
