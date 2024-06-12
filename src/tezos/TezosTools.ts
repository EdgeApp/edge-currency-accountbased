import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo
} from 'edge-core-js/types'
import { eztz } from 'eztz.js'
import { decodeMainnet, encodeMainnet } from 'tezos-uri'

import { PluginEnvironment } from '../common/innerPlugin'
import { parseUriCommon } from '../common/uriHelpers'
import { mergeDeeply } from '../common/utils'
import {
  asSafeTezosWalletInfo,
  asTezosPrivateKeys,
  TezosInfoPayload,
  TezosNetworkInfo,
  UriTransaction
} from './tezosTypes'

export class TezosTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo
  networkInfo: TezosNetworkInfo

  tezosRpcNodes: string[]
  tezosApiServers: string[]

  constructor(env: PluginEnvironment<TezosNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo

    this.tezosRpcNodes = [...this.networkInfo.tezosRpcNodes]
    this.tezosApiServers = [...this.networkInfo.tezosApiServers]
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const keys = asTezosPrivateKeys(privateWalletInfo.keys)
    return keys.mnemonic
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeTezosWalletInfo(publicWalletInfo)
    return keys.publicKey
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
    const { currencyCode, pluginId } = this.currencyInfo
    const networks = { [pluginId]: true, 'web+tezos': true }

    const { edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      builtinTokens: this.builtinTokens,
      currencyCode
    })

    let address
    let operation
    let content
    if (this.checkAddress(uri)) {
      address = uri
    } else if (uri.slice(0, 10) === 'web+tezos:') {
      operation = decodeMainnet(uri)
      if (operation[0]?.content == null) {
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
    edgeParsedUri.publicAddress = address
    edgeParsedUri.nativeAmount =
      // @ts-expect-error
      content != null && content.amount !== '0' ? content.amount : undefined
    edgeParsedUri.currencyCode = currencyCode
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

export async function makeCurrencyTools(
  env: PluginEnvironment<TezosNetworkInfo>
): Promise<TezosTools> {
  return new TezosTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<TezosNetworkInfo>,
  infoPayload: TezosInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './TezosEngine'
