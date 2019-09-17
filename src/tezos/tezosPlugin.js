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
import { eztz } from 'eztz.js'
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

  async importPrivateKey (userInput: string): Promise<Object> {
    try {
      // check for existence of numbers
      if (/\d/.test(userInput)) {
        throw new Error('Input must be mnemonic phrase')
      }
      const wordList = userInput.split(' ')
      const wordCount = wordList.length
      if (wordCount !== 24) {
        throw new Error('Mnemonic phrase must be 24 words long')
      }
      const keys = eztz.crypto.generateKeys(userInput, '')
      this.derivePublicKey({
        type: 'wallet:tezos',
        id: 'fake',
        keys
      })
      return {
        mnemonic: keys.mnemonic,
        privateKey: keys.sk
      }
    } catch (e) {
      throw new Error(e)
    }
  }

  async createPrivateKey (walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type === 'tezos') {
      // Use 256 bits entropy
      const entropy = Buffer.from(this.io.random(32)).toString('hex')
      const mnemonic = eztz.library.bip39.entropyToMnemonic(entropy)
      const privateKey = eztz.crypto.generateKeys(mnemonic, '').sk
      return { mnemonic, privateKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey (walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'tezos') {
      try {
        const keypair = eztz.crypto.generateKeys(walletInfo.keys.mnemonic, '')
        return { publicKey: keypair.pkh, publicKeyEd: keypair.pk }
      } catch (e) {
        throw new Error('Invalid key or mnemonic')
      }
    } else {
      throw new Error('InvalidWalletType')
    }
  }
  async parseUri (uri: string): Promise<EdgeParsedUri> {
    let address
    let operation
    let content
    if (this.checkAddress(uri)) {
      address = uri
    } else if (uri.slice(0, 10) === 'web+tezos:') {
      operation = decodeMainnet(uri)
      if (!operation[0] || !operation[0].content) {
        throw new Error('InvalidUriError')
      }
      content = operation[0].content
      address = content.destination
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
      content && content.amount !== '0' ? content.amount : undefined
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
    const content: UriTransaction = {
      kind: 'transaction',
      amount,
      destination: obj.publicAddress
    }
    const uri = encodeMainnet([{ content }])
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
