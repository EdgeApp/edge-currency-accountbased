const path = require('path')

const webpack = require('webpack')

const babelOptions = {
  // For debugging, just remove "@babel/preset-env":
  presets: [
    [
      '@babel/preset-env',
      {
        exclude: [
          'transform-exponentiation-operator' // this line here
        ]
      }
    ],
    '@babel/preset-flow'
  ],
  plugins: [
    ['@babel/plugin-transform-for-of', { assumeArray: true }],
    ['@babel/plugin-proposal-class-properties', { loose: false }]
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
      },
      {
        test: /\.js$/,
        loader: require.resolve('@open-wc/webpack-import-meta-loader')
      }
    ]
  },
  output: {
    filename: 'edge-currency-accountbased.js',
    path: path.join(path.resolve(__dirname), 'lib/react-native')
  },
  plugins: [
    new webpack.IgnorePlugin({ resourceRegExp: /^(https-proxy-agent)$/ })
  ],
  resolve: {
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      fs: false,
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      os: require.resolve('os-browserify/browser'),
      path: require.resolve('path-browserify'),
      stream: require.resolve('stream-browserify'),
      vm: require.resolve('vm-browserify')
    }
  }
}
