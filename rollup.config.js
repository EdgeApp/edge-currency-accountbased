import babel from 'rollup-plugin-babel'
const packageJson = require('./package.json')

const babelConf = {
  'presets': ['flow']
}

export default {
  entry: 'src/indexEthereum.js',
  external: Object.keys(packageJson.dependencies),
  plugins: [babel(babelConf)],

  targets: [
    {
      dest: packageJson['main'],
      format: 'cjs',
      sourceMap: true
    },
    {
      dest: packageJson['module'],
      format: 'es',
      sourceMap: true
    }
  ]
}
