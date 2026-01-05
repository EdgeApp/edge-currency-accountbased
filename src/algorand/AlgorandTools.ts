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
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  AlgorandInfoPayload,
  AlgorandNetworkInfo,
  asAlgorandPrivateKeys,
  asMaybeContractAddressLocation,
  asSafeAlgorandWalletInfo
} from './algorandTypes'

const { isValidAddress, mnemonicFromSeed } = algosdk

export class AlgorandTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo

  constructor(env: PluginEnvironment<AlgorandNetworkInfo>) {
    const { currencyInfo, io } = env
    this.io = io
    this.currencyInfo = currencyInfo
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asAlgorandPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.mnemonic
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeAlgorandWalletInfo(publicWalletInfo)
    return keys.publicKey
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
    const networks = { [pluginId]: true }

    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    })

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
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!isValidAddress(publicAddress))
      throw new Error('InvalidPublicAddressError')

    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getLegacyDenomination(
        currencyCode ?? this.currencyInfo.currencyCode,
        this.currencyInfo,
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

export async function updateInfoPayload(
  env: PluginEnvironment<AlgorandNetworkInfo>,
  infoPayload: AlgorandInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './AlgorandEngine'
