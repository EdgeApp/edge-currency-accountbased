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
import stellarApi, { Keypair, Server, StrKey } from 'stellar-sdk'
import { serialize } from 'uri-js'
import parse from 'url-parse'

import { CurrencyPlugin } from '../common/plugin'
import { getDenomInfo } from '../common/utils'
import { StellarEngine } from './stellarEngine'
import { currencyInfo } from './stellarInfo'

const URI_PREFIX = 'web+stellar'

export class StellarPlugin extends CurrencyPlugin {
  stellarApiServers: Server[]

  constructor(io: EdgeIo) {
    super(io, 'stellar', currencyInfo)
    stellarApi.Network.usePublicNetwork()
    this.stellarApiServers = []
    for (const server of currencyInfo.defaultSettings.otherSettings
      .stellarServers) {
      const stellarServer = new Server(server)
      this.stellarApiServers.push(stellarServer)
    }
  }

  checkAddress(address: string): boolean {
    return (
      StrKey.isValidEd25519PublicKey(address) || // regular address
      StrKey.isValidMed25519PublicKey(address) // muxed address
    )
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === 'stellar') {
      const entropy = Buffer.from(this.io.random(32))
      const keypair = Keypair.fromRawEd25519Seed(entropy)
      return { stellarKey: keypair.secret() }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async importPrivateKey(privateKey: string): Promise<{ stellarKey: string }> {
    privateKey.replace(/ /g, '')
    Keypair.fromSecret(privateKey)
    if (privateKey.length !== 56) throw new Error('Private key wrong length')
    return await Promise.resolve({ stellarKey: privateKey })
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'stellar') {
      const keypair = Keypair.fromSecret(walletInfo.keys.stellarKey)
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
      if (addr != null) {
        uri = uri.replace(STELLAR_SEP007_PREFIX, `${URI_PREFIX}:${addr}`)
      }
    }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks
    )

    const valid = this.checkAddress(edgeParsedUri.publicAddress ?? '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    if (parsedUri.query.msg != null) {
      edgeParsedUri.metadata = {
        notes: parsedUri.query.msg
      }
    }
    if (parsedUri.query.asset_code != null) {
      if (parsedUri.query.asset_code.toUpperCase() !== 'XLM') {
        throw new Error('ErrorInvalidCurrencyCode')
      }
    }
    if (parsedUri.query.memo_type != null) {
      if (parsedUri.query.memo_type !== 'MEMO_ID') {
        throw new Error('ErrorInvalidMemoType')
      }
    }
    if (parsedUri.query.memo != null) {
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
    if (amount == null && obj.label == null && obj.message == null) {
      return obj.publicAddress
    } else {
      let queryString: string = `destination=${obj.publicAddress}&`
      if (amount != null) {
        queryString += 'amount=' + amount + '&'
      }
      if (obj.label != null || obj.message != null) {
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

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow checked
    // @ts-expect-error
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData
    if (currencyEngine.otherData.accountSequence == null) {
      currencyEngine.otherData.accountSequence = 0
    }
    if (currencyEngine.otherData.lastPagingToken == null) {
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
