import {
  asArray,
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  Cleaner
} from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export interface PolkadotNetworkInfo {
  rpcNodes: string[]
  ss58Format: number
  subscanBaseUrls: string[]
  subscanQueryLimit: number
  lengthFeePerByte: string
  liberlandScanUrl: string | undefined
  partialFeeOffsetMultiplier: string
}

export const asPolkadotWalletOtherData = asObject({
  subscanUrlMap: asMaybe(
    asObject(
      asMaybe(
        asObject({
          txCount: asMaybe(asNumber, 0)
        }),
        () => ({
          txCount: 0
        })
      )
    ),
    () => ({})
  ),
  txCount: asMaybe(asNumber, 0),
  newestTxid: asMaybe(asObject(asString), () => ({}))
})

export type PolkadotWalletOtherData = ReturnType<
  typeof asPolkadotWalletOtherData
>

export const asSubscanResponse = asObject({
  code: asNumber,
  message: asString,
  data: asOptional(asObject(asUnknown))
})

export type SubscanResponse = ReturnType<typeof asSubscanResponse>

// https://docs.api.subscan.io/#transfers
export const asTransfer = asObject({
  from: asString,
  to: asString,
  success: asBoolean,
  hash: asString,
  block_num: asNumber,
  block_timestamp: asNumber,
  module: asString,
  amount: asString,
  fee: asString
})

export type SubscanTx = ReturnType<typeof asTransfer>

export const asTransactions = asObject({
  count: asNumber,
  transfers: asMaybe(asArray(asTransfer), () => [])
})

export type SafePolkadotWalletInfo = ReturnType<typeof asSafePolkadotWalletInfo>
export const asSafePolkadotWalletInfo = asSafeCommonWalletInfo

export interface PolkapolkadotPrivateKeys {
  mnemonic?: string
  privateKey: string
}
export const asPolkapolkadotPrivateKeys = (
  pluginId: string
): Cleaner<PolkapolkadotPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asOptional(asString),
    [`${pluginId}Key`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`],
        privateKey: clean[`${pluginId}Key`] as string
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}Key`]: clean.privateKey
      }
    }
  )
}

export const asLiberlandTransfer = asObject({
  id: asString,
  fromId: asString,
  toId: asString,
  value: asString,
  eventIndex: asNumber,
  block: asObject({
    number: asString,
    timestamp: asString,
    extrinsics: asObject({
      nodes: asArray(
        asObject({
          hash: asString,
          // id
          // blockId
          // signerId
          events: asObject({
            nodes: asArray(
              asObject({
                id: asString
              })
            )
          })
        })
      )
    })
  })
})
export type LiberlandTransfer = ReturnType<typeof asLiberlandTransfer>

export const asLiberlandPageInfo = asObject({
  hasNextPage: asBoolean,
  endCursor: asOptional(asString)
})

export const asLiberlandTransfersResponse = asObject({
  data: asObject({
    transfers: asObject({
      nodes: asArray(asLiberlandTransfer),
      pageInfo: asLiberlandPageInfo,
      totalCount: asNumber
    })
  })
})

export const asLiberlandMeritsResponse = asObject({
  data: asObject({
    merits: asObject({
      nodes: asArray(asLiberlandTransfer),
      pageInfo: asLiberlandPageInfo,
      totalCount: asNumber
    })
  })
})

//
// Info Payload
//

export const asPolkadotInfoPayload = asObject({
  rpcNodes: asOptional(asArray(asString))
})
export type PolkadotInfoPayload = ReturnType<typeof asPolkadotInfoPayload>
