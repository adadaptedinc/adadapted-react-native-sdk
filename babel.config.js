/**
 * Babel configuration.
 *
 * The preset was already referenced here but was not installed, so nothing could
 * actually use this file. It is now a dependency, which is what lets babel-jest
 * compile both this SDK's TypeScript and React Native's own Flow-typed source.
 * ts-jest, which the Jest config used to point at, cannot parse the latter.
 */
module.exports = {
    presets: ["module:@react-native/babel-preset"],
};
