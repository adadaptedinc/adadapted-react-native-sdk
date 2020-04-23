/**
 * API requests focused around Settings.
 */
import { adadaptedApiTypes } from "./adadaptedApiTypes";
import axios, { AxiosResponse } from "axios";
import * as adadaptedApiRequestMocks from "./adadaptedApiRequests.mock";
import { ApiEnv, DeviceOS } from "../types";

/**
 * Makes an API request to initialize the session for the AdAdapted API.
 * @param requestData - The data to be sent with the request.
 * @param deviceOS - The operating system being ran on the device.
 * @param apiEnv - The API environment to use when making the API request.
 * @returns a promise containing the response data.
 */
export function initializeSession(
    requestData: adadaptedApiTypes.requestModels.InitializeSessionRequest,
    deviceOS: DeviceOS,
    apiEnv: ApiEnv
): Promise<
    AxiosResponse<adadaptedApiTypes.responseModels.InitializeSessionResponse>
> {
    return apiEnv === ApiEnv.Mock
        ? adadaptedApiRequestMocks.initializeSession()
        : axios(`${apiEnv}/v/0.9.5/${deviceOS}/sessions/initialize`, {
              method: "POST",
              data: requestData,
              headers: {
                  accept: "application/json"
              }
          });
}
