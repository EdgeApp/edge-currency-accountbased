import alias from 'rollup-plugin-alias'
import babel from 'rollup-plugin-babel'
import json from 'rollup-plugin-json'
import multiEntry from 'rollup-plugin-multi-entry'

import config from './rollup.config.js'

const babelOptions = {
  presets: ['flow']
}

export default {
  external: config.external,
  input: './test/**/*.js',
  output: [{ file: 'build/tests.cjs.js', format: 'cjs' }],
  plugins: [
    multiEntry(),
    json(),
    alias({ 'buffer-hack': 'buffer' }),
    babel(babelOptions)
  ],
  sourcemap: true
}
