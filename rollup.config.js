import babel from '@rollup/plugin-babel'
import commonJs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'
import modify from 'rollup-plugin-modify'

const files = [
  {
    input: './node_modules/@polkadot/util-crypto/index.js',
    output: {
      file: './src/polkadot/bundles/utilCrypto.js',
      format: 'esm',
      exports: 'named'
    }
  },
  {
    input: './node_modules/@polkadot/keyring/index.js',
    output: {
      file: './src/polkadot/bundles/keyring.js',
      format: 'esm',
      exports: 'named'
    }
  },
  {
    input: './node_modules/@substrate/txwrapper-polkadot/lib/index.js',
    output: {
      file: './src/polkadot/bundles/txwrapper.js',
      format: 'esm',
      exports: 'named'
    }
  },
  {
    input: './node_modules/@polkadot/wasm-crypto-asmjs/index.js',
    output: {
      file: './src/polkadot/bundles/wasm-crypto-asmjs.js',
      format: 'esm',
      exports: 'named'
    }
  }
]

const options = {
  external: ['jsbi', '@polkadot/x-ws', '@polkadot/x-fetch'],
  // external: ['jsbi'],
  plugins: [
    json(),
    // Fix JSBI import
    {
      name: 'fix-jsbi',
      resolveId(source) {
        if (/jsbi\.mjs/.test(source)) return 'jsbi'
        // if (/jsbi\.mjs/.test(source))
        //   return './node_modules/jsbi/dist/jsbi-umd.js'
      }
    },
    nodeResolve({ exportConditions: ['node'], preferBuiltins: false }), // 'preferBuiltins: true' to suppress warning
    commonJs({
      dynamicRequireTargets: [
        'node_modules/@substrate/txwrapper-core/lib/core/index.js'
      ],
      // esmExternals: true
      esmExternals: ['@polkadot/x-ws', '@polkadot/x-fetch']
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
      plugins: [
        '@babel/plugin-syntax-bigint',
        'babel-plugin-transform-bigint',
        'babel-plugin-transform-import-meta'
      ],
      babelHelpers: 'bundled'
    }),
    modify({
      'import.meta && ': ''
    })
  ],
  // Suppress THIS_IS_UNDEFINED warnings
  onwarn: warning => {
    if (warning.code !== 'THIS_IS_UNDEFINED') console.warn(warning.message)
  }
}

export default files.map(file => ({ ...file, ...options }))
