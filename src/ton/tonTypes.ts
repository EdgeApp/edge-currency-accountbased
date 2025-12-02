import {
  asArray,
  asCodec,
  asEither,
  asMaybe,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner,
  uncleaner
} from 'cleaners'

export interface TonNetworkInfo {
  defaultWalletContract: string
  minimumAddressBalance: string
  pluginMnemonicKeyName: string
  tonCenterUrl: string
  tonOrbsServers: string[]
}

//
// Jetton Types (TEP-74 Token Standard)
//

/** Network location for a jetton token - the master contract address */
export interface JettonNetworkLocation {
  contractAddress: string
}

export const asJettonNetworkLocation = asObject({
  contractAddress: asString
})

/** Data returned from a JettonWallet's get_wallet_data method */
export interface JettonWalletData {
  balance: bigint
  ownerAddress: string
  jettonMasterAddress: string
}

/** Jetton transfer operation code per TEP-74 */
export const JETTON_TRANSFER_OP = 0x0f8a7ea5

/** Jetton transfer notification operation code per TEP-74 */
export const JETTON_TRANSFER_NOTIFICATION_OP = 0x7362d09c

/** Jetton internal transfer operation code per TEP-74 */
export const JETTON_INTERNAL_TRANSFER_OP = 0x178d4519

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
  mostRecentHash: asOptional(asString),
  // Track the most recent tx checkpoint per jetton (tokenId -> checkpoint)
  jettonMostRecentLogicalTime: asMaybe(asObject(asString), () => ({})),
  jettonMostRecentHash: asMaybe(asObject(asString), () => ({}))
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
  unsignedTxBase64: asString,
  // For jetton transfers, we need to know the token ID (master contract address)
  tokenId: asOptional(asEither(asString, asNull))
})

export const asTonInitOptions = asObject({
  tonCenterApiKeys: asOptional(asArray(asString), () => [])
})
export type TonInitOptions = ReturnType<typeof asTonInitOptions>
