/**
 * Stand-in for react-native-get-random-values.
 *
 * The real module resolves a TurboModule that only exists in a running app, so
 * importing it in Jest throws. Like the real one, this is imported for its side
 * effect: it installs crypto.getRandomValues globally.
 *
 * The values come from a seeded generator rather than Math.random so a failing
 * session ID assertion reproduces, while still differing between calls so tests
 * about two sessions being distinct are meaningful.
 * @module
 */
let seed = 0x2545f491;

/**
 * Fills the given array with pseudo random bytes, in place, as the Web Crypto
 * API requires.
 * @param {Uint8Array} array - The array to fill.
 * @returns {Uint8Array} the same array that was passed in.
 */
function getRandomValues(array) {
    for (let index = 0; index < array.length; index++) {
        // xorshift: cheap, and never returns a constant run the way a badly
        // seeded LCG can.
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;

        array[index] = seed & 0xff;
    }

    return array;
}

if (!global.crypto) {
    global.crypto = {};
}

global.crypto.getRandomValues = getRandomValues;

module.exports = {};
