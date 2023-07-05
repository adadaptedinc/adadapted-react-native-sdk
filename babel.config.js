module.exports = {
    presets: ["module:metro-react-native-babel-preset", "@babel/preset-env"],
    plugins: [
        ["@babel/plugin-transform-typescript", { allowNamespaces: true }],
        ["@babel/plugin-transform-private-property-in-object", { "loose": true }],
        ["@babel/plugin-transform-class-properties", { "loose": true }],
        ["@babel/plugin-transform-private-methods", { "loose": true }],
    ],
};
