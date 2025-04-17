import { div } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import type { NativeZanoModule } from 'react-native-zano'
import { CppBridge } from 'react-native-zano/lib/src/CppBridge'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import { ZanoInfoPayload, ZanoNetworkInfo } from './zanoTypes'

export class ZanoTools implements EdgeCurrencyTools {
  zano: CppBridge
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo

  constructor(env: PluginEnvironment<ZanoNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, nativeIo } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens

    // Grab the raw C++ API and wrap it in argument parsing:
    const cppModule = nativeIo.zano as NativeZanoModule
    if (cppModule == null) throw new Error('Need zano native IO')
    this.zano = new CppBridge(cppModule)
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    throw new Error('unimplemented')
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    throw new Error('unimplemented')
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    throw new Error('unimplemented')
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    throw new Error('unimplemented')
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    throw new Error('unimplemented')
  }

  async isValidAddress(address: string): Promise<boolean> {
    const info = await this.zano.getAddressInfo(address)
    return info.valid
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
      builtinTokens: this.builtinTokens,
      currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    })

    let address = ''

    if (edgeParsedUri.publicAddress != null) {
      address = edgeParsedUri.publicAddress
    }

    const isValid = await this.isValidAddress(address)
    if (!isValid) throw new Error('InvalidPublicAddressError')

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    const isValid = await this.isValidAddress(publicAddress)
    if (!isValid) throw new Error('InvalidPublicAddressError')

    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getLegacyDenomination(
        currencyCode ?? this.currencyInfo.currencyCode,
        this.currencyInfo,
        customTokens,
        this.builtinTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<ZanoNetworkInfo>
): Promise<ZanoTools> {
  return new ZanoTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<ZanoNetworkInfo>,
  infoPayload: ZanoInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './ZanoEngine'
