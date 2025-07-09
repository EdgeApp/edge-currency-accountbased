import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  asKaspaPrivateKeys,
  asSafeKaspaWalletInfo,
  KaspaInfoPayload,
  KaspaNetworkInfo
} from './kaspaTypes'

// Kaspa address validation regex
const KASPA_ADDRESS_REGEX = /^kaspa:[a-z0-9]{61,63}$/

export class KaspaTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo

  constructor(env: PluginEnvironment<KaspaNetworkInfo>) {
    const { builtinTokens, currencyInfo, io } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asKaspaPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.privateKey
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeKaspaWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo

    // Validate private key format (64 hex chars)
    if (!/^[0-9a-fA-F]{64}$/.test(input)) {
      throw new Error('Invalid private key format')
    }

    // TODO: Derive public key from private key using kaspa cryptography
    // For now, we'll need to implement this with the actual Kaspa library
    const publicKey = 'placeholder_public_key'

    return {
      [`${pluginId}Key`]: input,
      [`${pluginId}PublicKey`]: publicKey
    }
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    // Generate random 32 bytes for private key
    const privateKeyBytes = this.io.random(32)
    const privateKey = base16.stringify(privateKeyBytes).toLowerCase()

    // TODO: Derive public key from private key
    const publicKey = 'placeholder_public_key'

    return {
      [`${this.currencyInfo.pluginId}Key`]: privateKey,
      [`${this.currencyInfo.pluginId}PublicKey`]: publicKey
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo

    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const keys = asKaspaPrivateKeys(pluginId)(walletInfo.keys)

    // TODO: Derive public key and address from private key
    // This needs proper Kaspa cryptography implementation

    return {
      publicKey: keys.publicKey
    }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true }

    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      builtinTokens: this.builtinTokens,
      currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    })

    let address = ''
    if (edgeParsedUri.publicAddress != null) {
      address = edgeParsedUri.publicAddress
    }

    // Validate Kaspa address format
    if (!KASPA_ADDRESS_REGEX.test(address)) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!KASPA_ADDRESS_REGEX.test(publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }

    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getLegacyDenomination(
        currencyCode ?? this.currencyInfo.currencyCode,
        this.currencyInfo,
        customTokens,
        this.builtinTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = (parseInt(nativeAmount) / parseInt(denom.multiplier)).toString()
    }

    const encodedUri = encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    // Kaspa doesn't currently support tokens
    throw new Error('Kaspa does not support tokens')
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<KaspaNetworkInfo>
): Promise<KaspaTools> {
  return new KaspaTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<KaspaNetworkInfo>,
  infoPayload: KaspaInfoPayload
): Promise<void> {
  // Update network info from info payload
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './KaspaEngine'
