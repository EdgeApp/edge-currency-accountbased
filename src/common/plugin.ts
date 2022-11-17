/**
 * Created by paul on 8/8/17.
 */

import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeEncodeUri,
  EdgeIo,
  EdgeParsedUri,
  EdgeWalletInfo
} from 'edge-core-js/types'

// TODO: pass in denoms pull code into common
export class CurrencyPlugin {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo

  constructor(io: EdgeIo, pluginId: string, currencyInfo: EdgeCurrencyInfo) {
    this.io = io
    this.currencyInfo = currencyInfo
  }

  async createPrivateKey(_walletType: string): Promise<Object> {
    throw new Error('Must implement createPrivateKey')
  }

  async derivePublicKey(_walletInfo: EdgeWalletInfo): Promise<Object> {
    throw new Error('Must implement derivePublicKey')
  }

  async makeEngine(
    _walletInfo: EdgeWalletInfo,
    _opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    throw new Error('Must implement makeEngine')
  }

  async parseUri(_uri: string): Promise<EdgeParsedUri> {
    throw new Error('Must implement parseUri')
  }

  async encodeUri(_obj: EdgeEncodeUri): Promise<string> {
    throw new Error('Must implement encodeUri')
  }
}
