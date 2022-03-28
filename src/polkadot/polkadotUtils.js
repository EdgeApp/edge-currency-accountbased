// @flow

// $FlowFixMe
import { Keyring } from '../../lib/polkadot/bundles/keyring.js'
// $FlowFixMe
import txWrapper from '../../lib/polkadot/bundles/txwrapper.js'
import {
  ed25519PairFromSeed,
  encodeAddress,
  isAddress,
  mnemonicToMiniSecret
  // $FlowFixMe
} from '../../lib/polkadot/bundles/utilCrypto.js'

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
