import babel from 'rollup-plugin-babel'
const packageJson = require('./package.json')

const babelConf = {
  presets: ['flow']
}

export default {
  entry: 'src/indexRipple.js',
  external: [
    ...Object.keys(packageJson.dependencies),
    ...Object.keys(packageJson.devDependencies)
  ],
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
