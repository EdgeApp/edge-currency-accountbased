import { asSafeCommonWalletInfo } from '../common/types'

// eslint-disable-next-line
export interface CosmosNetworkInfo {}

//
// Wallet Info and Keys:
//

export type SafeCosmosWalletInfo = ReturnType<typeof asSafeCosmosWalletInfo>
export const asSafeCosmosWalletInfo = asSafeCommonWalletInfo

export interface CosmosPrivateKeys {
  mnemonic: string
}
