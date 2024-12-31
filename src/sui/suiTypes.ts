import { asCodec, asObject, asOptional, asString, Cleaner } from 'cleaners'

export interface SuiNetworkInfo {
  network: 'mainnet' | 'testnet'
  pluginMnemonicKeyName: string
}

//
// Info Payload
//

export const asSuiInfoPayload = asObject(() => {})
export type SuiInfoPayload = ReturnType<typeof asSuiInfoPayload>

export const asSuiWalletOtherData = asObject({
  latestTxidFrom: asOptional(asString),
  latestTxidTo: asOptional(asString)
})
export type SuiWalletOtherData = ReturnType<typeof asSuiWalletOtherData>

//
// Wallet Info and Keys:
//

export interface SuiPrivateKeys {
  mnemonic: string
}
export const asSuiPrivateKeys = (pluginId: string): Cleaner<SuiPrivateKeys> => {
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
