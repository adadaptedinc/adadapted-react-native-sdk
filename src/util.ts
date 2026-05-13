import { nil } from "./types";
import { NoInfer } from "type-zoo";

/**
 * Convenient utility for calling a function that may or may
 * not be undefined/null.
 * Does nothing if the provided function is undefined/null.
 * @param func - The function to be called.
 * @returns The return value of the executed function, or undefined if
 *      the function is null/undefined
 */
export function safeInvoke<R>(func: (() => R) | nil): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @returns The return value of the executed function, or undefined if
 *      the function is null/undefined
 */
export function safeInvoke<A1, R>(
    func: ((arg1: A1) => R) | nil,
    arg1: NoInfer<A1>,
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 * @returns The return value of the executed function, or undefined if
 *      the function is null/undefined
 */
export function safeInvoke<A1, A2, R>(
    func: ((arg1: A1, arg2: A2) => R) | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>,
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 * @param arg3 - Function argument.
 * @returns The return value of the executed function, or undefined if
 *      the function is null/undefined
 */
export function safeInvoke<A1, A2, A3, R>(
    func: ((arg1: A1, arg2: A2, arg3: A3) => R) | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>,
    arg3: NoInfer<A3>,
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 * @param arg3 - Function argument.
 * @param arg4 - Function argument.
 * @returns The return value of the executed function, or undefined if
 *      the function is null/undefined
 */
export function safeInvoke<A1, A2, A3, A4, R>(
    func: ((arg1: A1, arg2: A2, arg3: A3, arg4: A4) => R) | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>,
    arg3: NoInfer<A3>,
    arg4: NoInfer<A4>,
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 * @param arg3 - Function argument.
 * @param arg4 - Function argument.
 * @param arg5 - Function argument.
 * @returns The return value of the executed function, or undefined if
 *      the function is null/undefined
 */
export function safeInvoke<A1, A2, A3, A4, A5, R>(
    func: ((arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5) => R) | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>,
    arg3: NoInfer<A3>,
    arg4: NoInfer<A4>,
    arg5: NoInfer<A5>,
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param arg1 - Function argument.
 * @param arg2 - Function argument.
 * @param arg3 - Function argument.
 * @param arg4 - Function argument.
 * @param arg5 - Function argument.
 * @param arg6 - Function argument.
 * @returns The return value of the executed function, or undefined if
 *      the function is null/undefined
 */
export function safeInvoke<A1, A2, A3, A4, A5, A6, R>(
    func:
        | ((arg1: A1, arg2: A2, arg3: A3, arg4: A4, arg5: A5, arg6: A6) => R)
        | nil,
    arg1: NoInfer<A1>,
    arg2: NoInfer<A2>,
    arg3: NoInfer<A3>,
    arg4: NoInfer<A4>,
    arg5: NoInfer<A5>,
    arg6: NoInfer<A6>,
): R | undefined;
/**
 * See main definition above.
 * @param func - The function to call.
 * @param args - All arguments to call with the function.
 * @returns the method to be called if its defined.
 */
export function safeInvoke(func: Function | nil, ...args: any[]): any {
    if (func) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        return func(...args);
    }
}
