import { asArray, asMaybe, asObject, asString } from 'cleaners'

import { PluginEnvironment } from '../common/innerPlugin'
import { CosmosNetworkInfo } from './cosmosTypes'

export interface ThorchainNetworkInfo extends CosmosNetworkInfo {
  chainIdUpdateUrl: string
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
