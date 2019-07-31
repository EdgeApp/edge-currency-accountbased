/**
 * Created by paul on 8/8/17.
 */
// @flow

import baseX from 'base-x'
import { bns } from 'biggystring'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'
import keypairs from 'edge-ripple-keypairs'
import { RippleAPI } from 'edge-ripple-lib'
import parse from 'url-parse'

import { CurrencyPlugin } from '../common/plugin.js'
import { asyncWaterfall, getDenomInfo } from '../common/utils.js'
import { XrpEngine } from './xrpEngine.js'
import { currencyInfo } from './xrpInfo.js'

// import RippledWsClientPool from 'rippled-ws-client-pool'

const base58Codec = baseX(
  '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
)

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
  rippleApi: Object
  rippleApiSubscribers: { [walletId: string]: boolean }
  // connectionPool: Object
  connectionClients: { [walletId: string]: boolean }

  constructor (io: EdgeIo) {
    super(io, 'ripple', currencyInfo)
    // this.connectionPool = new RippledWsClientPool()
    this.connectionClients = {}
    this.rippleApi = {}
    this.rippleApiSubscribers = {}
  }

  async connectApi (walletId: string): Promise<void> {
    if (!this.rippleApi.serverName) {
      const funcs = this.currencyInfo.defaultSettings.otherSettings.rippledServers.map(
        server => async () => {
          const api = new RippleAPI({ server })
          api.serverName = server
          const result = await api.connect()
          const out = { server, result, api }
          return out
        }
      )
      const result = await asyncWaterfall(funcs)
      if (!this.rippleApi.serverName) {
        this.rippleApi = result.api
      }
    }
    this.rippleApiSubscribers[walletId] = true
  }

  async disconnectApi (walletId: string): Promise<void> {
    delete this.rippleApiSubscribers[walletId]
    if (Object.keys(this.rippleApiSubscribers).length === 0) {
      await this.rippleApi.disconnect()
      this.rippleApi = {}
    }
  }

  importPrivateKey (privateKey: string): Promise<{ rippleKey: string }> {
    privateKey.replace(/ /g, '')
    if (privateKey.length !== 29 && privateKey.length !== 31) {
      throw new Error('Private key wrong length')
    }
    return Promise.resolve({ rippleKey: privateKey })
  }

  async createPrivateKey (walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === 'ripple' || type === 'ripple-secp256k1') {
      const algorithm =
        type === 'ripple-secp256k1' ? 'ecdsa-secp256k1' : 'ed25519'
      const entropy = Array.from(this.io.random(32))
      const server = this.currencyInfo.defaultSettings.otherSettings
        .rippledServers[0]
      const api = new RippleAPI({ server })
      const address = api.generateAddress({
        algorithm,
        entropy
      })

      return { rippleKey: address.secret }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey (walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'ripple' || type === 'ripple-secp256k1') {
      const keypair = keypairs.deriveKeypair(walletInfo.keys.rippleKey)
      const publicKey = keypairs.deriveAddress(keypair.publicKey)
      return { publicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri (uri: string): Promise<EdgeParsedUri> {
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

    edgeParsedUri.uniqueIdentifier = parsedUri.query.dt || undefined
    return edgeParsedUri
  }

  async encodeUri (obj: EdgeEncodeUri): Promise<string> {
    const valid = checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode: string = 'XRP'
      const nativeAmount: string = obj.nativeAmount
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

export function makeRipplePlugin (
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io } = opts

  let toolsPromise: Promise<XrpPlugin>
  function makeCurrencyTools (): Promise<XrpPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new XrpPlugin(io))
    return toolsPromise
  }

  async function makeCurrencyEngine (
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new XrpEngine(tools, walletInfo, opts)

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    if (!currencyEngine.otherData.recommendedFee) {
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
