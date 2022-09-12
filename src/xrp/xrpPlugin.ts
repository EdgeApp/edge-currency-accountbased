/**
 * Created by paul on 8/8/17.
 */

import { div } from 'biggystring'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyPlugin,
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

import { CurrencyPlugin } from '../common/plugin'
import { asyncWaterfall, getDenomInfo, safeErrorMessage } from '../common/utils'
import { XrpEngine } from './xrpEngine'
import { currencyInfo } from './xrpInfo'

export class XrpPlugin extends CurrencyPlugin {
  rippleApi: Object
  rippleApiSubscribers: { [walletId: string]: boolean }

  constructor(io: EdgeIo) {
    super(io, 'ripple', currencyInfo)
    this.rippleApi = {}
    this.rippleApiSubscribers = {}
  }

  async connectApi(walletId: string): Promise<void> {
    if (this.rippleApi.serverName == null) {
      const funcs =
        this.currencyInfo.defaultSettings.otherSettings.rippledServers.map(
          server => async () => {
            const api = new Client(server)
            api.serverName = server
            await api.connect()
            const out = { server, api }
            return out
          }
        )
      const result = await asyncWaterfall(funcs)
      if (this.rippleApi.serverName == null) {
        this.rippleApi = result.api
      }
    }
    this.rippleApiSubscribers[walletId] = true
  }

  async disconnectApi(walletId: string): Promise<void> {
    delete this.rippleApiSubscribers[walletId]
    if (Object.keys(this.rippleApiSubscribers).length === 0) {
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
    } catch (e) {
      throw new Error(`Invalid private key: ${safeErrorMessage(e)}`)
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === 'ripple' || type === 'ripple-secp256k1') {
      const algorithm =
        type === 'ripple-secp256k1' ? 'ecdsa-secp256k1' : 'ed25519'
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
    } catch (e) {
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

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks
    )
    const valid = isValidAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.dt || undefined
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
      const denom = getDenomInfo(currencyInfo, currencyCode)
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 6)
    }
    const encodedUri = this.encodeUriCommon(obj, 'ripple', amount)
    return encodedUri
  }
}

export function makeRipplePlugin(
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io } = opts

  let toolsPromise: Promise<XrpPlugin>
  async function makeCurrencyTools(): Promise<XrpPlugin> {
    if (toolsPromise != null) return await toolsPromise
    toolsPromise = Promise.resolve(new XrpPlugin(io))
    return await toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new XrpEngine(tools, walletInfo, opts)

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    if (currencyEngine.otherData.recommendedFee == null) {
      currencyEngine.otherData.recommendedFee = '0'
    }

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
