const { exec } = require('child_process')
const path = require('path')
const webpack = require('webpack')
const { ESBuildMinifyPlugin } = require('esbuild-loader')

const debug = process.env.WEBPACK_SERVE

// Try exposing our socket to adb (errors are fine):
if (process.env.WEBPACK_SERVE) {
  console.log('adb reverse tcp:8082 tcp:8082')
  exec('adb reverse tcp:8082 tcp:8082', () => {})
}

const bundlePath = path.resolve(
  __dirname,
  'android/src/main/assets/edge-currency-accountbased'
)

module.exports = {
  devtool: debug ? 'source-map' : undefined,
  devServer: {
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers':
        'X-Requested-With, content-type, Authorization',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      // Cross-origin isolation headers required for SharedArrayBuffer (needed by mixFetch web workers)
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp'
    },
    hot: false,
    port: 8082,
    static: bundlePath
  },
  entry: './src/index.ts',
  mode: debug ? 'development' : 'production',
  module: {
    rules: [
      {
        exclude: /\/node_modules\//,
        test: /\.ts$/,
        use: {
          loader: 'esbuild-loader',
          options: { loader: 'ts', target: 'chrome55' }
        }
      }
    ]
  },
  optimization: {
    minimizer: [
      new ESBuildMinifyPlugin({
        target: 'chrome67'
      })
    ]
  },
  output: {
    chunkFilename: '[name].chunk.js',
    filename: 'edge-currency-accountbased.js',
    path: bundlePath
  },
  plugins: [
    new webpack.IgnorePlugin({ resourceRegExp: /^(https-proxy-agent)$/ }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer']
    }),
    new webpack.ProvidePlugin({
      process: path.resolve('node_modules/process/browser.js')
    })
  ],
  resolve: {
    alias: {
      '@emurgo/cardano-serialization-lib-nodejs':
        '@emurgo/cardano-serialization-lib-asmjs'
    },
    extensions: ['.ts', '.js'],
    fallback: {
      // assert: require.resolve('assert'),
      crypto: require.resolve('crypto-browserify'),
      fs: false,
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      string_decoder: require.resolve('string_decoder'),
      url: require.resolve('url'),
      vm: require.resolve('vm-browserify')
    }
  },
  target: ['web', 'es5']
}
