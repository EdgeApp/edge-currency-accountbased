import { div } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeParsedUri,
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

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { asyncWaterfall, getDenomInfo, safeErrorMessage } from '../common/utils'
import { XrpNetworkInfo } from './xrpTypes'

export class RippleTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo
  networkInfo: XrpNetworkInfo
  rippleApi: Object
  rippleApiSubscribers: { [walletId: string]: boolean }

  constructor(env: PluginEnvironment<XrpNetworkInfo>) {
    const { currencyInfo, io, networkInfo } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.networkInfo = networkInfo
    this.rippleApi = {}
    this.rippleApiSubscribers = {}
  }

  async connectApi(walletId: string): Promise<void> {
    // @ts-expect-error
    if (this.rippleApi.serverName == null) {
      const funcs = this.networkInfo.rippledServers.map(server => async () => {
        const api = new Client(server)
        // @ts-expect-error
        api.serverName = server
        await api.connect()
        const out = { server, api }
        return out
      })
      const result = await asyncWaterfall(funcs)
      // @ts-expect-error
      if (this.rippleApi.serverName == null) {
        this.rippleApi = result.api
      }
    }
    this.rippleApiSubscribers[walletId] = true
  }

  async disconnectApi(walletId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.rippleApiSubscribers[walletId]
    if (Object.keys(this.rippleApiSubscribers).length === 0) {
      // @ts-expect-error
      await this.rippleApi.disconnect()
      this.rippleApi = {}
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
        type === 'ripple-secp256k1' ? 'ecdsa-secp256k1' : 'ed25519'
      const entropy = Array.from(this.io.random(32))
      // @ts-expect-error
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

    const { parsedUri, edgeParsedUri } = parseUriCommon(
      this.currencyInfo,
      uri,
      networks
    )
    const valid = isValidAddress(edgeParsedUri.publicAddress ?? '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.dt
    return edgeParsedUri
  }

  async encodeUri(obj: EdgeEncodeUri): Promise<string> {
    const valid = isValidAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode: string = 'XRP'
      const nativeAmount: string = obj.nativeAmount
      const denom = getDenomInfo(this.currencyInfo, currencyCode)
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 6)
    }
    const encodedUri = encodeUriCommon(obj, 'ripple', amount)
    return encodedUri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<XrpNetworkInfo>
): Promise<RippleTools> {
  return new RippleTools(env)
}

export { makeCurrencyEngine } from './xrpEngine'
