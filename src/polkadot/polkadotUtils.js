// @flow
import '@polkadot/wasm-crypto/initOnlyAsm'

// import 'jsbi'
import { Keyring } from './bundles/keyring.js'
import txWrapper from './bundles/txwrapper.js'
import {
  ed25519PairFromSeed,
  encodeAddress,
  isAddress,
  mnemonicToMiniSecret
} from './bundles/utilCrypto.js'

const {
  construct,
  createMetadata,
  deriveAddress,
  getRegistry,
  methods,
  PolkadotSS58Format
} = txWrapper.default

export {
  construct,
  createMetadata,
  deriveAddress,
  getRegistry,
  methods,
  PolkadotSS58Format,
  ed25519PairFromSeed,
  encodeAddress,
  isAddress,
  mnemonicToMiniSecret,
  Keyring
}
