import commonJs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'

export default {
  external: ['bn.js'],
  input: './src/polkadot/polkadot-sdk-bundle.js.flow',
  output: {
    file: './src/polkadot/polkadot-sdk-bundle.js',
    format: 'cjs'
  },
  plugins: [
    commonJs(),
    nodeResolve({
      preferBuiltins: true,
      // Use the browser build to avoid advanced features:
      exportConditions: ['browser']
    })
  ]
}
