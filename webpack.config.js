const path = require('path');
const webpack = require("webpack");

const outputDirectory = `${__dirname}/dist`;

module.exports = (env) => {
    env = env || {};

    let releaseMode = !!(env.production || env.deploy);

    const config = {
        mode: releaseMode ? "production" : "development",

        context: path.resolve(__dirname, "src"),
        
        entry: "./index.ts",
        output: {
            path: outputDirectory,
            filename: 'index.js'
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
                    test: /\.bin/,
                    type: 'javascript/auto',
                    use: [{
                        loader: 'file-loader',
                        options: { name: 'assets/[name].[ext]' },
                    }],
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
