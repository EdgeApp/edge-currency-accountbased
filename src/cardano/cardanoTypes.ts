import { asSafeCommonWalletInfo } from '../common/types'

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CardanoNetworkInfo {}

export type SafeCardanoWalletInfo = ReturnType<typeof asSafeCardanoWalletInfo>
export const asSafeCardanoWalletInfo = asSafeCommonWalletInfo
