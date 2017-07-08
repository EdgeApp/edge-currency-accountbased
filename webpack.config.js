/**
 * Created by paul on 7/7/17.
 */

module.exports = {
  entry: './intermediate/export-fixes.js',
  externals: ['buffer'],
  module: {
    loaders: [{ test: /\.json$/, loader: 'json-loader' }]
  },
  output: {
    filename: './lib/export-fixes-bundle.js',
    libraryTarget: 'commonjs'
  }
}
