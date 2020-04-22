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
            data: {
                status: "",
                message: "",
                created_at: ""
            },
            then: undefined,
            config: {},
            headers: {},
            status: 200,
            statusText: "200"
        });
    });
}
