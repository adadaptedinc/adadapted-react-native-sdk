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
        blacklistRE: exclusionList([
            new RegExp(`^${escape(path.join(root, "node_modules"))}\\/.*$`),
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
