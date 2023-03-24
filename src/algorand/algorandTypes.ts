import {
  asArray,
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asValue,
  Cleaner
} from 'cleaners'

import { asIntegerString, asSafeCommonWalletInfo } from '../common/types'

export const asAlgorandWalletOtherData = asObject({
  latestRound: asMaybe(asNumber, 0),
  latestTxid: asMaybe(asString, '')
})

export type AlgorandWalletOtherData = ReturnType<
  typeof asAlgorandWalletOtherData
>

export interface AlgorandNetworkInfo {
  algodServers: string[]
  indexerServers: string[]
  genesisID: string
  genesisHash: string
  minimumTxFee: number
  minimumAddressBalance: string
}

export const asAccountInformation = asObject({
  // address: asString,
  amount: asNumber,
  // 'amount-without-pending-rewards': asNumber,
  // 'apps-local-state': [],
  // 'apps-total-schema': {
  //   'num-byte-slice': 0,
  //   'num-uint': 0
  // },
  assets: asArray(
    asObject({
      amount: asNumber,
      'asset-id': asNumber
      // 'is-frozen': asBoolean
    })
  ),
  // 'created-apps': [],
  // 'created-assets': [],
  // 'min-balance': 200000,
  // 'pending-rewards': 0,
  // 'reward-base': 218288,
  // rewards: 0,
  round: asNumber
  // status: 'Offline',
  // 'total-apps-opted-in': 0,
  // 'total-assets-opted-in': 1
})

export type AccountInformation = ReturnType<typeof asAccountInformation>

export const asBaseTransaction = asObject({
  // 'close-rewards': asNumber, // 0,
  // 'closing-amount': asNumber, // 0,
  'confirmed-round': asNumber, // round number,
  fee: asNumber, // 1000,
  'first-valid': asNumber, // round number,
  // 'genesis-hash': asString, // 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
  // 'genesis-id': asString, // 'mainnet-v1.0',
  id: asString,
  // 'intra-round-offset': asNumber, // 27,
  // 'last-valid': asNumber, // round number,
  note: asOptional(asString),
  // 'receiver-rewards': asNumber, // 0,
  'round-time': asNumber, // unix timestamp,
  sender: asString,
  // 'sender-rewards': asNumber, // 0,
  // signature: asObject({
  //   sig: asString
  // }),
  'tx-type': asString
}).withRest

export type BaseTransaction = ReturnType<typeof asBaseTransaction>

const asPayTxType = asValue('pay')
export const asPayTransaction = asObject({
  'payment-transaction': asObject({
    amount: asNumber, // 0,
    'close-amount': asNumber, // 0,
    receiver: asString
  }),
  'tx-type': asPayTxType
})

export const asIndexerPayTransactionResponse = asObject({
  'current-round': asNumber,
  'next-token': asOptional(asString),
  transactions: asArray(asBaseTransaction)
})

export type IndexerPayTransactionResponse = ReturnType<
  typeof asIndexerPayTransactionResponse
>

export const asSuggestedTransactionParams = asObject({
  flatFee: asBoolean, // false
  fee: asNumber, // 0
  firstRound: asNumber, // 27857494
  lastRound: asNumber, // 27858494
  genesisID: asString, // 'mainnet-v1.0'
  genesisHash: asString // 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8='
})

export type SuggestedTransactionParams = ReturnType<
  typeof asSuggestedTransactionParams
>

export const asBaseTxOpts = asObject({
  type: asString
}).withRest

export type BaseTxOpts = ReturnType<typeof asBaseTxOpts>

export const asAlgorandUnsignedTx = asObject({
  encodedTx: asString,
  recipient: asOptional(asString)
})

export type AlgorandUnsignedTx = ReturnType<typeof asAlgorandUnsignedTx>

export const asPayTxOpts = asObject({
  type: asPayTxType,
  to: asString,
  amount: asNumber
}).withRest

export const asMaybeCustomFee = asMaybe(
  asObject({ fee: asOptional(asString) }),
  { fee: undefined }
)

export const asMaybeAssetIndexLocation = asMaybe(
  asObject({
    assetIndex: asIntegerString
  })
)

export type SafeAlgorandWalletInfo = ReturnType<typeof asSafeAlgorandWalletInfo>
export const asSafeAlgorandWalletInfo = asSafeCommonWalletInfo

export interface AlgorandPrivateKeys {
  mnemonic: string
}
export const asAlgorandPrivateKeys = (
  pluginId: string
): Cleaner<AlgorandPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return { mnemonic: clean[`${pluginId}Mnemonic`] }
    },
    clean => {
      return { [`${pluginId}Mnemonic`]: clean.mnemonic }
    }
  )
}
