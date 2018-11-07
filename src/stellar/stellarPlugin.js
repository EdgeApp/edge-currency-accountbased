/**
 * Created by paul on 8/8/17.
 */
// @flow
import { currencyInfo } from './stellarInfo.js'
import { CurrencyPlugin } from '../common/plugin.js'
import type {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEncodeUri,
  EdgeCurrencyPlugin,
  EdgeCurrencyPluginFactory,
  EdgeWalletInfo
} from 'edge-core-js'
import { bns } from 'biggystring'
import { serialize } from 'uri-js'
import { getDenomInfo } from '../common/utils.js'
import parse from 'url-parse'

import stellarApi from 'stellar-sdk'
import { StellarEngine } from './stellarEngine.js'

const URI_PREFIX = 'web+stellar'

let io

export class StellarPlugin extends CurrencyPlugin {
  stellarApiServers: Array<Object>
  constructor () {
    super('stellar', currencyInfo)
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

  createPrivateKey (walletType: string) {
    const type = walletType.replace('wallet:', '')

    if (type === 'stellar') {
      const entropy = Array.from(io.random(32))
      const keypair = stellarApi.Keypair.fromRawEd25519Seed(entropy)
      return { stellarKey: keypair.secret() }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  derivePublicKey (walletInfo: EdgeWalletInfo) {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'stellar') {
      const keypair = stellarApi.Keypair.fromSecret(walletInfo.keys.stellarKey)
      return { publicKey: keypair.publicKey() }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async makeEngine (
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const currencyEngine = new StellarEngine(this, io, walletInfo, opts)

    currencyEngine.stellarApi = stellarApi

    await currencyEngine.loadEngine(this, io, walletInfo, opts)

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

  parseUri (uri: string) {
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

  encodeUri (obj: EdgeEncodeUri) {
    const valid = this.checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      let currencyCode: string = 'XLM'
      const nativeAmount: string = obj.nativeAmount
      if (typeof obj.currencyCode === 'string') {
        currencyCode = obj.currencyCode
      }
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

export const stellarCurrencyPluginFactory: EdgeCurrencyPluginFactory = {
  pluginType: 'currency',
  pluginName: currencyInfo.pluginName,

  async makePlugin (opts: any): Promise<EdgeCurrencyPlugin> {
    io = opts.io

    const plugin: EdgeCurrencyPlugin = new StellarPlugin()
    return plugin
  }
}
