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
import { CosmosNetworkInfo } from './cosmosTypes'

export class CosmosTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: CosmosNetworkInfo

  constructor(env: PluginEnvironment<CosmosNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.networkInfo = networkInfo
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    throw new Error('not implemented')
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    throw new Error('not implemented')
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    throw new Error('not implemented')
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    throw new Error('not implemented')
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    throw new Error('not implemented')
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    throw new Error('not implemented')
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    throw new Error('not implemented')
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<CosmosNetworkInfo>
): Promise<CosmosTools> {
  return new CosmosTools(env)
}

export { makeCurrencyEngine } from './CosmosEngine'
