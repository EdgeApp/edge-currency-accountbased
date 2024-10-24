import {
  asArray,
  asCodec,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner
} from 'cleaners'

export interface TonNetworkInfo {
  minimumAddressBalance: string
  pluginMnemonicKeyName: string
  tonCenterUrl: string
  tonOrbsServers: string[]
}

//
// Info Payload
//

export const asTonInfoPayload = asObject({
  tonOrbsServers: asOptional(asArray(asString))
})
export type TonInfoPayload = ReturnType<typeof asTonInfoPayload>

export const asTonWalletOtherData = asObject({
  contractState: asOptional(asString, 'uninitialized'), //  "active" | "uninitialized" | "frozen";
  mostRecentLogicalTime: asOptional(asString),
  mostRecentHash: asOptional(asString)
})
export type TonWalletOtherData = ReturnType<typeof asTonWalletOtherData>

//
// Wallet Info and Keys:
//

export interface TonPrivateKeys {
  mnemonic: string
}
export const asTonPrivateKeys = (pluginId: string): Cleaner<TonPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString
  })

  return asCodec(
    raw => {
      const from = asKeys(raw)
      return {
        mnemonic: from[`${pluginId}Mnemonic`]
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic
      }
    }
  )
}

const asBigInt = (val: any): BigInt => {
  if (typeof val !== 'bigint') {
    throw new Error('Expected a BigInt')
  }
  return val
}

const asMessage = asObject({
  message: asOptional(asString),
  recipient: asString,
  sender: asOptional(asString),
  value: asOptional(asBigInt)
})

export const asParsedTx = asObject({
  hash: asString,
  inMessage: asMessage,
  lt: asBigInt,
  now: asNumber,
  originalTx: asObject({
    totalFees: asObject({
      coins: asBigInt
    })
  }),
  outMessages: asArray(asMessage)
})
export type ParsedTx = ReturnType<typeof asParsedTx>

export const asTonTxOtherParams = asObject({
  unsignedTxBase64: asString
})
