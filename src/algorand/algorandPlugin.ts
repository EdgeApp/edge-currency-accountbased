import algosdk from 'algosdk'
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
import { asAlgorandPrivateKeys } from './algorandTypes'

const { mnemonicFromSeed } = algosdk

export class AlgorandTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo

  constructor(env: PluginEnvironment<{}>) {
    const { currencyInfo, io } = env
    this.io = io
    this.currencyInfo = currencyInfo
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
