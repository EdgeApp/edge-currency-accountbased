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

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination } from '../common/utils'
import { CardanoNetworkInfo } from './cardanoTypes'

export class CardanoTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo
  networkInfo: CardanoNetworkInfo

  constructor(env: PluginEnvironment<CardanoNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    throw new Error('unimplemented')
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    throw new Error('unimplemented')
  }

  async importPrivateKey(mnemonic: string): Promise<Object> {
    throw new Error('unimplemented')
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    throw new Error('unimplemented')
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    throw new Error('unimplemented')
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const networks = { cardano: true }

    const { parsedUri, edgeParsedUri } = parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      this.builtinTokens,
      currencyCode ?? 'ADA',
      customTokens
    )

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { nativeAmount, currencyCode } = obj

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
    const encodedUri = encodeUriCommon(obj, 'cardano', amount)
    return encodedUri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<CardanoNetworkInfo>
): Promise<CardanoTools> {
  return new CardanoTools(env)
}

export { makeCurrencyEngine } from './CardanoEngine'
