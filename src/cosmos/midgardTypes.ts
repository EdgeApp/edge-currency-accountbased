import { HttpEndpoint } from '@cosmjs/stargate'
import { asArray, asMaybe, asObject, asOptional, asString } from 'cleaners'

import { PluginEnvironment } from '../common/innerPlugin'
import { CosmosNetworkInfo } from './cosmosTypes'

export interface MidgardNetworkInfo extends CosmosNetworkInfo {
  chainIdUpdateUrl: string
  midgardConnectionInfo: HttpEndpoint
  transactionFeeConnectionInfo: HttpEndpoint
}

export function isMidgardEnvironment(
  env: PluginEnvironment<CosmosNetworkInfo | MidgardNetworkInfo>
): env is PluginEnvironment<MidgardNetworkInfo> {
  const networkInfo = (env as PluginEnvironment<MidgardNetworkInfo>).networkInfo
  return (
    'chainIdUpdateUrl' in networkInfo &&
    'midgardConnectionInfo' in networkInfo &&
    networkInfo.chainIdUpdateUrl != null &&
    networkInfo.midgardConnectionInfo != null
  )
}

export const asChainIdUpdate = asObject({
  result: asObject({
    node_info: asObject({
      network: asString // 'thorchain-mainnet-v1' or 'mayachain-mainnet-v1'
    })
  })
})

// Midgard API https://midgard.ninerealms.com/v2/doc#operation/GetActions
const asMidgardAction = asObject({
  address: asString,
  coins: asArray(
    asObject({
      amount: asString,
      asset: asString // 'THOR.RUNE' or 'MAYA.CACAO'
    })
  ),
  txID: asString
})
export type MidgardAction = ReturnType<typeof asMidgardAction>
export const asMidgardActionResponse = asObject({
  date: asString,
  height: asString,
  in: asArray(asMidgardAction),
  metadata: asObject(
    asObject({
      memo: asString,
      networkFees: asOptional(
        asArray(
          asObject({
            amount: asString,
            asset: asString // 'THOR.RUNE' or 'MAYA.CACAO'
          })
        ),
        () => []
      )
    })
  ),
  out: asArray(asMidgardAction),
  // Midgard reports 'success', 'pending', or 'failed'. A failed action
  // reverted its state changes on-chain, so its `in`/`out` amounts never
  // actually moved (only the network fee was burned). Default to 'success'
  // to preserve behavior if the field is ever absent.
  status: asMaybe(asString, () => 'success')
  // pools: ['BTC.BTC'],
  // type: 'swap'
})
export type MidgardActionResponse = ReturnType<typeof asMidgardActionResponse>
export const asMidgardActionsResponse = asObject({
  actions: asArray(asMidgardActionResponse),
  // count: '5',
  meta: asObject({
    nextPageToken: asString // '169417139000000051',
    // prevPageToken: '170158859000000025'
  })
})

export const asMidgardWalletOtherData = asObject({
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

export type MidgardWalletOtherData = ReturnType<typeof asMidgardWalletOtherData>
