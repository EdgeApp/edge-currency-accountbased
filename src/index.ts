import 'regenerator-runtime/runtime'

import { binance } from './binance/bnbInfo'
import { eosPlugins } from './eos/index'
import { ethPlugins } from './ethereum/ethInfos'
import { fio } from './fio/fioInfo'
import { hedera } from './hedera/hederaInfo'
import { polkadot } from './polkadot/polkadotInfo'
import { solana } from './solana/solanaInfo'
import { stellar } from './stellar/stellarInfo'
import { tezos } from './tezos/tezosInfo'
import { tron } from './tron/tronInfo'
import { ripple } from './xrp/xrpInfo'
import { zcash } from './zcash/zecInfo'

const plugins = {
  ...eosPlugins,
  ...ethPlugins,
  binance,
  fio,
  hedera,
  polkadot,
  // "ripple" is network name. XRP is just an asset:
  ripple,
  solana,
  stellar,
  tezos,
  tron,
  zcash
}

if (
  typeof window !== 'undefined' &&
  typeof window.addEdgeCorePlugins === 'function'
) {
  window.addEdgeCorePlugins(plugins)
}

export default plugins
