/**
 * Global imports and initialization for Jest unit tests.
 * @module
 */
import "@testing-library/jest-dom";
import { jest } from "@jest/globals";

/**
 * react-router v6.4.0 caused testing to be a bit more involved that it was previously due to integration with remix.
 * Seems that we now have to slightly alter our setup, including mocking out these global values.
 * Adapted from react-router's own tests: https://github.com/remix-run/react-router/blob/main/packages/router/__tests__/setup.ts
 * Discovered via this stackoverflow question: https://stackoverflow.com/questions/74497916/referenceerror-request-is-not-defined-when-testing-with-react-router-v6-4
 */
if (!globalThis.fetch) {
    // Built-in lib.dom.d.ts expects `fetch(Request | string, ...)` but the web
    // fetch API allows a URL so @remix-run/web-fetch defines
    // `fetch(string | URL | Request, ...)`
    // @ts-ignore
    globalThis.fetch = jest.fn();
    // Same as above, lib.dom.d.ts doesn't allow a URL to the Request constructor
    // @ts-ignore
    globalThis.Request = jest.fn();
    // web-std/fetch Response does not currently implement Response.error()
    // @ts-ignore
    globalThis.Response = jest.fn();
}
