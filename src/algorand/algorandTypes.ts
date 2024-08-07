import {
  asArray,
  asBoolean,
  asCodec,
  asEither,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asTuple,
  asValue,
  Cleaner
} from 'cleaners'

import {
  asIntegerString,
  asSafeCommonWalletInfo,
  WalletConnectPayload
} from '../common/types'

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
  'min-balance': asNumber,
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

const asAxferTxType = asValue('axfer')
export const asAxferTransaction = asObject({
  'asset-transfer-transaction': asObject({
    amount: asNumber,
    'asset-id': asNumber,
    // "close-amount": 0,
    receiver: asString
  }),
  'tx-type': asAxferTxType
})

export const asInnerTransaction = asObject({
  'confirmed-round': asNumber, // round number,
  fee: asNumber, // 1000,
  'first-valid': asNumber, // round number,
  note: asOptional(asString),
  'round-time': asNumber, // unix timestamp,
  sender: asString,
  'tx-type': asString
}).withRest

const asApplTxType = asValue('appl')
export const asApplTransaction = asObject({
  // 'application-transaction': {
  //   accounts: [
  //     'Q5DO5DF3O4K5BED6Y5WBS4F6POVQFMB2HFKZUEKBK66CHPJEZ7YFHL7FX4',
  //     'JI3QGFWF2E7QNO6652A74SNYZJMUCKJGAJCQQGNXSXP3BDV23KRTGBGAA4'
  //   ],
  //   'application-args': ['c3dhcA==', 'Zml4ZWQtaW5wdXQ=', 'AAAAAAACr5k='],
  //   'application-id': 1083651166,
  //   'foreign-apps': [1002541853],
  //   'foreign-assets': [0, 610886011, 31566704],
  //   'global-state-schema': { 'num-byte-slice': 0, 'num-uint': 0 },
  //   'local-state-schema': { 'num-byte-slice': 0, 'num-uint': 0 },
  //   'on-completion': 'noop'
  // },
  'inner-txns': asOptional(asArray(asInnerTransaction)),
  'tx-type': asApplTxType
}).withRest

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

export const asMaybeContractAddressLocation = asMaybe(
  asObject({
    contractAddress: asIntegerString
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

export const asAlgoWcRpcPayload = asObject({
  id: asEither(asString, asNumber),
  method: asValue('algo_signTxn'),
  params: asTuple(
    asTuple(
      asObject({
        txn: asString,
        message: asOptional(asString)
      })
    )
  )
})

export type AlgoWcRpcPayload = ReturnType<typeof asAlgoWcRpcPayload>

export interface AlgorandOtherMethods {
  parseWalletConnectV2Payload: (
    payload: AlgoWcRpcPayload
  ) => Promise<WalletConnectPayload>
}

export const asAlgorandWalletConnectPayload = asObject({
  id: asNumber,
  jsonrpc: asValue('2.0'),
  method: asValue('algo_signTxn'),
  params: asTuple(
    asArray(
      asObject({
        txn: asString,
        message: asOptional(asString)
      })
    )
  )
}).withRest

//
// Info Payload
//

export const asAlgorandInfoPayload = asObject({
  algodServers: asOptional(asArray(asString)),
  indexerServers: asOptional(asArray(asString))
})
export type AlgorandInfoPayload = ReturnType<typeof asAlgorandInfoPayload>
