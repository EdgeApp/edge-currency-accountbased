// @flow

import { Keyring, txWrapper, utilCrypto } from './sdk-bundle.js'
const { ed25519PairFromSeed, encodeAddress, isAddress, mnemonicToMiniSecret } =
  utilCrypto

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
