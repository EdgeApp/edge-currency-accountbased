// @flow
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
import { eztz } from 'eztz'
import { decodeMainnet, encodeMainnet } from 'tezos-uri'

import { CurrencyPlugin } from '../common/plugin.js'
import { TezosEngine } from './tezosEngine.js'
import { currencyInfo } from './tezosInfo.js'
import { type UriTransaction } from './tezosTypes.js'

export class TezosPlugin extends CurrencyPlugin {
  tezosRpcNodes: Array<Object>
  tezosApiServers: Array<Object>
  constructor (io: EdgeIo) {
    super(io, 'tezos', currencyInfo)
    this.tezosRpcNodes = []
    for (const rpcNode of currencyInfo.defaultSettings.otherSettings
      .tezosRpcNodes) {
      this.tezosRpcNodes.push(rpcNode)
    }
    this.tezosApiServers = []
    for (const apiServer of currencyInfo.defaultSettings.otherSettings
      .tezosApiServers) {
      this.tezosApiServers.push(apiServer)
    }
  }

  checkAddress (address: string): boolean {
    try {
      const valid = eztz.crypto.checkAddress(address)
      return valid
    } catch (e) {
      return false
    }
  }

  async createPrivateKey (walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type === 'tezos') {
      // Use 256 bits entropy
      const entropy = Buffer.from(this.io.random(32)).toString('hex')
      const mnemonic = eztz.library.bip39.entropyToMnemonic(entropy)
      return { mnemonic }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey (walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'tezos') {
      const keypair = eztz.crypto.generateKeys(walletInfo.keys.mnemonic, '')
      return { publicKey: keypair.pkh, publicKeyEd: keypair.pk }
    } else {
      throw new Error('InvalidWalletType')
    }
  }
  async parseUri (uri: string): Promise<EdgeParsedUri> {
    let address
    let operation
    if (this.checkAddress(uri)) {
      address = uri
    } else if (uri.slice(0, 10) === 'web+tezos:') {
      operation = decodeMainnet(uri)
      address = operation.destination
      if (!this.checkAddress(address)) {
        throw new Error('InvalidPublicAddressError')
      }
    } else {
      throw new Error('InvalidUriError')
    }
    const edgeParsedUri: EdgeParsedUri = {
      publicAddress: address
    }
    edgeParsedUri.nativeAmount =
      operation && operation.amount !== '0' ? operation.amount : undefined
    edgeParsedUri.currencyCode = 'XTZ'
    return edgeParsedUri
  }

  async encodeUri (obj: EdgeEncodeUri): Promise<string> {
    const valid = this.checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    if (obj.currencyCode !== 'XTZ') {
      throw new Error('InvalidCurrencyCodeError')
    }
    const amount = typeof obj.nativeAmount === 'string' ? obj.nativeAmount : '0'
    const operation: UriTransaction = {
      kind: 'transaction',
      amount,
      destination: obj.publicAddress
    }
    const uri = encodeMainnet([{ content: operation }])
    return uri
  }
}
export function makeTezosPlugin (
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io } = opts

  let toolsPromise: Promise<TezosPlugin>
  function makeCurrencyTools (): Promise<TezosPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new TezosPlugin(io))
    return toolsPromise
  }
  async function makeCurrencyEngine (
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new TezosEngine(tools, walletInfo, opts)

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData
    if (!currencyEngine.otherData.numberTransactions) {
      currencyEngine.otherData.numberTransaction = 0
    }
    const out: TezosEngine = currencyEngine
    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
