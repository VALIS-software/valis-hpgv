const path = require('path');
const webpack = require("webpack");

const outputDirectory = `${__dirname}/dist`;

module.exports = (env) => {
    env = env || {};

    let releaseMode = !!(env.production || env.deploy);

    const config = {
        context: path.resolve(__dirname, "src"),
        entry: "./GenomeBrowser.tsx",

        mode: releaseMode ? "production" : "development",

        output: {
            path: outputDirectory,
            filename: 'GenomeBrowser.js'
        },

        // Enable sourcemaps for debugging webpack's output.
        devtool: releaseMode ? false : "source-map",

        resolve: {
            extensions: [".ts", ".tsx", ".js", ".jsx"]
        },

        module: {
            rules: [
                // All files with a '.ts' or '.tsx' extension will be handled by 'ts-loader'.
                {
                    test: /\.(ts|tsx)$/,
                    loader: "ts-loader",
                    exclude: [path.resolve(__dirname, "node_modules")],
                },
                {
                    test: /\.bin$/,
                    use: 'raw-loader'
                }
            ]
        },

        plugins: [
            // pass --env to javascript build via process.env
            new webpack.DefinePlugin({ "process.env": JSON.stringify(env) }),
        ]
    }

    return config;
};
