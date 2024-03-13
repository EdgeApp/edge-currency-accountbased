import 'regenerator-runtime/runtime'

import type { EdgeCorePlugins } from 'edge-core-js/types'

import { algorand } from './algorand/algorandInfo'
import { binance } from './binance/binanceInfo'
import { cardano } from './cardano/cardanoInfo'
import { cardanotestnet } from './cardano/cardanoTestnetInfo'
import { cosmosPlugins } from './cosmos/cosmosInfos'
import { eosPlugins } from './eos/eosInfos'
import { ethereumPlugins } from './ethereum/ethereumInfos'
import { calibration } from './filecoin/calibrationInfo'
import { filecoin } from './filecoin/filecoinInfo'
import { fio } from './fio/fioInfo'
import { hedera } from './hedera/hederaInfo'
import { piratechain } from './piratechain/piratechainInfo'
import { liberland } from './polkadot/info/liberlandInfo'
import { liberlandtestnet } from './polkadot/info/liberlandTestnetInfo'
import { polkadot } from './polkadot/info/polkadotInfo'
import { ripple } from './ripple/rippleInfo'
import { solana } from './solana/solanaInfo'
import { stellar } from './stellar/stellarInfo'
import { tezos } from './tezos/tezosInfo'
import { tron } from './tron/tronInfo'
import { zcash } from './zcash/zcashInfo'

const plugins = {
  ...eosPlugins,
  ...ethereumPlugins,
  ...cosmosPlugins,
  algorand,
  binance,
  cardano,
  cardanotestnet,
  filecoin,
  calibration,
  fio,
  hedera,
  liberland,
  liberlandtestnet,
  piratechain,
  polkadot,
  ripple,
  solana,
  stellar,
  tezos,
  tron,
  zcash
}

declare global {
  interface Window {
    addEdgeCorePlugins?: (plugins: EdgeCorePlugins) => void
  }
}

if (
  typeof window !== 'undefined' &&
  typeof window.addEdgeCorePlugins === 'function'
) {
  window.addEdgeCorePlugins(plugins)
}

export default plugins
