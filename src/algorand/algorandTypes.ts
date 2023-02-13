import { asCodec, asNumber, asObject, asString, Cleaner } from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

export const asAlgorandWalletOtherData = asObject({})

export type AlgorandWalletOtherData = ReturnType<
  typeof asAlgorandWalletOtherData
>

export interface AlgorandNetworkInfo {
  algodServers: string[]
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
  // assets: [
  //   {
  //     amount: 1,
  //     'asset-id': 954648101,
  //     'is-frozen': true
  //   }
  // ],
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
