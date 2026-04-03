import {
  asArray,
  asCodec,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner,
  uncleaner
} from 'cleaners'

export interface TonNetworkInfo {
  defaultWalletContract: string
  drpcUrl: string
  jettonTransferGas: string
  minimumAddressBalance: string
  pluginMnemonicKeyName: string
  tonCenterUrl: string
}

//
// Info Payload
//

export const asTonInfoPayload = asObject({
  drpcUrl: asOptional(asString)
})
export type TonInfoPayload = ReturnType<typeof asTonInfoPayload>

const asStringRecord: Cleaner<Record<string, string>> = (
  raw: unknown
): Record<string, string> => {
  if (raw == null || typeof raw !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v
  }
  return out
}

export const asTonWalletOtherData = asObject({
  contractState: asOptional(asString, 'uninitialized'), //  "active" | "uninitialized" | "frozen";
  jettonWalletAddresses: asOptional(
    asStringRecord,
    (): Record<string, string> => ({})
  ),
  mostRecentLogicalTime: asOptional(asString),
  mostRecentHash: asOptional(asString)
})
export type TonWalletOtherData = ReturnType<typeof asTonWalletOtherData>

//
// Wallet Info and Keys:
//

export interface TonPrivateKeys {
  mnemonic: string
  walletContract: string
}
export const asTonPrivateKeys = (pluginId: string): Cleaner<TonPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString,
    walletContract: asString
  })

  return asCodec(
    raw => {
      const from = asKeys(raw)
      return {
        mnemonic: from[`${pluginId}Mnemonic`],
        walletContract: from.walletContract
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        walletContract: clean.walletContract
      }
    }
  )
}
export const wasTonPrivateKeys = (pluginId: string): Cleaner<TonPrivateKeys> =>
  uncleaner(asTonPrivateKeys(pluginId))

const asBigInt = (val: any): BigInt => {
  if (typeof val !== 'bigint') {
    throw new Error('Expected a BigInt')
  }
  return val
}

const asNullableString = (raw: unknown): string | null => {
  if (raw == null) return null
  if (typeof raw !== 'string') throw new Error('Expected string or null')
  return raw
}

export const asJettonTransferInfo = asObject({
  jettonAmount: asBigInt,
  message: asNullableString
})
export type JettonTransferInfo = ReturnType<typeof asJettonTransferInfo>

const asMessage = asObject({
  jetton_notify: asOptional(asJettonTransferInfo),
  jetton_req: asOptional(asJettonTransferInfo),
  message: asOptional(asString),
  recipient: asString,
  sender: asOptional(asString),
  txType: asOptional(asString),
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

export const asTonInitOptions = asObject({
  drpcApiKey: asOptional(asString),
  tonCenterApiKeys: asOptional(asArray(asString), () => [])
})
export type TonInitOptions = ReturnType<typeof asTonInitOptions>
