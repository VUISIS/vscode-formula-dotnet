const path = require('path');
const nodeExternals = require('webpack-node-externals');

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
    externals: [nodeExternals(), 'vscode'],
    externalsPresets: {
        node: true 
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [{
            test: /\.ts$/,
            exclude: /node_modules/,
            use: [{
                loader: 'ts-loader'
            }]
        }]
    }
});

module.exports = (env, argv) => [
    makeConfig(argv, { entry: './extension/extension.ts', out: './out/extension/extension.js', target: 'node' }),
];
