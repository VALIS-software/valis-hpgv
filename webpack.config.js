const path = require('path');
const webpack = require("webpack");

module.exports = (env, argv) => {
    env = env || {};

    let releaseMode = argv.mode === 'production';

    const config = {
        mode: releaseMode ? "production" : "development",

        context: path.resolve(__dirname, "src"),
        
        entry: "./index",
        output: {
            path: `${__dirname}/@types`, // hack to make sure the @types directory gets generated
            filename: '../index.js',
            library: '',
            libraryTarget: 'umd',
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
                // convert binary files into data-urls and embed into the output
                {
                    test: /\.bin/,
                    loader: 'url-loader'
                }
            ]
        },

        plugins: [
            // pass --env to javascript build via process.env
            new webpack.DefinePlugin({ "process.env": JSON.stringify(env) }),
            
        ].concat(
            env.analyze ? [new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)] : []
        ),

        externals: {
            'react': 'React',
            'react-dom': 'ReactDOM',
        }
    }

    return config;
};
