import { InMemorySigner } from '@taquito/signer'
import { validateAddress, ValidationResult } from '@taquito/utils'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo
} from 'edge-core-js/types'
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
    return validateAddress(address) === ValidationResult.VALID
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    if (!validateMnemonic(userInput)) {
      throw new Error('Invalid mnemonic')
    }
    InMemorySigner.fromFundraiser('', '', userInput)

    return {
      mnemonic: userInput
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type === 'tezos') {
      // Use 256 bits entropy
      const entropy = Buffer.from(this.io.random(32)).toString('hex')
      const mnemonic = entropyToMnemonic(entropy)
      return await this.importPrivateKey(mnemonic)
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'tezos') {
      const { mnemonic } = asTezosPrivateKeys(walletInfo.keys)
      // We don't use fromMnemonic because it uses bip44 which is not compatible with the original eztz.js implementation
      const signer = InMemorySigner.fromFundraiser('', '', mnemonic)

      const publicKey = await signer.publicKeyHash()
      const publicKeyEd = await signer.publicKey()
      return {
        publicKey,
        publicKeyEd
      }
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
