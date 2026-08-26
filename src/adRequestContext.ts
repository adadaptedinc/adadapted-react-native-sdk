/**
 * The context an AdZone needs in order to request ads and report events.
 *
 * This exists as its own module to break what would otherwise be a circular
 * import: the SDK class renders nothing but owns the session and device info,
 * while the AdZone component owns its ad but needs both.
 *
 * The active context is held at module scope, which mirrors the native SDKs where
 * the equivalents (Android's SessionClient and AdClient) are singletons. An
 * AdZone therefore needs only a zoneId, exactly as AaZoneView does.
 * @module
 */
import { EnvironmentTypes } from "./componentTypes/Environment";
import {
    DetailedListItem,
    ReportedEventType,
    SdkEventName,
    ZoneUnfilledReason,
} from "./api/adadaptedApiTypes";

/**
 * An "add to list" ad whose items have been handed to the host app, but which
 * has not yet earned its interaction.
 *
 * Clicking an ATL ad is not itself the interaction: the items still have to reach
 * the user's list, which only the host app can confirm. This mirrors the AdContent
 * object Android publishes to the app and waits to have acknowledged.
 */
export interface PendingAtlContent {
    /**
     * The ad the items came from.
     */
    adId: string;
    /**
     * The zone the ad was served into.
     */
    zoneId: string;
    /**
     * The impression the click belongs to.
     */
    impressionId: string;
    /**
     * The items handed to the host app.
     */
    items: DetailedListItem[];
    /**
     * Whether the interaction has already been reported. Guards against a second
     * acknowledgement reporting a second interaction for one click, the way
     * AdContent.isHandled does.
     */
    isHandled: boolean;
}

/**
 * An ad or zone level event to report.
 */
export interface AdEventReport {
    /**
     * The ad the event describes, or an empty string for zone level events.
     */
    adId: string;
    /**
     * The zone the event describes.
     */
    zoneId: string;
    /**
     * The impression the event belongs to, or an empty string for zone level events.
     */
    impressionId: string;
    /**
     * What happened.
     */
    eventType: ReportedEventType;
    /**
     * Why a zone went unfilled. Omitted for every other event type.
     */
    eventName?: ZoneUnfilledReason;
}

/**
 * Everything an ad zone needs from the SDK in order to do its work.
 */
export interface AdRequestContext {
    /**
     * The client's app ID, sent as the API key header.
     */
    appId: string;
    /**
     * The API environment to make requests against.
     */
    apiEnv: EnvironmentTypes.ApiEnv;
    /**
     * The unique device ID of the user.
     */
    udid: string;
    /**
     * The bundle ID of the host app.
     */
    bundleId: string;
    /**
     * The SDK version.
     */
    sdkVersion: string;
    /**
     * The store to target ads for, or an empty string.
     */
    storeId: string;
    /**
     * Reads the current session ID.
     * NOTE: A function rather than a value, because the session rotates when the
     *       app is foregrounded after the session window has elapsed. Capturing the
     *       ID once would attribute later requests to a session that has ended.
     */
    getSessionId(): string;
    /**
     * Reports an ad or zone level event.
     * @param event - What the event describes and what happened.
     */
    reportAdEvent(event: AdEventReport): void;
    /**
     * Reports an SDK level event.
     * @param eventName - The event to report.
     * @param extraParams - Any additional params the event carries.
     */
    reportSdkEvent(
        eventName: SdkEventName,
        extraParams?: { [key: string]: string },
    ): void;
    /**
     * Hands an "add to list" ad's items to the SDK so a later acknowledgement can
     * be attributed back to the ad that produced them.
     * @param content - The ad and items awaiting acknowledgement.
     */
    setPendingAtlContent(content: PendingAtlContent): void;
    /**
     * Forwards "add to list" items to the callback the host gave initialize().
     *
     * Used only when a zone was rendered without its own onAddToListTriggered. The
     * callback was global before zones became components, and a host with one
     * handler for every zone should not have to pass it to each one.
     * @param items - The items to add to the list.
     */
    forwardAddToList(items: DetailedListItem[]): void;
}

/**
 * The context registered by the most recent initialize() call.
 */
let activeContext: AdRequestContext | undefined;

/**
 * Zones waiting for a context to become available.
 */
const waitingForContext = new Set<() => void>();

/**
 * Registers the context ad zones should use. Called by the SDK during initialize().
 * @param context - The context to make active, or undefined to clear it.
 */
export function setAdRequestContext(
    context: AdRequestContext | undefined,
): void {
    const hadNoContext = activeContext === undefined;

    activeContext = context;

    if (context && hadNoContext) {
        // A zone typically mounts before initialize() resolves, since the host
        // renders its layout straight away and device info is gathered over the
        // native bridge. Without this the zone would find no context on mount and
        // sit empty for the rest of the session.
        for (const listener of [...waitingForContext]) {
            listener();
        }
    }
}

/**
 * Registers interest in a context arriving, for a zone that mounted before the SDK
 * finished initializing.
 * @param listener - Called once, when a context becomes available.
 * @returns a function that cancels the registration.
 */
export function onAdRequestContextReady(listener: () => void): () => void {
    waitingForContext.add(listener);

    return () => {
        waitingForContext.delete(listener);
    };
}

/**
 * Gets the context ad zones should use.
 * @returns the active context, or undefined when the SDK has not been initialized.
 */
export function getAdRequestContext(): AdRequestContext | undefined {
    return activeContext;
}
