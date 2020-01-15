// @flow
import { rpc, wallet } from '@cityofzion/neon-js'
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

import { CurrencyPlugin } from '../common/plugin'
import { getDenomInfo } from '../common/utils.js'
import { NeoEngine } from './neoEngine.js'
import { currencyInfo } from './neoInfo'

const { RPCClient } = rpc
const { Account } = wallet

function checkAddress(address: string): boolean {
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

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type === 'neo') {
      const account = new Account()
      return account
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'neo') {
      const publicKey = wallet.getPublicKeyFromPrivateKey(
        walletInfo.keys.neoKey
      )
      return { publicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const { edgeParsedUri } = this.parseUriCommon(currencyInfo, uri, {
      neo: true
    })

    const valid = checkAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    return edgeParsedUri
  }

  async encodeUri(obj: EdgeEncodeUri): Promise<string> {
    const valid = checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode: string = 'NEO'
      const nativeAmount: string = obj.nativeAmount
      const denom = getDenomInfo(currencyInfo, currencyCode)
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 4)
    }
    const encodedUri = this.encodeUriCommon(obj, 'neo', amount)
    return encodedUri
  }
}

export function makeNeoPlugin(opts: EdgeCorePluginOptions): EdgeCurrencyPlugin {
  const { io, initOptions } = opts

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
    const currencyEngine = new NeoEngine(tools, walletInfo, initOptions, opts)

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
