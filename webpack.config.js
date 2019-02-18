const path = require('path')

const webpack = require('webpack')

const packageJson = require('./package.json')

// Only bundle ethereumjs dependencies:
const externals = Object.keys(packageJson.dependencies).filter(
  name => !/^ethereumjs-/.test(name)
)

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
