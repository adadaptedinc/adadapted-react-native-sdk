/**
 * API requests focused around Settings.
 */
import { adadaptedApiTypes } from "./adadaptedApiTypes";
import axios, { AxiosResponse } from "axios";
import * as adadaptedApiRequestMocks from "./adadaptedApiRequests.mock";
import { AdadaptedReactNativeSdk } from "../index";

/**
 * Makes an API request to initialize the session for the AdAdapted API.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function initializeSession(
    requestData: adadaptedApiTypes.requestModels.InitializeSessionRequest,
    deviceOS: AdadaptedReactNativeSdk.DeviceOS,
    apiEnv: AdadaptedReactNativeSdk.ApiEnv
): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.InitializeSessionResponse>
> {
    return apiEnv === AdadaptedReactNativeSdk.ApiEnv.Mock
        ? adadaptedApiRequestMocks.initializeSession()
        : axios(`${apiEnv}/v/0.9.5/${deviceOS}/sessions/initialize`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json"
              }
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
    requestData: adadaptedApiTypes.requestModels.RefreshSessionDataRequest,
    deviceOS: AdadaptedReactNativeSdk.DeviceOS,
    apiEnv: AdadaptedReactNativeSdk.ApiEnv
): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.RefreshSessionDataResponse>
> {
    return apiEnv === AdadaptedReactNativeSdk.ApiEnv.Mock
        ? adadaptedApiRequestMocks.refreshSessionData()
        : axios(
              `${apiEnv}/v/0.9.5/${deviceOS}/ads/retrieve?aid=${requestData.aid}&sid=${requestData.sid}&uid=${requestData.uid}`,
              {
                  method: "GET",
                  headers: {
                      accept: "application/json"
                  }
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
    requestData: adadaptedApiTypes.requestModels.ReportAdEventRequest,
    deviceOS: AdadaptedReactNativeSdk.DeviceOS,
    apiEnv: AdadaptedReactNativeSdk.ApiEnv
): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.ReportAdEventResponse>
> {
    return apiEnv === AdadaptedReactNativeSdk.ApiEnv.Mock
        ? adadaptedApiRequestMocks.reportAdEvent()
        : axios(`${apiEnv}/v/0.9.5/${deviceOS}/ads/events`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json"
              }
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
    requestData: adadaptedApiTypes.requestModels.KeywordInterceptsRequest,
    deviceOS: AdadaptedReactNativeSdk.DeviceOS,
    apiEnv: AdadaptedReactNativeSdk.ApiEnv
): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.KeywordInterceptsResponse>
> {
    return apiEnv === AdadaptedReactNativeSdk.ApiEnv.Mock
        ? adadaptedApiRequestMocks.getKeywordIntercepts()
        : axios(
              `${apiEnv}/v/0.9.5/${deviceOS}/intercepts/retrieve?aid=${requestData.aid}&sid=${requestData.sid}&uid=${requestData.uid}`,
              {
                  method: "GET",
                  headers: {
                      accept: "application/json"
                  }
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
    requestData: adadaptedApiTypes.requestModels.ReportInterceptEventRequest,
    deviceOS: AdadaptedReactNativeSdk.DeviceOS,
    apiEnv: AdadaptedReactNativeSdk.ApiEnv
): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.ReportInterceptEventResponse>
> {
    return apiEnv === AdadaptedReactNativeSdk.ApiEnv.Mock
        ? adadaptedApiRequestMocks.reportInterceptEvent()
        : axios(`${apiEnv}/v/0.9.5/${deviceOS}/intercepts/events`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json"
              }
          });
}
