/**
 * Created by paul on 8/8/17.
 */

import { add, div } from 'biggystring'
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
// @ts-expect-error
import stellarApi from 'stellar-sdk'
import { serialize } from 'uri-js'
import parse from 'url-parse'

import { CurrencyPlugin } from '../common/plugin'
import { getDenomInfo } from '../common/utils'
import { StellarEngine } from './stellarEngine'
import { currencyInfo } from './stellarInfo'

const URI_PREFIX = 'web+stellar'

export class StellarPlugin extends CurrencyPlugin {
  stellarApiServers: Object[]
  constructor(io: EdgeIo) {
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

  checkAddress(address: string): boolean {
    // TODO: check address
    try {
      stellarApi.Keypair.fromPublicKey(address)
      return true
    } catch (e: any) {
      return false
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === 'stellar') {
      const entropy = Array.from(this.io.random(32))
      const keypair = stellarApi.Keypair.fromRawEd25519Seed(entropy)
      return { stellarKey: keypair.secret() }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async importPrivateKey(privateKey: string): Promise<{ stellarKey: string }> {
    privateKey.replace(/ /g, '')
    stellarApi.Keypair.fromSecret(privateKey)
    if (privateKey.length !== 56) throw new Error('Private key wrong length')
    return await Promise.resolve({ stellarKey: privateKey })
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'stellar') {
      const keypair = stellarApi.Keypair.fromSecret(walletInfo.keys.stellarKey)
      return { publicKey: keypair.publicKey() }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const networks = {}
    // @ts-expect-error
    networks[URI_PREFIX] = true
    const STELLAR_SEP007_PREFIX = `${URI_PREFIX}:pay`

    if (uri.includes(STELLAR_SEP007_PREFIX)) {
      const parsedUri = parse(uri, {}, true)
      const addr = parsedUri.query.destination
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (addr) {
        uri = uri.replace(STELLAR_SEP007_PREFIX, `${URI_PREFIX}:${addr}`)
      }
    }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks
    )

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
    const valid = this.checkAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (parsedUri.query.msg) {
      edgeParsedUri.metadata = {
        notes: parsedUri.query.msg
      }
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (parsedUri.query.asset_code) {
      if (parsedUri.query.asset_code.toUpperCase() !== 'XLM') {
        throw new Error('ErrorInvalidCurrencyCode')
      }
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (parsedUri.query.memo_type) {
      if (parsedUri.query.memo_type !== 'MEMO_ID') {
        throw new Error('ErrorInvalidMemoType')
      }
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (parsedUri.query.memo) {
      const m = add(parsedUri.query.memo, '0')
      // Check if the memo is an integer
      if (m !== parsedUri.query.memo) {
        throw new Error('ErrorInvalidMemoId')
      }
      edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    }
    return edgeParsedUri
  }

  async encodeUri(obj: EdgeEncodeUri): Promise<string> {
    const valid = this.checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode: string = 'XLM'
      const nativeAmount: string = obj.nativeAmount
      const denom = getDenomInfo(currencyInfo, currencyCode)
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 7)
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!amount && !obj.label && !obj.message) {
      return obj.publicAddress
    } else {
      let queryString: string = `destination=${obj.publicAddress}&`
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (amount) {
        queryString += 'amount=' + amount + '&'
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
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

export function makeStellarPlugin(
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io } = opts

  let toolsPromise: Promise<StellarPlugin>
  async function makeCurrencyTools(): Promise<StellarPlugin> {
    if (toolsPromise != null) return await toolsPromise
    toolsPromise = Promise.resolve(new StellarPlugin(io))
    return await toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new StellarEngine(tools, walletInfo, opts)

    currencyEngine.stellarApi = stellarApi

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow checked
    // @ts-expect-error
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!currencyEngine.otherData.accountSequence) {
      currencyEngine.otherData.accountSequence = 0
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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
