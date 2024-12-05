import { asArray, asNumber, asObject, asOptional, asString } from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export interface BinanceNetworkInfo {
  binanceApiServers: string[]
  beaconChainApiServers: string[]
}

export const asBinanceApiNodeInfo = asObject({
  sync_info: asObject({
    latest_block_height: asNumber
  })
})

export const asSafeBnbWalletInfo = asSafeCommonWalletInfo

export const asBnbPrivateKey = asObject({
  binanceKey: asString,
  binanceMnemonic: asString
})

//
// Info Payload
//

export const asBinanceInfoPayload = asObject({
  binanceApiServers: asOptional(asArray(asString)),
  beaconChainApiServers: asOptional(asArray(asString))
})
export type BinanceInfoPayload = ReturnType<typeof asBinanceInfoPayload>
