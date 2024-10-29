import { div } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo
} from 'edge-core-js/types'
import parse from 'url-parse'
import {
  Client,
  decodeSeed,
  isValidAddress,
  Wallet,
  xAddressToClassicAddress
} from 'xrpl'
import ECDSA from 'xrpl/dist/npm/ECDSA'

import { PluginEnvironment } from '../common/innerPlugin'
import { asyncWaterfall } from '../common/promiseUtils'
import { makeMetaTokens, validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import {
  getLegacyDenomination,
  mergeDeeply,
  safeErrorMessage
} from '../common/utils'
import {
  asRipplePrivateKeys,
  asSafeRippleWalletInfo,
  asXrpNetworkLocation,
  XrpInfoPayload,
  XrpNetworkInfo
} from './rippleTypes'
import { makeTokenId } from './rippleUtils'

export class RippleTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo
  networkInfo: XrpNetworkInfo

  rippleApi!: Client
  rippleApiSubscribers: { [walletId: string]: boolean }

  constructor(env: PluginEnvironment<XrpNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo

    this.rippleApiSubscribers = {}
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const keys = asRipplePrivateKeys(privateWalletInfo.keys)
    return keys.rippleKey
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeRippleWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async connectApi(walletId: string): Promise<void> {
    if (Object.keys(this.rippleApiSubscribers).length === 0) {
      const funcs = this.networkInfo.rippledServers.map(server => async () => {
        const api = new Client(server)
        await api.connect()
        return api
      })
      const result: Client = await asyncWaterfall(funcs)
      this.rippleApi = result
    }
    this.rippleApiSubscribers[walletId] = true
  }

  async disconnectApi(walletId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.rippleApiSubscribers[walletId]
    if (Object.keys(this.rippleApiSubscribers).length === 0) {
      await this.rippleApi.disconnect()
      // this.rippleApi = undefined
    }
  }

  async importPrivateKey(privateKey: string): Promise<{ rippleKey: string }> {
    privateKey = privateKey.replace(/\s/g, '')
    try {
      // Try decoding seed
      decodeSeed(privateKey)

      // If that worked, return the key:
      return { rippleKey: privateKey }
    } catch (e: any) {
      throw new Error(`Invalid private key: ${safeErrorMessage(e)}`)
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === 'ripple' || type === 'ripple-secp256k1') {
      const algorithm =
        type === 'ripple-secp256k1' ? ECDSA.secp256k1 : ECDSA.ed25519
      const entropy = Array.from(this.io.random(32))
      const keys = Wallet.fromEntropy(entropy, { algorithm })
      return { rippleKey: keys.seed }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'ripple' || type === 'ripple-secp256k1') {
      const wallet = Wallet.fromSeed(walletInfo.keys.rippleKey)
      return { publicKey: wallet.classicAddress }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const networks = {
      ripple: true,
      'xrp-ledger': true
    }
    const RIPPLE_DOT_COM_URI_PREFIX = 'https://ripple.com//send'

    try {
      const { classicAddress, tag } = xAddressToClassicAddress(uri)
      uri = `ripple:${classicAddress}?to=${classicAddress}${
        tag !== false ? `&dt=${tag}` : ''
      }`
    } catch (e: any) {
      //
    }

    // Handle special case of https://ripple.com//send?to= URIs
    if (uri.includes(RIPPLE_DOT_COM_URI_PREFIX)) {
      const parsedUri = parse(uri, {}, true)
      const addr = parsedUri.query.to
      if (addr != null) {
        uri = uri.replace(RIPPLE_DOT_COM_URI_PREFIX, `ripple:${addr}`)
      }
    }

    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      builtinTokens: this.builtinTokens
    })
    const valid = isValidAddress(edgeParsedUri.publicAddress ?? '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.dt
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const valid = isValidAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode: string = 'XRP'
      const nativeAmount: string = obj.nativeAmount
      const denom = getLegacyDenomination(
        currencyCode,
        this.currencyInfo,
        [...customTokens, ...makeMetaTokens(this.builtinTokens)],
        this.builtinTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 6)
    }
    const encodedUri = encodeUriCommon(obj, 'ripple', amount)
    return encodedUri
  }

  // Token ID format is currencyCode-issuerAddress
  // issuer addresses can issue more than one token so we need
  // the currency code to make the token id unique
  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const location = token?.networkLocation
    if (location == null) {
      throw new Error('ErrorInvalidNetworkLocation')
    }
    const asset = asXrpNetworkLocation(location)
    return makeTokenId(asset)
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<XrpNetworkInfo>
): Promise<RippleTools> {
  return new RippleTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<XrpNetworkInfo>,
  infoPayload: XrpInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './RippleEngine'
