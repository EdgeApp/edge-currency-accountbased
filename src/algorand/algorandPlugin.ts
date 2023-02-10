import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'

export class AlgorandTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo

  constructor(env: PluginEnvironment<{}>) {
    const { currencyInfo, io } = env
    this.io = io
    this.currencyInfo = currencyInfo
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    throw new Error('importPrivateKey not implemented')
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    throw new Error('createPrivateKey not implemented')
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    throw new Error('derivePublicKey not implemented')
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    throw new Error('parseUri not implemented')
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    throw new Error('encodeUri not implemented')
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<{}>
): Promise<AlgorandTools> {
  return new AlgorandTools(env)
}

export { makeCurrencyEngine } from './algorandEngine'
