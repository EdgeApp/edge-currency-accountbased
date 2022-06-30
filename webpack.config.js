const path = require('path')

const webpack = require('webpack')

const babelOptions = {
  // For debugging, just remove "@babel/preset-env":
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { chrome: '67' }
      }
    ],
    '@babel/preset-flow'
  ],
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
    new webpack.IgnorePlugin({ resourceRegExp: /^https-proxy-agent$/ })
  ],
  resolve: {
    fallback: {
      fs: false,
      vm: require.resolve('vm-browserify'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      https: require.resolve('https-browserify'),
      http: require.resolve('stream-http'),
      os: require.resolve('os-browserify/browser'),
      string_decoder: require.resolve('string_decoder'),
      path: require.resolve('path-browserify')
    }
  }
}
