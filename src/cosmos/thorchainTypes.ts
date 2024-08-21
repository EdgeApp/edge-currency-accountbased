import { HttpEndpoint } from '@cosmjs/stargate'
import { asArray, asMaybe, asObject, asString } from 'cleaners'

import { PluginEnvironment } from '../common/innerPlugin'
import { CosmosNetworkInfo } from './cosmosTypes'

export interface ThorchainNetworkInfo extends CosmosNetworkInfo {
  chainIdUpdateUrl: string
  transactionFeeConnectionInfo: HttpEndpoint
  midgardConnctionInfo: HttpEndpoint
}

export function isThorchainEnvironment(
  env: PluginEnvironment<CosmosNetworkInfo | ThorchainNetworkInfo>
): env is PluginEnvironment<ThorchainNetworkInfo> {
  return (
    (env as PluginEnvironment<ThorchainNetworkInfo>).currencyInfo.pluginId ===
    'thorchainrune'
  )
}

export const asChainIdUpdate = asObject({
  result: asObject({
    node_info: asObject({
      network: asString // 'thorchain-mainnet-v1',
    })
  })
})

// Midgard API https://midgard.ninerealms.com/v2/doc#operation/GetActions
const asMidgardAction = asObject({
  address: asString,
  coins: asArray(
    asObject({
      amount: asString,
      asset: asString // 'THOR.RUNE'
    })
  ),
  txID: asString
})
export type MidgardAction = ReturnType<typeof asMidgardAction>
export const asMidgardActionsResponse = asObject({
  actions: asArray(
    asObject({
      date: asString,
      height: asString,
      in: asArray(asMidgardAction),
      metadata: asObject(
        asObject({
          memo: asString,
          networkFees: asArray(
            asObject({
              amount: asString,
              asset: asString // 'THOR.RUNE'
            })
          )
        })
      ),
      out: asArray(asMidgardAction)
      // pools: ['BTC.BTC'],
      // status: 'success',
      // type: 'swap'
    })
  ),
  // count: '5',
  meta: asObject({
    nextPageToken: asString // '169417139000000051',
    // prevPageToken: '170158859000000025'
  })
})

export const asThorchainWalletOtherData = asObject({
  midgardTxQueryParams: asMaybe(
    asObject({
      mostRecentHeight: asString,
      mostRecentTxId: asString
    }),
    () => ({
      mostRecentHeight: '0',
      mostRecentTxId: ''
    })
  )
})

export type ThorchainWalletOtherData = ReturnType<
  typeof asThorchainWalletOtherData
>

export const asThornodeNetwork = asObject({
  // bond_reward_rune: asString, // '17257435059176',
  // burned_bep_2_rune: asString, // '47115838110346964',
  // burned_erc_20_rune: asString, // '1653783031763036',
  // effective_security_bond: asString, // '6621166637606310',
  // gas_spent_rune: asString, // '119414731966742',
  // gas_withheld_rune: asString, // '159093044870164',
  native_outbound_fee_rune: asString, // '2000000',
  native_tx_fee_rune: asString // '2000000',
  // outbound_fee_multiplier: asString, // '15000',
  // rune_price_in_tor: asString, // '649194931',
  // tns_fee_per_block_rune: asString, // '20',
  // tns_register_fee_rune: asString, // '1000000000',
  // tor_price_in_rune: asString, // '15403694',
  // total_bond_units: asString, // '22182160',
  // total_reserve: asString, // '8596638591565880',
  // vaults_migrating: false
})
