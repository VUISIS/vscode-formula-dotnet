const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { DefinePlugin } = require('webpack');
const path = require('path');

const outputFilename = 'index.js';
const devServerPort = 8111;

module.exports = (env, argv) => ({
  mode: argv.mode,
  devtool: argv.mode === 'production' ? false : 'inline-source-map',
  entry: './src/client/index.ts',
  output: {
    path: path.join(__dirname, 'out', 'client'),
    filename: outputFilename,
    publicPath: '',
    libraryTarget: 'module',
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.css'],
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
          configFile: 'src/client/tsconfig.json',
          transpileOnly: true,
          compilerOptions: {
            noEmit: false,
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
      },
    ],
  },
  devServer: {
    port: devServerPort,
    hot: true,
    disableHostCheck: true,
    writeToDisk: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
  },
  plugins: [
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        tsconfig: 'src/client/tsconfig.json',
      },
    }),
    new DefinePlugin({
      __webpack_relative_entrypoint_to_root__: JSON.stringify(
        path.posix.relative(path.posix.dirname(`/${outputFilename}`), '/'),
      ),
      scriptUrl: 'import.meta.url',
    }),
  ],
});
