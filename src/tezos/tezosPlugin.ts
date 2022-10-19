import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyPlugin,
  EdgeEncodeUri,
  EdgeFetchFunction,
  EdgeIo,
  EdgeParsedUri,
  EdgeWalletInfo
} from 'edge-core-js/types'
// @ts-expect-error
import { eztz } from 'eztz.js'
import { decodeMainnet, encodeMainnet } from 'tezos-uri'

import { CurrencyPlugin } from '../common/plugin'
import { getFetchCors } from './../common/utils'
import { TezosEngine } from './tezosEngine'
import { currencyInfo } from './tezosInfo'
import { UriTransaction } from './tezosTypes'

export class TezosPlugin extends CurrencyPlugin {
  tezosRpcNodes: Object[]
  tezosApiServers: Object[]
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(io: EdgeIo, fetchCors: EdgeFetchFunction) {
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

  checkAddress(address: string): boolean {
    try {
      const valid = eztz.crypto.checkAddress(address)
      return valid
    } catch (e: any) {
      return false
    }
  }

  async importPrivateKey(userInput: string): Promise<Object> {
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
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.derivePublicKey({
      type: 'wallet:tezos',
      id: 'fake',
      keys
    })
    return {
      mnemonic: keys.mnemonic,
      privateKey: keys.sk
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
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

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'tezos') {
      const keypair = eztz.crypto.generateKeys(walletInfo.keys.mnemonic, '')
      return { publicKey: keypair.pkh, publicKeyEd: keypair.pk }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    let address
    let operation
    let content
    if (this.checkAddress(uri)) {
      address = uri
    } else if (uri.slice(0, 10) === 'web+tezos:') {
      operation = decodeMainnet(uri)
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!operation[0] || !operation[0].content) {
        throw new Error('InvalidUriError')
      }
      content = operation[0].content
      // @ts-expect-error
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
      // @ts-expect-error
      content != null && content.amount !== '0' ? content.amount : undefined
    edgeParsedUri.currencyCode = 'XTZ'
    return edgeParsedUri
  }

  async encodeUri(obj: EdgeEncodeUri): Promise<string> {
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
export function makeTezosPlugin(
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io } = opts
  const fetchCors = getFetchCors(opts)

  let toolsPromise: Promise<TezosPlugin>
  async function makeCurrencyTools(): Promise<TezosPlugin> {
    if (toolsPromise != null) return await toolsPromise
    toolsPromise = Promise.resolve(new TezosPlugin(io, fetchCors))
    return await toolsPromise
  }
  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new TezosEngine(tools, walletInfo, opts, fetchCors)

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!currencyEngine.otherData.numberTransactions) {
      // @ts-expect-error
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