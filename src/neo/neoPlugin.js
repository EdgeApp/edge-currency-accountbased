// @flow
import { rpc, u, wallet } from '@cityofzion/neon-js'
import { bns } from 'biggystring'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeMetaToken,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyPlugin } from '../common/plugin'
import { getDenomInfo } from '../common/utils.js'
import { NeoEngine } from './neoEngine.js'
import { currencyInfo } from './neoInfo'

const { RPCClient } = rpc
const { Account } = wallet

export function checkAddress(address: string): boolean {
  return address.length === 34
}

export class NeoPlugin extends CurrencyPlugin {
  rpcClient: RPCClient
  constructor(io: EdgeIo) {
    super(io, 'neo', currencyInfo)
    this.rpcClient = new RPCClient(
      this.currencyInfo.defaultSettings.neoRpcNodes[0]
    )
  }

  validPrivateKey(privateKey: string) {
    return privateKey.length === 64
  }

  async importPrivateKey(privateKey: string): Promise<{ neoKey: string }> {
    if (this.validPrivateKey(privateKey))
      throw new Error('Neo Private key wrong length')
    return { neoKey: privateKey }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type === 'neo') {
      const privateKey = u.ab2hexstring(this.io.random(32))
      return { neoKey: privateKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  /**
   * This function actually returns neo address as publickey, to keep to edge style.
   * @param {EdgeWalletInfo} walletInfo
   */
  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'neo') {
      const publicKey = new Account(walletInfo.keys.neoKey).address
      return { publicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: Array<EdgeMetaToken>
  ): Promise<EdgeParsedUri> {
    const { edgeParsedUri, parsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      {
        neo: true
      },
      currencyCode || 'NEO',
      customTokens
    )

    const valid = checkAddress(edgeParsedUri.publicAddress || '')
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

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: Array<EdgeMetaToken>
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj
    const valid = checkAddress(publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        currencyInfo,
        currencyCode || 'NEO',
        customTokens
      )
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 1)
    }
    const encodedUri = this.encodeUriCommon(obj, 'neo', amount)
    return encodedUri
  }
}

export function makeNeoPlugin(opts: EdgeCorePluginOptions): EdgeCurrencyPlugin {
  const { io } = opts

  let toolsPromise: Promise<NeoPlugin>
  function makeCurrencyTools(): Promise<NeoPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new NeoPlugin(io))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new NeoEngine(tools, walletInfo, opts)

    // Do any async initialization necessary for the engine
    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    const out: EdgeCurrencyEngine = currencyEngine

    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
