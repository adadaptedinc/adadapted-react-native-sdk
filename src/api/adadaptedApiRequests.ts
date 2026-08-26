/**
 * API requests focused around Settings.
 */
import {
    AdRetrieveRequest,
    AdRetrieveResponse,
    InterceptRetrieveRequest,
    InterceptRetrieveResponse,
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
import { DeviceTypes } from "../componentTypes/Device";
import { EnvironmentTypes } from "../componentTypes/Environment";

/**
 * Makes an API request to retrieve a single ad for one zone.
 *
 * NOTE: The v1.0.0 routes carry no {os} path segment and take the app ID in the
 *       x-api-key header rather than the body. Platform attribution comes from the
 *       session ID prefix instead ("RN" here, "JS" on web, "ANDROID" on Android).
 * @param requestData - The data to be sent with the request.
 * @param appId - The app ID, sent as the API key header.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function retrieveAd(
    requestData: AdRetrieveRequest,
    appId: string,
    apiEnv: EnvironmentTypes.ApiEnv,
): Promise<AxiosResponse<AdRetrieveResponse>> {
    return apiEnv === EnvironmentTypes.ApiEnv.Mock
        ? adadaptedApiRequestMocks.retrieveAd()
        : axios(`${apiEnv}/v/1.0.0/ad/retrieve`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
                  "Content-Type": "application/json",
                  "x-api-key": appId,
              },
          });
}

/**
 * Makes an API request to report an ad event that has occurred.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param appId - The client's app ID, sent as the API key.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function reportAdEvent(
    requestData: ReportAdEventRequest,
    appId: string,
    apiEnv: EnvironmentTypes.ApiEnv,
): Promise<AxiosResponse<ReportAdEventResponse>> {
    return apiEnv === EnvironmentTypes.ApiEnv.Mock
        ? adadaptedApiRequestMocks.reportAdEvent()
        : axios(`${apiEnv}/v/1.0.0/ad/events`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
                  "Content-Type": "application/json",
                  "x-api-key": appId,
              },
          });
}

/**
 * Makes an API request to get all possible keyword intercepts for the session.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param appId - The client's app ID, sent as the API key.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function getKeywordIntercepts(
    requestData: InterceptRetrieveRequest,
    appId: string,
    apiEnv: EnvironmentTypes.ApiEnv,
): Promise<AxiosResponse<InterceptRetrieveResponse>> {
    return apiEnv === EnvironmentTypes.ApiEnv.Mock
        ? adadaptedApiRequestMocks.getKeywordIntercepts()
        : axios(`${apiEnv}/v/1.0.0/intercept/retrieve`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
                  "Content-Type": "application/json",
                  "x-api-key": appId,
              },
          });
}

/**
 * Makes an API request to report an intercept event that has occurred.
 * A valid session is required for this API endpoint to respond successfully.
 * @param requestData - The data to be sent with the request.
 * @param appId - The client's app ID, sent as the API key.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function reportInterceptEvent(
    requestData: ReportInterceptEventRequest,
    appId: string,
    apiEnv: EnvironmentTypes.ApiEnv,
): Promise<AxiosResponse<ReportInterceptEventResponse>> {
    return apiEnv === EnvironmentTypes.ApiEnv.Mock
        ? adadaptedApiRequestMocks.reportInterceptEvent()
        : axios(`${apiEnv}/v/1.0.0/intercept/events`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
                  "Content-Type": "application/json",
                  "x-api-key": appId,
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
    deviceOS: DeviceTypes.DeviceOS,
    apiEnv: EnvironmentTypes.ListManagerApiEnv,
): Promise<AxiosResponse<void>> {
    return apiEnv === EnvironmentTypes.ListManagerApiEnv.Mock
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
    apiEnv: EnvironmentTypes.PayloadApiEnv,
): Promise<AxiosResponse<void>> {
    return apiEnv === EnvironmentTypes.PayloadApiEnv.Mock
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
    apiEnv: EnvironmentTypes.PayloadApiEnv,
): Promise<AxiosResponse<RetrievePayloadItemDataResponse>> {
    return apiEnv === EnvironmentTypes.PayloadApiEnv.Mock
        ? adadaptedApiRequestMocks.retrievePayloadContent()
        : axios(`${apiEnv}/v/1/pickup`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json",
              },
          });
}
