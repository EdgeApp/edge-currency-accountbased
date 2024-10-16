import { asCodec, asObject, asString, Cleaner } from 'cleaners'

export interface TonNetworkInfo {
  pluginMnemonicKeyName: string
}

//
// Info Payload
//

export const asTonInfoPayload = asObject(() => {})
export type TonInfoPayload = ReturnType<typeof asTonInfoPayload>

export const asTonWalletOtherData = asObject(() => {})
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
