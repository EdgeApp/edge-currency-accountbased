const path = require('path')

const webpack = require('webpack')

const babelOptions = {
  // For debugging, just remove "@babel/preset-env":
  presets: ['@babel/preset-flow'],
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
  plugins: [new webpack.IgnorePlugin(/^https-proxy-agent$/)],
  node: {
    fs: 'empty'
  }
}
