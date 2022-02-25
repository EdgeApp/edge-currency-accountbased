// @flow

import { entropyToMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeMetaToken,
  type EdgeParsedUri,
  type EdgeWalletInfo,
  type JsonObject
} from 'edge-core-js/types'

import { CurrencyPlugin } from '../common/plugin.js'

export class PolkadotPlugin extends CurrencyPlugin {
  pluginId: string

  constructor(io: EdgeIo, currencyInfo: EdgeCurrencyInfo) {
    super(io, currencyInfo.pluginId, currencyInfo)
    this.pluginId = currencyInfo.pluginId
  }

  async importPrivateKey(userInput: string): Promise<JsonObject> {
    throw new Error('Must implement importPrivateKey')
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    const type = walletType.replace('wallet:', '')

    if (type === this.pluginId) {
      const entropy = Buffer.from(this.io.random(32))
      const mnemonic = entropyToMnemonic(entropy)
      return this.importPrivateKey(mnemonic)
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    throw new Error('Must implement derivePublicKey')
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    throw new Error('Must implement parseUri')
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    throw new Error('Must implement encodeUri')
  }
}

export function makePolkadotPluginInner(
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo
): EdgeCurrencyPlugin {
  const { io } = opts

  let toolsPromise: Promise<PolkadotPlugin>
  function makeCurrencyTools(): Promise<PolkadotPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new PolkadotPlugin(io, currencyInfo))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    throw new Error('Must implement makeEngine')
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
