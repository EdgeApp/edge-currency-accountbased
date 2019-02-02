const path = require('path')

const webpack = require('webpack')

const packageJson = require('./package.json')

const externals = [
  'base-x',
  'biggystring',
  'edge-core-js',
  'jsonschema',
  'uri-js',
  'url-parse'
]

module.exports = {
  devtool: 'source-map',
  entry: './src/index.js',
  externals,
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: '@sucrase/webpack-loader',
          options: { transforms: ['flow'] }
        }
      }
    ]
  },
  output: {
    filename: packageJson['react-native'],
    libraryTarget: 'commonjs',
    path: path.resolve(__dirname)
  },
  plugins: [new webpack.IgnorePlugin(/^https-proxy-agent$/)]
}
