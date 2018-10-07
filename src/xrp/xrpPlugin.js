/**
 * Created by paul on 8/8/17.
 */
// @flow
import { currencyInfo } from './xrpInfo.js'
import type {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEncodeUri,
  EdgeCurrencyPlugin,
  EdgeCurrencyPluginFactory,
  EdgeWalletInfo
} from 'edge-core-js'
import { getDenomInfo } from '../common/utils.js'
import { bns } from 'biggystring'
import baseX from 'base-x'
import keypairs from 'edge-ripple-keypairs'
import parse from 'url-parse'

import { RippleAPI } from 'edge-ripple-lib'
import { XrpEngine } from './xrpEngine.js'
import { CurrencyPlugin } from '../common/plugin.js'
// import RippledWsClientPool from 'rippled-ws-client-pool'

const base58Codec = baseX(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
)

let io

function checkAddress (address: string): boolean {
  let data: Uint8Array
  try {
    data = base58Codec.decode(address)
  } catch (e) {
    return false
  }

  return data.length === 25 && address.charAt(0) === 'r'
}

export class XrpPlugin extends CurrencyPlugin {
  rippleApis: Array<Object>
  // connectionPool: Object
  connectionClients: { [walletId: string]: boolean }

  constructor () {
    super('ripple', currencyInfo)
    this.rippleApis = []
    for (const server of currencyInfo.defaultSettings.otherSettings
      .rippledServers) {
      const api = new RippleAPI({ server })
      api.serverName = server
      this.rippleApis.push(api)
    }
    // this.connectionPool = new RippledWsClientPool()
    this.connectionClients = {}
  }

  createPrivateKey (walletType: string) {
    const type = walletType.replace('wallet:', '')

    if (type === 'ripple' || type === 'ripple-secp256k1') {
      const algorithm =
        type === 'ripple-secp256k1' ? 'ecdsa-secp256k1' : 'ed25519'
      const entropy = Array.from(io.random(32))
      const address = this.rippleApis[0].generateAddress({
        algorithm,
        entropy
      })

      return { rippleKey: address.secret }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  derivePublicKey (walletInfo: EdgeWalletInfo) {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'ripple' || type === 'ripple-secp256k1') {
      const keypair = keypairs.deriveKeypair(walletInfo.keys.rippleKey)
      const publicKey = keypairs.deriveAddress(keypair.publicKey)
      return { publicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async makeEngine (
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const currencyEngine = new XrpEngine(this, io, walletInfo, opts)

    await currencyEngine.loadEngine(this, io, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    if (!currencyEngine.otherData.recommendedFee) {
      currencyEngine.otherData.recommendedFee = '0'
    }

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  parseUri (uri: string) {
    const networks = { ripple: true }
    const RIPPLE_DOT_COM_URI_PREFIX = 'https://ripple.com//send'

    // Handle special case of https://ripple.com//send?to= URIs
    if (uri.includes(RIPPLE_DOT_COM_URI_PREFIX)) {
      const parsedUri = parse(uri, {}, true)
      const addr = parsedUri.query.to
      if (addr) {
        uri = uri.replace(RIPPLE_DOT_COM_URI_PREFIX, `ripple:${addr}`)
      }
    }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks
    )
    const valid = checkAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.tag || undefined
    return edgeParsedUri
  }

  encodeUri (obj: EdgeEncodeUri) {
    const valid = checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      let currencyCode: string = 'XRP'
      const nativeAmount: string = obj.nativeAmount
      if (typeof obj.currencyCode === 'string') {
        currencyCode = obj.currencyCode
      }
      const denom = getDenomInfo(currencyInfo, currencyCode)
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 6)
    }
    const encodedUri = this.encodeUriCommon(obj, 'ripple', amount)
    return encodedUri
  }
}

export const rippleCurrencyPluginFactory: EdgeCurrencyPluginFactory = {
  pluginType: 'currency',
  pluginName: currencyInfo.pluginName,

  async makePlugin (opts: any): Promise<EdgeCurrencyPlugin> {
    io = opts.io

    const plugin: EdgeCurrencyPlugin = new XrpPlugin()
    return plugin
  }
}
