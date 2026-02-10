import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeParsedUri,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { mergeDeeply } from '../common/utils'
import { MoneroNetworkInfo } from './moneroTypes'

export class MoneroTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo

  constructor(env: PluginEnvironment<MoneroNetworkInfo>) {
    const { currencyInfo, io } = env
    this.io = io
    this.currencyInfo = currencyInfo
    // Stub: no CppBridge yet
  }

  async createPrivateKey(
    _walletType: string,
    _opts?: JsonObject
  ): Promise<JsonObject> {
    throw new Error('Not implemented')
  }

  async derivePublicKey(_walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    throw new Error('Not implemented')
  }

  async getDisplayPrivateKey(
    _privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    throw new Error('Not implemented')
  }

  async getDisplayPublicKey(
    _publicWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    throw new Error('Not implemented')
  }

  async importPrivateKey(
    _input: string,
    _opts?: JsonObject
  ): Promise<JsonObject> {
    throw new Error('Not implemented')
  }

  async isValidAddress(_address: string): Promise<boolean> {
    throw new Error('Not implemented')
  }

  async parseUri(
    _uri: string,
    _currencyCode?: string,
    _customTokens?: unknown
  ): Promise<EdgeParsedUri> {
    throw new Error('Not implemented')
  }

  async encodeUri(
    _obj: EdgeEncodeUri,
    _customTokens?: unknown
  ): Promise<string> {
    throw new Error('Not implemented')
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<MoneroNetworkInfo>
): Promise<MoneroTools> {
  return new MoneroTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<MoneroNetworkInfo>,
  infoPayload: JsonObject
): Promise<void> {
  const { ...networkInfo } = infoPayload
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './MoneroEngine'
