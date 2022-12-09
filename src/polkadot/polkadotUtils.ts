import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import * as utilCrypto from '@polkadot/util-crypto'

const { ed25519PairFromSeed, isAddress, mnemonicToMiniSecret } = utilCrypto

export {
  ApiPromise,
  WsProvider,
  Keyring,
  ed25519PairFromSeed,
  isAddress,
  mnemonicToMiniSecret
}
