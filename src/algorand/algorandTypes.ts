import { asCodec, asObject, asString, Cleaner } from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export const asAlgorandWalletOtherData = asObject({})

export type AlgorandWalletOtherData = ReturnType<
  typeof asAlgorandWalletOtherData
>

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
