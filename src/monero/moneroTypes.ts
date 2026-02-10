import {
  asBoolean,
  asCodec,
  asMaybe,
  asObject,
  asOptional,
  asString,
  Cleaner
} from 'cleaners'

export const EDGE_MONERO_LWS_SERVER = 'https://monerolws1.edge.app'

export const asMoneroInitOptions = asObject({
  edgeApiKey: asOptional(asString, '')
})
export type MoneroInitOptions = ReturnType<typeof asMoneroInitOptions>

export interface MoneroNetworkInfo {
  networkType: number
}

export const asMoneroUserSettings = asObject({
  enableCustomServers: asMaybe(asBoolean, false),
  moneroLightwalletServer: asMaybe(asString, EDGE_MONERO_LWS_SERVER)
})
export type MoneroUserSettings = ReturnType<typeof asMoneroUserSettings>

export interface MoneroPrivateKeys {
  moneroKey: string
  moneroSpendKeyPrivate: string
  moneroSpendKeyPublic: string
}

export const asMoneroPrivateKeys = (
  pluginId: string
): Cleaner<MoneroPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Key`]: asString,
    [`${pluginId}SpendKeyPrivate`]: asString,
    [`${pluginId}SpendKeyPublic`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        moneroKey: clean[`${pluginId}Key`],
        moneroSpendKeyPrivate: clean[`${pluginId}SpendKeyPrivate`],
        moneroSpendKeyPublic: clean[`${pluginId}SpendKeyPublic`]
      }
    },
    clean => ({
      [`${pluginId}Key`]: clean.moneroKey,
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
