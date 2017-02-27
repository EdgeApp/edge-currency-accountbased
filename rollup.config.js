import buble from 'rollup-plugin-buble'
const packageJson = require('./package.json')

export default {
  entry: 'src/index.js',
  plugins: [
    buble()
  ],
  targets: [
    {
      dest: packageJson['main'],
      format: 'cjs',
      sourceMap: true
    }
  ]
}
