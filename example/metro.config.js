const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const fs = require("fs");
const path = require("path");
const blacklist = require("metro-config/src/defaults/exclusionList");
const root = path.resolve(__dirname, "..");
const pak = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8")
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
        blacklistRE: blacklist([
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
