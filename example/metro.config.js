const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const fs = require("fs");
const path = require("path");
// Metro 0.80+ no longer exposes this via "metro-config/src/...";
// the old internals are reachable through the "./private/*" export.
// Handle both export shapes: compiled builds expose it as `.default`,
// while a plain CommonJS build exports the function directly.
const exclusionListModule = require("metro-config/private/defaults/exclusionList");
const exclusionList = exclusionListModule.default || exclusionListModule;
const root = path.resolve(__dirname, "..");
const pak = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
);

/**
 * Escapes a string for safe use inside a regular expression.
 *
 * This replaces the deprecated global `escape()`, which is a URL escaper rather
 * than a regex escaper and would mangle any path containing characters such as
 * a space into `%20`, silently producing a pattern that never matches.
 * @param value - The string to escape.
 * @returns The escaped string.
 */
function escapeForRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const modules = [
    "@babel/runtime",
    ...Object.keys({
        ...pak.dependencies,
        ...pak.peerDependencies,
    }),
];

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    resolver: {
        sourceExts: ["jsx", "js", "ts", "tsx", "json"],
        // Keeps the repo-root node_modules out of the module graph so the SDK
        // sources under ../src resolve their peers from example/node_modules
        // via extraNodeModules below.
        //
        // This was previously `blacklistRE`, an alias Metro has since removed.
        // Metro silently ignored the unknown key, so root node_modules stayed
        // in the graph and the SDK resolved a second copy of React, failing at
        // runtime with "Invalid hook call" / "Cannot read property 'useState'
        // of null" inside AdZone.
        blockList: exclusionList([
            new RegExp(
                `^${escapeForRegExp(path.join(root, "node_modules"))}\\/.*$`,
            ),
        ]),
        extraNodeModules: modules.reduce((acc, name) => {
            acc[name] = path.join(__dirname, "node_modules", name);
            return acc;
        }, {}),
    },
    projectRoot: __dirname,
    watchFolders: [root],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
