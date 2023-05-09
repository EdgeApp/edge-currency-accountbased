import 'regenerator-runtime/runtime'

import { algorand } from './algorand/algorandInfo'
import { binance } from './binance/binanceInfo'
import { eosPlugins } from './eos/eosInfos'
import { ethereumPlugins } from './ethereum/ethereumInfos'
import { fio } from './fio/fioInfo'
import { hedera } from './hedera/hederaInfo'
import { polkadot } from './polkadot/polkadotInfo'
import { ripple } from './ripple/rippleInfo'
import { solana } from './solana/solanaInfo'
import { stellar } from './stellar/stellarInfo'
import { tezos } from './tezos/tezosInfo'
import { tron } from './tron/tronInfo'
import { piratechain } from './zcash/piratechainInfo'
import { zcash } from './zcash/zcashInfo'

const plugins = {
  ...eosPlugins,
  ...ethereumPlugins,
  algorand,
  binance,
  fio,
  hedera,
  piratechain,
  polkadot,
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
