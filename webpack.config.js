const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { DefinePlugin } = require('webpack');
const path = require('path');

const makeConfig = (argv, { entry, out, target, library = 'commonjs' }) => ({
    mode: argv.mode,
    devtool: argv.mode === 'production' ? false : 'inline-source-map',
    entry,
    target,
    output: {
        path: path.join(__dirname, path.dirname(out)),
        filename: path.basename(out),
        publicPath: '',
        libraryTarget: library,
        chunkFormat: library,
    },
    externals: {
        vscode: 'commonjs vscode',
        'fs': 'commonjs fs',
        'os': 'commonjs os',
        'crypto': 'commonjs crypto',
        'rimraf': 'commonjs rimraf',
        'mkdirp': 'commonjs mkdirp',
        'path': 'commonjs path',
        'rxjs': 'commonjs rxjs',
        'child_process': 'commonjs child_process',
        'split2': 'commonjs split2',
        'module': 'commonjs module',
        'zeromq': 'commonjs zeromq',
        '@nteract/messaging/lib/wire-protocol': 'commonjs @nteract/messaging/lib/wire-protocol'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
        fallback: { "util": require.resolve("util/") }
    },
    experiments: {
        outputModule: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                options: {
                    configFile: path.join(path.dirname(entry), 'tsconfig.json'),
                    transpileOnly: true,
                    compilerOptions: {
                        noEmit: false,
                        module: 'esnext'
                    },
                },
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            importLoaders: 1,
                            modules: true,
                        },
                    },
                ],
            }
        ],
    },
    plugins: [
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: path.join(path.dirname(entry), 'tsconfig.json'),
            },
        }),
        new DefinePlugin({
            __webpack_relative_entrypoint_to_root__: JSON.stringify(
                path.posix.relative(path.posix.dirname(`/index.js`), '/'),
            ),
            scriptUrl: 'import.meta.url',
        })
    ],
    infrastructureLogging: {
        level: "log", 
    },
});

module.exports = (env, argv) => [
    makeConfig(argv, { entry: './src/extension/extension.ts', out: './out/extension/extension.js', target: 'node' }),
    makeConfig(argv, { entry: './src/extension/extension.ts', out: './out/extension/extension.web.js', target: 'webworker' }),
];
