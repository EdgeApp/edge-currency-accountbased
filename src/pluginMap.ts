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
import { sui } from './sui/suiInfo'
import { suitestnet } from './sui/suitestnetInfo'
import { tezos } from './tezos/tezosInfo'
import { ton } from './ton/tonInfo'
import { tron } from './tron/tronInfo'
import { zcash } from './zcash/zcashInfo'

type MoneroOuterPlugin = typeof import('./monero/moneroInfo').monero
type ZanoOuterPlugin = typeof import('./zano/zanoInfo').zano

/**
 * Shared accountbased plugin catalog. Callers pass platform-specific Monero
 * and Zano outer plugins so each entry keeps a static import graph.
 */
// Infer the return shape from the plugin factories; annotating as EdgeCorePlugins
// widens values and breaks callers that expect EdgeCorePluginFactory.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function makePluginMap(
  monero: MoneroOuterPlugin,
  zano: ZanoOuterPlugin
) {
  return {
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
    monero,
    piratechain,
    polkadot,
    ripple,
    solana,
    stellar,
    sui,
    suitestnet,
    tezos,
    ton,
    tron,
    zano,
    zcash
  }
}
