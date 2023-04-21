import algosdk from 'algosdk'
import { div } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { validateToken } from '../common/tokenHelpers'
import { WalletConnectors } from '../common/types'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getDenomInfo } from '../common/utils'
import {
  AlgorandNetworkInfo,
  asAlgorandPrivateKeys,
  asMaybeContractAddressLocation
} from './algorandTypes'

const { isValidAddress, mnemonicFromSeed } = algosdk

export class AlgorandTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo

  walletConnectors: WalletConnectors

  constructor(env: PluginEnvironment<AlgorandNetworkInfo>) {
    const { builtinTokens, currencyInfo, io } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens

    this.walletConnectors = {}
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo

    algosdk.mnemonicToSecretKey(input) // Validate input

    return {
      [`${pluginId}Mnemonic`]: input
    }
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const entropy = Buffer.from(this.io.random(32))
    const mnemonic = mnemonicFromSeed(entropy)
    return await this.importPrivateKey(mnemonic)
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo

    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }
    const keys = asAlgorandPrivateKeys(pluginId)(walletInfo.keys)

    const account = algosdk.mnemonicToSecretKey(keys.mnemonic)
    return { publicKey: account.addr }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true, wc: true }

    const { parsedUri, edgeParsedUri } = parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    )

    if (parsedUri.protocol === 'wc') {
      if (parsedUri.query.bridge != null && parsedUri.query.key != null) {
        edgeParsedUri.walletConnect = {
          uri,
          topic: parsedUri.pathname.split('@')[0],
          version: parsedUri.pathname.split('@')[1],
          bridge: parsedUri.query.bridge,
          key: parsedUri.query.key
        }
        return edgeParsedUri
      } else throw new Error('MissingWcBridgeKey')
    }

    let address = ''

    if (edgeParsedUri.publicAddress != null) {
      address = edgeParsedUri.publicAddress
    }

    if (!isValidAddress(address)) throw new Error('InvalidPublicAddressError')

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!isValidAddress(publicAddress))
      throw new Error('InvalidPublicAddressError')

    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        this.currencyInfo,

        currencyCode ?? this.currencyInfo.currencyCode,
        customTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const cleanLocation = asMaybeContractAddressLocation(token.networkLocation)
    if (cleanLocation == null) {
      throw new Error('ErrorInvalidContractAddress')
    }
    return cleanLocation.contractAddress
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<AlgorandNetworkInfo>
): Promise<AlgorandTools> {
  return new AlgorandTools(env)
}

export { makeCurrencyEngine } from './AlgorandEngine'
