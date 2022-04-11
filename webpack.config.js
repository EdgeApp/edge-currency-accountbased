const path = require('path')

const webpack = require('webpack')

const babelOptions = {
  // For debugging, just remove "@babel/preset-env":
  presets: ['@babel/preset-env', '@babel/preset-flow'],
  plugins: [['@babel/plugin-transform-for-of', { assumeArray: true }]],
  cacheDirectory: true
}

module.exports = {
  devtool: 'source-map',
  entry: './src/index.js',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: { loader: 'babel-loader', options: babelOptions }
      }
    ]
  },
  output: {
    filename: 'edge-currency-accountbased.js',
    path: path.join(path.resolve(__dirname), 'lib/react-native')
  },
  plugins: [
    new webpack.IgnorePlugin({ resourceRegExp: /^https-proxy-agent$/ }),
    new webpack.ContextReplacementPlugin(/(binance-chain|polkadot\/bundles)/)
  ],
  resolve: {
    fallback: {
      fs: false,
      vm: 'vm-browserify',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      https: 'https-browserify',
      http: 'stream-http',
      os: 'os-browserify/browser',
      path: 'path-browserify',
      zlib: 'browserify-zlib',
      tty: 'tty-browserify'
    }
  }
}
