import babel from '@rollup/plugin-babel'
import commonJs from '@rollup/plugin-commonjs'
import nodeResolve from '@rollup/plugin-node-resolve'

const files = [
  {
    input: './node_modules/@polkadot/util-crypto/index.js',
    output: {
      file: './lib/polkadot/bundles/utilCrypto.js',
      format: 'esm',
      exports: 'named'
    }
  },
  {
    input: './node_modules/@polkadot/keyring/index.js',
    output: {
      file: './lib/polkadot/bundles/keyring.js',
      format: 'esm',
      exports: 'named'
    }
  },
  {
    input: './node_modules/@substrate/txwrapper-polkadot/lib/index.js',
    output: {
      file: './lib/polkadot/bundles/txwrapper.js',
      format: 'esm',
      exports: 'auto'
    }
  }
]

const options = {
  external: ['jsbi'],
  plugins: [
    // Fix JSBI import
    {
      name: 'fix-jsbi',
      resolveId(source) {
        if (/jsbi\.mjs/.test(source)) return 'jsbi'
      }
    },
    nodeResolve({ browser: true, preferBuiltins: true }), // 'preferBuiltins: true' to suppress warning
    commonJs({
      dynamicRequireTargets: [
        'node_modules/@substrate/txwrapper-core/lib/core/index.js'
      ]
    }),
    babel({
      presets: [
        [
          '@babel/preset-env',
          {
            exclude: ['babel-plugin-transform-exponentiation-operator']
          }
        ]
      ],
      plugins: ['babel-plugin-transform-bigint'],
      babelHelpers: 'bundled'
    })
  ],
  // Suppress THIS_IS_UNDEFINED warnings
  onwarn: warning => {
    if (warning.code !== 'THIS_IS_UNDEFINED') console.warn(warning.message)
  }
}

export default files.map(file => ({ ...file, ...options }))