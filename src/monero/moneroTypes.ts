import {
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner
} from 'cleaners'
import type {
  NetworkType,
  TransactionPriority,
  WalletEventData
} from 'react-native-monero-lwsf'
import type { Subscriber } from 'yaob'

export const EDGE_MONERO_LWS_SERVER = 'https://monerolws1.edge.app'
export const EDGE_MONERO_SERVER = `https://monerod.edge.app`

export const asMoneroInitOptions = asObject({
  edgeApiKey: asOptional(asString, '')
})
export type MoneroInitOptions = ReturnType<typeof asMoneroInitOptions>

export interface MoneroNetworkInfo {
  networkType: NetworkType
}

export const asMoneroUserSettings = asObject({
  enableCustomServers: asMaybe(asBoolean, false),
  moneroLightwalletServer: asMaybe(asString, EDGE_MONERO_LWS_SERVER)
})
export type MoneroUserSettings = ReturnType<typeof asMoneroUserSettings>

export const asMoneroKeyOptions = asObject({
  birthdayHeight: asNumber
})
export type MoneroKeyOptions = ReturnType<typeof asMoneroKeyOptions>

export const asGetBlockCountResponse = asObject({
  result: asObject({
    count: asNumber
  })
})
export type GetBlockCountResponse = ReturnType<typeof asGetBlockCountResponse>

export interface MoneroPrivateKeys {
  dataKey: string
  moneroKey: string
  birthdayHeight: number
  moneroSpendKeyPrivate: string
  moneroSpendKeyPublic: string
}

export const asMoneroPrivateKeys = (
  pluginId: string
): Cleaner<MoneroPrivateKeys> => {
  const asKeys = asObject({
    dataKey: asString,
    [`${pluginId}Key`]: asString,
    [`${pluginId}BirthdayHeight`]: asOptional(asNumber, 0),
    [`${pluginId}SpendKeyPrivate`]: asString,
    [`${pluginId}SpendKeyPublic`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        dataKey: clean.dataKey,
        moneroKey: clean[`${pluginId}Key`] as string,
        birthdayHeight: clean[`${pluginId}BirthdayHeight`] as number,
        moneroSpendKeyPrivate: clean[`${pluginId}SpendKeyPrivate`] as string,
        moneroSpendKeyPublic: clean[`${pluginId}SpendKeyPublic`] as string
      }
    },
    clean => ({
      dataKey: clean.dataKey,
      [`${pluginId}Key`]: clean.moneroKey,
      [`${pluginId}BirthdayHeight`]: clean.birthdayHeight,
      [`${pluginId}SpendKeyPrivate`]: clean.moneroSpendKeyPrivate,
      [`${pluginId}SpendKeyPublic`]: clean.moneroSpendKeyPublic
    })
  )
}

const asMoneroPublicKeysRaw = asObject({
  moneroAddress: asString,
  moneroViewKeyPrivate: asString,
  moneroViewKeyPublic: asString,
  moneroSpendKeyPublic: asString
})

interface MoneroPublicKeys {
  publicKey: string
  moneroAddress: string
  moneroViewKeyPrivate: string
  moneroViewKeyPublic: string
  moneroSpendKeyPublic: string
}

const asMoneroPublicKeys: Cleaner<MoneroPublicKeys> = asCodec(
  (raw): MoneroPublicKeys => {
    const clean = asMoneroPublicKeysRaw(raw)
    return {
      ...clean,
      publicKey: clean.moneroAddress
    }
  },
  (clean): ReturnType<typeof asMoneroPublicKeysRaw> => ({
    moneroAddress: clean.moneroAddress,
    moneroViewKeyPrivate: clean.moneroViewKeyPrivate,
    moneroViewKeyPublic: clean.moneroViewKeyPublic,
    moneroSpendKeyPublic: clean.moneroSpendKeyPublic
  })
)

export interface SafeMoneroWalletInfo {
  id: string
  type: string
  keys: MoneroPublicKeys
}

export const asSafeMoneroWalletInfo: Cleaner<SafeMoneroWalletInfo> = asCodec(
  (raw): SafeMoneroWalletInfo => {
    const obj = asObject({
      id: asString,
      type: asString,
      keys: asMoneroPublicKeys
    })(raw)
    return obj
  },
  clean => ({
    id: clean.id,
    type: clean.type,
    keys: asMoneroPublicKeys(clean.keys)
  })
)

export function translateFee(fee?: string): TransactionPriority {
  if (fee === 'low') return 1
  if (fee === 'high') return 3
  return 2 // Default to medium
}

export const asMoneroWalletOtherData = asObject({
  processedTransactionCount: asMaybe(asNumber, 0),
  mostRecentTxid: asMaybe(asString)
})
export type MoneroWalletOtherData = ReturnType<typeof asMoneroWalletOtherData>

export const asLoginResponse = asObject({
  new_address: asBoolean,
  generated_locally: asOptional(asBoolean),
  start_height: asOptional(asNumber)
})
export type LoginResponse = ReturnType<typeof asLoginResponse>

export const asAddressInfoResponse = asObject({
  blockchain_height: asNumber,
  locked_funds: asString,
  scanned_block_height: asNumber,
  scanned_height: asNumber,
  start_height: asNumber,
  total_received: asString,
  total_sent: asString,
  transaction_height: asNumber
})
export type AddressInfoResponse = ReturnType<typeof asAddressInfoResponse>

// --- yaob-compatible IO interface for bridging events across webview ---

export interface MoneroWalletEvents {
  walletEvent: WalletEventData
}

export interface MoneroIo {
  on: Subscriber<MoneroWalletEvents>
  readonly callMonero: (
    name: string,
    jsonArguments: string[]
  ) => Promise<string>
  readonly methodNames: string[]
  readonly documentDirectory: string
}
