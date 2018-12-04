/**
 * Created by paul on 7/7/17.
 */

module.exports = {
  entry: './src/common/export-fixes.js',
  module: {
    loaders: [{ test: /\.json$/, loader: 'json-loader' }]
  },
  output: {
    filename: './lib/common/export-fixes-bundle.js',
    libraryTarget: 'commonjs'
  }
}
