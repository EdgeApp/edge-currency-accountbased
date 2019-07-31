/**
 * Created by paul on 8/8/17.
 */
// @flow

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
import stellarApi from 'stellar-sdk'
import { serialize } from 'uri-js'
import parse from 'url-parse'

import { CurrencyPlugin } from '../common/plugin.js'
import { getDenomInfo } from '../common/utils.js'
import { StellarEngine } from './stellarEngine.js'
import { currencyInfo } from './stellarInfo.js'

const URI_PREFIX = 'web+stellar'

export class StellarPlugin extends CurrencyPlugin {
  stellarApiServers: Array<Object>
  constructor (io: EdgeIo) {
    super(io, 'stellar', currencyInfo)
    stellarApi.Network.usePublicNetwork()
    this.stellarApiServers = []
    for (const server of currencyInfo.defaultSettings.otherSettings
      .stellarServers) {
      const stellarServer = new stellarApi.Server(server)
      stellarServer.serverName = server
      this.stellarApiServers.push(stellarServer)
    }
  }

  checkAddress (address: string): boolean {
    // TODO: check address
    try {
      stellarApi.Keypair.fromPublicKey(address)
      return true
    } catch (e) {
      return false
    }
  }

  async createPrivateKey (walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === 'stellar') {
      const entropy = Array.from(this.io.random(32))
      const keypair = stellarApi.Keypair.fromRawEd25519Seed(entropy)
      return { stellarKey: keypair.secret() }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  importPrivateKey (privateKey: string): Promise<{ stellarKey: string }> {
    privateKey.replace(/ /g, '')
    stellarApi.Keypair.fromSecret(privateKey)
    if (privateKey.length !== 56) throw new Error('Private key wrong length')
    return Promise.resolve({ stellarKey: privateKey })
  }

  async derivePublicKey (walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'stellar') {
      const keypair = stellarApi.Keypair.fromSecret(walletInfo.keys.stellarKey)
      return { publicKey: keypair.publicKey() }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri (uri: string): Promise<EdgeParsedUri> {
    const networks = {}
    networks[URI_PREFIX] = true
    const STELLAR_SEP007_PREFIX = `${URI_PREFIX}:pay`

    if (uri.includes(STELLAR_SEP007_PREFIX)) {
      const parsedUri = parse(uri, {}, true)
      const addr = parsedUri.query.destination
      if (addr) {
        uri = uri.replace(STELLAR_SEP007_PREFIX, `${URI_PREFIX}:${addr}`)
      }
    }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks
    )

    const valid = this.checkAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    if (parsedUri.query.msg) {
      edgeParsedUri.metadata = {
        notes: parsedUri.query.msg
      }
    }
    if (parsedUri.query.asset_code) {
      if (parsedUri.query.asset_code.toUpperCase() !== 'XLM') {
        throw new Error('ErrorInvalidCurrencyCode')
      }
    }
    if (parsedUri.query.memo_type) {
      if (parsedUri.query.memo_type !== 'MEMO_ID') {
        throw new Error('ErrorInvalidMemoType')
      }
    }
    if (parsedUri.query.memo) {
      const m = bns.add(parsedUri.query.memo, '0')
      // Check if the memo is an integer
      if (m !== parsedUri.query.memo) {
        throw new Error('ErrorInvalidMemoId')
      }
      edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    }
    return edgeParsedUri
  }

  async encodeUri (obj: EdgeEncodeUri): Promise<string> {
    const valid = this.checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode: string = 'XLM'
      const nativeAmount: string = obj.nativeAmount
      const denom = getDenomInfo(currencyInfo, currencyCode)
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 7)
    }
    if (!amount && !obj.label && !obj.message) {
      return obj.publicAddress
    } else {
      let queryString: string = `destination=${obj.publicAddress}&`
      if (amount) {
        queryString += 'amount=' + amount + '&'
      }
      if (obj.label || obj.message) {
        if (typeof obj.label === 'string') {
          queryString += 'label=' + obj.label + '&'
        }
        if (typeof obj.message === 'string') {
          queryString += 'msg=' + obj.message + '&'
        }
      }
      queryString = queryString.substr(0, queryString.length - 1)

      const serializeObj = {
        scheme: URI_PREFIX,
        path: 'pay',
        query: queryString
      }
      const url = serialize(serializeObj)
      return url
    }
  }
}

export function makeStellarPlugin (
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io } = opts

  let toolsPromise: Promise<StellarPlugin>
  function makeCurrencyTools (): Promise<StellarPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new StellarPlugin(io))
    return toolsPromise
  }

  async function makeCurrencyEngine (
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new StellarEngine(tools, walletInfo, opts)

    currencyEngine.stellarApi = stellarApi

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData
    if (!currencyEngine.otherData.accountSequence) {
      currencyEngine.otherData.accountSequence = 0
    }
    if (!currencyEngine.otherData.lastPagingToken) {
      currencyEngine.otherData.lastPagingToken = '0'
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
