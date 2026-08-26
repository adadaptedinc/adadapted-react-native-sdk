// =============================================================================
// API TYPE MODELS
// =============================================================================
/**
 * The definition of an ad session data object.
 */
export interface AdRetrieveResponse {
    /**
     * The zone data, carrying the single ad the API chose for the requested zone.
     */
    data: Zone;
    /**
     * False when the request was rejected. NOTE: The API returns this on a 200 for
     * business rejections, so the status code alone is not enough to detect failure.
     */
    success: boolean;
}

/**
 * Interface for the v1.0.0 keyword intercept retrieve response envelope.
 */
export interface InterceptRetrieveResponse {
    /**
     * The available keyword intercepts.
     */
    data: KeywordIntercepts;
    /**
     * False when the request was rejected.
     */
    success: boolean;
}

/**
 * The definition of a zone.
 */
export interface Zone {
    /**
     * The single ad to display within the zone. An ad whose {@link Ad.id} is empty
     * means the API had nothing to serve, and only its refresh_time is meaningful.
     */
    ad: Ad;
    /**
     * The optimized height of the zone.
     */
    port_height: number;
    /**
     * The optimized width of the zone.
     */
    port_width: number;
}

/**
 * The definition of an Ad.
 */
export interface Ad {
    /**
     * The ad ID. An empty string means the API had no ad to serve.
     */
    id: string;
    /**
     * The impression ID.
     */
    impression_id: string;
    /**
     * How long, in seconds, this ad is displayed for before the next ad is
     * requested for the zone. On a response carrying no ad, this is instead the
     * backoff to wait before asking again.
     */
    refresh_time: number;
    /**
     * The URL of the ad creative to display.
     */
    creative_url: string;
    /**
     * The URL the ad navigates to when interacted with. An empty string when the
     * action type does not navigate anywhere.
     */
    action_path: string;
    /**
     * What interacting with the ad does.
     */
    action_type: AdActionType;
    /**
     * The items to add to a list, for add-to-list ads.
     */
    payload: AdPayload;
    /**
     * The ID of the zone this ad was served for.
     * NOTE: Set by the SDK rather than the API, so every reported event can name
     *       its zone without parsing it back out of the impression ID.
     */
    zone_id?: string;
}

/**
 * The definition of an Ad Payload.
 */
export interface AdPayload {
    /**
     * The array of list items.
     * NOTE: Optional, because the API substitutes an empty payload object for an
     *       ad that carries no items.
     */
    detailed_list_items?: DetailedListItem[];
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
     * The ad ID. An empty string on the zone level events, which describe the zone
     * itself rather than any ad within it.
     */
    ad_id: string;
    /**
     * The ad zone the event is for.
     */
    zone_id: string;
    /**
     * The impression ID. An empty string on the zone level events.
     */
    impression_id: string;
    /**
     * The event type to report
     */
    event_type: ReportedEventType;
    /**
     * Additional detail for event types that carry one, currently only the reason a
     * zone went unfilled.
     * NOTE: Must be left off the payload entirely rather than sent as null when
     *       there isn't one.
     */
    event_name?: ZoneUnfilledReason;
    /**
     * The timestamp at which the event occurred.
     */
    created_at: number;
}

/**
 * Enum defining why an ad zone went unfilled.
 */
export enum ZoneUnfilledReason {
    /**
     * The API answered normally but had no ad to serve.
     */
    NO_AD = "no_ad",
    /**
     * The ad request failed outright and never returned a usable response.
     */
    REQUEST_FAILED = "request_failed",
}

/**
 * Enum defining the SDK level event names that get reported.
 * NOTE: These match the native SDKs on the wire, so reporting can treat every
 *       platform the same.
 */
export enum SdkEventName {
    /**
     * A new session ID was generated.
     */
    SESSION_CREATED = "SESSION_CREATED",
    /**
     * An existing session was picked back up, because the app returned to the
     * foreground within the session window.
     */
    SESSION_RESUMED = "SESSION_RESUMED",
    /**
     * The app was sent to the background.
     */
    SESSION_BACKGROUNDED = "SESSION_BACKGROUNDED",
    /**
     * An "add to list" ad was clicked. Reported instead of an interaction,
     * because the interaction is only earned once the host app confirms the
     * items actually reached the user's list. See AdadaptedReactNativeSdk.acknowledge.
     */
    ATL_AD_CLICKED = "atl_ad_clicked",
    /**
     * A single "add to list" item was confirmed as added to the user's list.
     */
    ATL_ITEM_ADDED_TO_LIST = "atl_item_added_to_list",
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
    event_name: ListManagerEventName | SdkEventName;
    /**
     * The parameter the event is triggered for.
     */
    event_params: ListManagerEventParam | SdkEventParam;
}

/**
 * The params carried by a session lifecycle event, matching the map Android's
 * SessionClient.trackEvent sends.
 */
export interface SdkEventParam {
    /**
     * The session the event describes.
     */
    sessionId: string;
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
    /**
     * The event was triggered by the SDK itself rather than by a user action.
     * Used for the session lifecycle events, matching SDK_EVENT_TYPE on Android.
     */
    SDK = "sdk",
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
     * Occurs when an ad that was displayed to the user stops being displayed,
     * because it rotated out, the zone left the view, or the app was backgrounded.
     * Reported at most once per ad that recorded an impression.
     */
    IMPRESSION_END = "impression_end",
    /**
     * Occurs when the user interacts with an ad.
     */
    INTERACTION = "interaction",
    /**
     * Occurs when an ad zone is first placed. Reported for every zone, whether it
     * ever receives an ad or not.
     */
    ZONE_MOUNTED = "zone_mounted",
    /**
     * Occurs when an ad zone is removed.
     */
    ZONE_UNMOUNTED = "zone_unmounted",
    /**
     * Occurs when an ad was requested for a zone but none could be displayed.
     * Always accompanied by a {@link ZoneUnfilledReason} event name.
     */
    ZONE_UNFILLED = "zone_unfilled",
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
export interface AdRetrieveRequest {
    /**
     * The SDK version.
     * NOTE: Named sdkId on the wire, matching the native SDKs.
     */
    sdkId: string;
    /**
     * The bundle ID of the host app.
     */
    bundleId: string;
    /**
     * The unique device ID of the user.
     */
    userId: string;
    /**
     * The zone to retrieve an ad for. One ad is returned per request.
     */
    zoneId: string;
    /**
     * The store to target ads for, or an empty string.
     */
    storeId: string;
    /**
     * The recipe context this zone is showing, or an empty string.
     */
    contextId: string;
    /**
     * The current session ID.
     */
    sessionId: string;
    /**
     * Reserved for additional targeting params. Currently always an empty string.
     */
    extra: string;
}

/**
 * Interface for the request of the v1.0.0 keyword intercept retrieve call.
 */
export interface InterceptRetrieveRequest {
    /**
     * The SDK version.
     */
    sdkId: string;
    /**
     * The bundle ID of the host app.
     */
    bundleId: string;
    /**
     * The unique device ID of the user.
     */
    userId: string;
    /**
     * Always an empty string for intercepts, which are not zone scoped.
     */
    zoneId: string;
    /**
     * The current session ID.
     */
    sessionId: string;
    /**
     * Reserved for additional params.
     */
    extra: string;
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
    /**
     * The SDK version.
     */
    sdk_version: string;
    /**
     * The bundle ID of the host app.
     */
    bundle_id: string;
    /**
     * The bundle version of the host app.
     */
    bundle_version: string;
    /**
     * The device locale.
     * NOTE: Carried here because the session initialize request that used to send
     *       it no longer exists.
     */
    locale: string;
    /**
     * Whether the user permits ad retargeting, as 1 or 0.
     * NOTE: Carried here for the same reason as locale. The native SDKs send it on
     *       this request too.
     */
    allow_retargeting: number;
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
