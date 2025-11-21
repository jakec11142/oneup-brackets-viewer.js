const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
    entry: {
        'stage-form-creator': './src/form.ts',
        'brackets-viewer': './src/index.ts',
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: 'brackets-viewer.min.css',
        }),
    ],
    resolve: {
        extensions: ['.ts', '.js'],
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].min.js',
        // Enable dynamic imports for code splitting
        chunkFilename: '[name].chunk.js',
        // Clean output directory
        clean: false,
    },
    optimization: {
        // Code splitting configuration
        splitChunks: {
            chunks: 'async',
            minSize: 10000,
            maxSize: 50000,
            cacheGroups: {
                // Separate vendor dependencies
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'async',
                    priority: 10,
                },
                // Separate localization files
                locales: {
                    test: /[\\/]lang[\\/]/,
                    name: 'locales',
                    chunks: 'async',
                    priority: 5,
                },
            },
        },
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: ['babel-loader', 'ts-loader'],
            },
            {
                test: /\.scss$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    {
                        loader: "postcss-loader",
                        options: {
                            postcssOptions: {
                                plugins: [
                                    "autoprefixer",
                                ]
                            }
                        }
                    },
                    'sass-loader',
                ],
            },
        ],
    },
};
