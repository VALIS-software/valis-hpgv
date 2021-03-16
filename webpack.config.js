const path = require('path');
const webpack = require("webpack");

// output settings
const buildName = 'valis-hpgv';

module.exports = (env, argv) => {
    env = env || {};

    let releaseMode = argv.mode === 'development';

    const config = {
        node: { fs: 'empty' },
        mode: releaseMode ? "production" : "development",

        context: path.resolve(__dirname, "src"),

        entry: "./index",
        output: {
            path: path.join(__dirname, "dist"),
            filename: env.includeReact ? `${buildName}.js` : `${buildName}.react-peer.js`,
            library: '',
            libraryTarget: 'umd',
        },

        devServer: {
            publicPath: '/dist',
        },

        // Enable sourcemaps for debugging webpack's output.
        devtool: releaseMode ? "source-map" : "source-map",

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
                },
                // css are loaded as strings
                {
                    test: /\.css/,
                    loader: 'text-loader'
                }
            ]
        },

        plugins: [
            // pass --env to javascript build via process.env
            new webpack.DefinePlugin({ "process.env": JSON.stringify(env) }),
        ].concat(
            // add bundle analyzer plugin if flag is set
            env.analyze ? [new (require('webpack-bundle-analyzer').BundleAnalyzerPlugin)] : []
        ),

        externals: env.includeReact ? {} : {
            // don't bundle react or react-dom
            'react': {
                commonjs: "react",
                commonjs2: "react",
                amd: "React",
                root: "React"
            },
            "react-dom": {
                commonjs: "react-dom",
                commonjs2: "react-dom",
                amd: "ReactDOM",
                root: "ReactDOM"
            }
        }
    }

    return config;
};
