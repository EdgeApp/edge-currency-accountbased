import {
  asArray,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asValue,
  Cleaner
} from 'cleaners'

import { asWalletInfo } from '../common/types'

type PiratechainNetworkName = 'mainnet' | 'testnet'

export interface PiratechainNetworkInfo {
  /** Unused by the unified SDK (endpoints live in the native core); kept for
   * info-server payload compatibility. */
  rpcNode: {
    networkName: PiratechainNetworkName
    defaultHost: string
    defaultPort: number
  }
  /**
   * The full lightwalletd URL the SDK scans against, scheme included. This is
   * deliberately NOT derived from `rpcNode`: that shape shipped with
   * `defaultPort: 443` long before the SDK needed a port at all, so an
   * info-server payload carrying the historical value would silently point
   * sync at a port the SDK cannot speak. Scheme, host and port travel
   * together here so a payload can only ever set a coherent endpoint.
   */
  lightwalletdUrl: string
  /**
   * Alternate lightwalletd URLs the SDK may fail over to, in preference
   * order. Empty keeps the wallet on `lightwalletdUrl` alone and skips the
   * multi-server pool entirely. The SDK validates a pool before accepting it
   * and rejects two shapes outright: a host it does not recognize as a Pirate
   * network, and an alternate whose transport differs from the primary's, so
   * a TLS primary cannot list a plaintext alternate. A rejected pool costs
   * the wallet nothing, since the plugin falls back to the single endpoint.
   * The info server can replace this list without an app release.
   */
  lightwalletdFailoverUrls: string[]
  defaultNetworkFee: string
}

export const asPiratechainWalletOtherData = asObject({
  cachedAddress: asMaybe(asString)
})

export type PiratechainWalletOtherData = ReturnType<
  typeof asPiratechainWalletOtherData
>

export const asArrrPublicKey = asObject({
  birthdayHeight: asOptional(asNumber),
  publicKey: asOptional(asString, '') // In case sdk is not present for platform
})

export type SafePiratechainWalletInfo = ReturnType<
  typeof asSafePiratechainWalletInfo
>
export const asSafePiratechainWalletInfo = asWalletInfo(asArrrPublicKey)

export interface PiratechainPrivateKeys {
  mnemonic: string
  birthdayHeight: number
}
export const asPiratechainPrivateKeys = (
  pluginId: string
): Cleaner<PiratechainPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString,
    [`${pluginId}BirthdayHeight`]: asNumber
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        mnemonic: clean[`${pluginId}Mnemonic`] as string,
        birthdayHeight: clean[`${pluginId}BirthdayHeight`] as number
      }
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        [`${pluginId}BirthdayHeight`]: clean.birthdayHeight
      }
    }
  )
}

//
// Info Payload
//

export const asPiratechainInfoPayload = asObject({
  lightwalletdUrl: asOptional(asString),
  lightwalletdFailoverUrls: asOptional(asArray(asString)),
  rpcNode: asOptional(
    asObject({
      networkName: asValue('mainnet', 'testnet'),
      defaultHost: asString,
      defaultPort: asNumber
    })
  )
})
export type PiratechainInfoPayload = ReturnType<typeof asPiratechainInfoPayload>
