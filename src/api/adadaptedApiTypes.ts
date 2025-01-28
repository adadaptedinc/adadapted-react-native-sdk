// =============================================================================
// API TYPE MODELS
// =============================================================================
/**
 * The definition of an ad session data object.
 */
export interface AdSession {
    /**
     * The session ID.
     */
    session_id: string;
    /**
     * If true, ads will be served.
     */
    will_serve_ads: boolean;
    /**
     * If true, there are active campaigns.
     */
    active_campaigns: boolean;
    /**
     * How often to refresh session/ad data?
     */
    polling_interval_ms: number;
    /**
     * The time at which the session will expire.
     */
    session_expires_at: number;
    /**
     * All ad zones.
     */
    zones: { [key: number]: Zone };
}

/**
 * The definition of a zone.
 */
export interface Zone {
    /**
     * The zone ID.
     */
    id: string;
    /**
     * ?
     */
    land_height: number;
    /**
     * ?
     */
    land_width: number;
    /**
     * ?
     */
    port_height: number;
    /**
     * ?
     */
    port_width: number;
    /**
     * The available ads.
     */
    ads: Ad[];
}

/**
 * The definition of an Ad.
 */
export interface Ad {
    /**
     * The ad ID.
     */
    ad_id: string;
    /**
     * The impression ID.
     */
    impression_id: string;
    /**
     * The type of ad this is.
     */
    type: string;
    /**
     * How often the ad refreshes? Swaps out for another?
     * Length of time in seconds.
     */
    refresh_time: number;
    /**
     * The URL for the ad image to display.
     */
    creative_url: string;
    /**
     * The tracking pixel to include in the zone view for this ad?
     */
    tracking_html: string;
    /**
     * ?
     */
    action_path: string;
    /**
     * ?
     */
    action_type: AdActionType;
    /**
     * If true, the ad will be hidden after interaction.
     */
    hide_after_interaction: boolean;
    /**
     * ?
     */
    payload: AdPayload;
    /**
     * Track impression status.
     */
    impression_tracked?: boolean;
}

/**
 * The definition of an Ad Payload.
 */
export interface AdPayload {
    /**
     * The array of list items.
     */
    detailed_list_items: DetailedListItem[];
}

/**
 * The definition of an "out of app" data payload.
 */
export interface OutOfAppDataPayload {
    /**
     * The payload ID associated to the provided list items.
     */
    payload_id: string;
    /**
     * The payload message.
     */
    payload_message?: string;
    /**
     * The payload image.
     */
    payload_image?: string;
    /**
     * The campaign ID.
     */
    campaign_id?: string;
    /**
     * The app ID.
     */
    app_id?: string;
    /**
     * Expiration time in seconds.
     */
    expire_seconds?: number;
    /**
     * The array of list items.
     */
    detailed_list_items: DetailedListItem[];
}

export interface AdZoneDetailedListItemInfo {
    zoneId: string;
    items: DetailedListItem[];
}

/**
 * The definition of a Detailed List Item.
 */
export interface DetailedListItem {
    /**
     * The barcode of the product.
     */
    product_barcode: string;
    /**
     * The brand of the product.
     */
    product_brand: string;
    /**
     * The category of the product.
     */
    product_category: string;
    /**
     * The discount given for the product.
     */
    product_discount: string;
    /**
     * The image used for display of the product.
     */
    product_image: string;
    /**
     * The SKU of the product.
     */
    product_sku: string;
    /**
     * The name/title of the product.
     */
    product_title: string;
    /**
     * The tracking ID.
     */
    tracking_id?: string;
}

/**
 * The definition of a Keyword Intercepts object.
 */
export interface KeywordIntercepts {
    /**
     * The search ID.
     * Automatically assigned by the API.
     */
    search_id: string;
    /**
     * The minimum number of characters required to perform
     * a search against all available search terms.
     */
    min_match_length: number;
    /**
     * All available search terms.
     */
    terms: KeywordSearchTerm[];
}

/**
 * The definition of a Keyword Search Term.
 */
export interface KeywordSearchTerm {
    /**
     * The search term ID.
     */
    term_id: string;
    /**
     * The search term to validate a search string against.
     */
    term: string;
    /**
     * The display string a client can use to display in a list.
     */
    replacement: string;
    /**
     * The display priority of this item.
     * Compare this to other {@link KeywordSearchTerm} items to determine
     * the final priority order during display.
     * The lower the number, the higher the priority.
     */
    priority: number;
}

/**
 * The definition of a Reported Ad Event.
 */
export interface ReportedAdEvent {
    /**
     * The add ID.
     */
    ad_id: string;
    /**
     * The impression ID.
     */
    impression_id: string;
    /**
     * The event type to report
     */
    event_type: ReportedEventType;
    /**
     * The timestamp at which the event occurred.
     */
    created_at: number;
}

/**
 * The definition of a Reported Intercept Event.
 */
export interface ReportedInterceptEvent {
    /**
     * The intercept search ID.
     */
    search_id: string;
    /**
     * The term ID.
     */
    term_id: string;
    /**
     * The term.
     */
    term: string;
    /**
     * The user input provided that ultimately
     * resulted in the event triggering.
     */
    user_input: string;
    /**
     * The event type to report
     */
    event_type: ReportedEventType;
    /**
     * The timestamp at which the event occurred.
     */
    created_at: number;
}

/**
 * Interface defining the structure of an event to send when using List Manager.
 */
export interface ListManagerEvent {
    /**
     * The source of the list manager event.
     */
    event_source: ListManagerEventSource;
    /**
     * The timestamp this event occurred (unix time).
     */
    event_timestamp: number;
    /**
     * The event name.
     */
    event_name: ListManagerEventName;
    /**
     * The parameter the event is triggered for.
     */
    event_params: ListManagerEventParam;
}

/**
 * Interface defining the structure of a payload tracking event.
 */
export interface PayloadTrackingEvent {
    /**
     * The source of the list manager event.
     */
    payload_id: string;
    /**
     * The status to report.
     */
    status: PayloadStatus;
    /**
     * The timestamp this event occurred (unix time).
     */
    event_timestamp: number;
}

/**
 * Interface defining the structure of an Event Param for List Manager.
 */
export interface ListManagerEventParam {
    /**
     * The item name being reported.
     */
    item_name: string;
    /**
     * The list name being reported.
     */
    list_name?: string;
}

/**
 * Enumeration that defines the possible values for a List Manager Event Source.
 */
export enum ListManagerEventSource {
    /**
     * The event was triggered from the app.
     */
    APP = "app",
}

/**
 * Enumeration that defines the possible values for a List Manager Event Name.
 */
export enum ListManagerEventName {
    /**
     * The user added an item to their list.
     */
    ADDED_TO_LIST = "user_added_to_list",
    /**
     * The user crossed off an item from their list.
     */
    CROSSED_OFF_LIST = "user_crossed_off_list",
    /**
     * The user deleted an item from their list.
     */
    DELETED_FROM_LIST = "user_deleted_from_list",
}

/**
 * Enum defining the available ad action types.
 */
export enum AdActionType {
    /**
     * Used for Add To List.
     */
    CONTENT = "c",
    /**
     * Used for opening URLs in an external browser.
     */
    EXTERNAL = "e",
    /**
     * Used for opening URLs in a web view within the app.
     * NOTE: This one should probably be deprecated with the new
     *       platform redesign, since its not as obvious what it does.
     */
    LINK = "l",
    /**
     * Used for opening app store URLs in the app store.
     */
    APP = "a",
    /**
     * ?
     */
    NONE = "n",
}

/**
 * Enum defining the different types of events that can be reported.
 */
export enum ReportedEventType {
    /**
     * Occurs when an ad is displayed to the user.
     */
    IMPRESSION = "impression",
    /**
     * Occurs when an ad is not viewable before timimg out.
     */
    INVISIBLE_IMPRESSION = "invisible_impression",
    /**
     * Occurs when the user interacts with an ad.
     */
    INTERACTION = "interaction",
    /**
     * Occurs when the user's search term did not
     * match an available keyword intercept term.
     */
    NOT_MATCHED = "not_matched",
    /**
     * Occurs when the user's search term has matched a keyword intercept term.
     */
    MATCHED = "matched",
    /**
     * Occurs when the user was presented a keyword intercept term.
     */
    PRESENTED = "presented",
    /**
     * Occurs when the user has selected a keyword intercept term.
     */
    SELECTED = "selected",
}

/**
 * Enumeration defining the possible payload acknowledgment status values.
 */
export enum PayloadStatus {
    /**
     * The delivered status.
     */
    DELIVERED = "delivered",
    /**
     * The rejected status.
     */
    REJECTED = "rejected",
}

// =============================================================================
// REQUEST MODELS
// =============================================================================
/**
 * The base request inputs that most requests will use.
 */
export interface BaseRequestInputs {
    /**
     * The app ID provided by the client using the API.
     */
    app_id: string;
    /**
     * The unique device ID.
     */
    udid: string;
    /**
     * The current session ID.
     */
    session_id: string;
}

/**
 * Interface for the request of the Initialize Session API call.
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
     * The OS version of the device.
     */
    device_osv?: string;
    /**
     * The locale the device is currently set for.
     */
    device_locale?: string;
    /**
     * The timezone the device is currently set for.
     */
    device_timezone?: string;
    /**
     * The device carrier name.
     */
    device_carrier?: string;
    /**
     * The height of the devices screen in pixels.
     */
    device_height?: number;
    /**
     * The width of the devices screen in pixels.
     */
    device_width?: number;
    /**
     * The density of the devices screen.
     */
    device_density?: string;
    /**
     * If true, the device allows for ad retargeting.
     */
    allow_retargeting?: boolean;
    /**
     * ?
     */
    created_at?: number;
    /**
     * The AdAdapted SDK version number.
     */
    sdk_version?: string;
    /**
     * ?
     */
    params?: { [key: string]: string };
}

/**
 * Interface for the request of the Refresh Session Data API call.
 */
export interface RefreshSessionDataRequest {
    /**
     * The app ID provided by the client using the API.
     */
    aid: string;
    /**
     * The unique device ID.
     */
    uid: string;
    /**
     * The current session ID.
     */
    sid: string;
    /**
     * The current sdk version.
     */
    sdkVersion: string;
    /**
     * The context IDs and associated zone IDs.
     */
    adContext?: {
        contextIds: string[] | undefined;
        zoneIds: string[];
    };
}

/**
 * Interface for the request that reports an ad event.
 */
export interface ReportAdEventRequest extends BaseRequestInputs {
    /**
     * Events to report.
     */
    events: ReportedAdEvent[];
}

/**
 * Interface for the request of the Refresh Session Data API call.
 */
export interface KeywordInterceptsRequest {
    /**
     * The app ID provided by the client using the API.
     */
    aid: string;
    /**
     * The unique device ID.
     */
    uid: string;
    /**
     * The current session ID.
     */
    sid: string;
}

/**
 * Interface for the request that reports an intercept event.
 */
export interface ReportInterceptEventRequest extends BaseRequestInputs {
    /**
     * Events to report.
     */
    events: ReportedInterceptEvent[];
}

/**
 * Interface for the request that reports List Manager data.
 */
export interface ReportListManagerDataRequest extends BaseRequestInputs {
    /**
     * The events to report.
     */
    events: ListManagerEvent[];
}

/**
 * Interface for the request that reports Payload tracking data.
 */
export interface ReportPayloadDataRequest extends BaseRequestInputs {
    /**
     * The payload tracking events.
     */
    tracking: PayloadTrackingEvent[];
}

/**
 * Interface for the request that gets Payload server data.
 */
export interface RetrievePayloadItemDataRequest extends BaseRequestInputs {}

// =============================================================================
// RESPONSE MODELS
// =============================================================================
/**
 * Interface for the response of the Campaign API request.
 */
export interface InitializeSessionResponse extends AdSession {}

/**
 * Interface for the response of the Campaign API request.
 */
export interface RefreshSessionDataResponse extends AdSession {}

/**
 * Interface for the response of the Report Ad Event API request.
 */
export interface ReportAdEventResponse {
    /**
     * Array that contains response strings of "Ok" or "Failed" based
     * on the same order of the events sent to the request.
     */
    results: string[];
}

/**
 * Interface for the response of the Keyword Intercepts API request.
 */
export interface KeywordInterceptsResponse extends KeywordIntercepts {}

/**
 * Interface for the response of the Report Intercept Event API request.
 */
export interface ReportInterceptEventResponse {
    /**
     * Array that contains response strings of "Ok" or "Failed" based
     * on the same order of the events sent to the request.
     */
    results: string[];
}

/**
 * Interface for the response of the Retrieve Payload Item Data API request.
 */
export interface RetrievePayloadItemDataResponse {
    /**
     * Array containing all current payloads for the provided user.
     */
    payloads: OutOfAppDataPayload[];
}
