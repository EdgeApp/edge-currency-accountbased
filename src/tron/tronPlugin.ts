import { mnemonicToSeed } from 'bip39'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeWalletInfo
} from 'edge-core-js/types'
import hdKey from 'ethereumjs-wallet/hdkey'

import { getFetchCors } from '../common/utils'
import { TronEngine } from './tronEngine'
import { currencyInfo } from './tronInfo'
import { TronOtherdata } from './tronTypes'

export class TronTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo
  log: EdgeLog

  constructor(io: EdgeIo, log: EdgeLog) {
    this.io = io
    this.currencyInfo = currencyInfo
    this.log = log
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async _mnemonicToTronKey(mnemonic: string): Promise<string> {
    const myMnemonicToSeed = await mnemonicToSeed(mnemonic)
    const hdwallet = hdKey.fromMasterSeed(myMnemonicToSeed)
    const walletHDpath = "m/44'/195'/0'/0" // 195 = Tron
    const wallet = hdwallet.derivePath(walletHDpath).getWallet()
    const tronKey = wallet.getPrivateKeyString().replace('0x', '')
    return tronKey
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }
}

export function makeTronPlugin(
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io, log } = opts
  const fetchCors = getFetchCors(opts)
  let toolsPromise: Promise<TronTools>
  async function makeCurrencyTools(): Promise<TronTools> {
    if (toolsPromise != null) return await toolsPromise
    toolsPromise = Promise.resolve(new TronTools(io, log))
    return await toolsPromise
  }
  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new TronEngine(tools, walletInfo, opts, fetchCors)
    // Do any async initialization necessary for the engine
    await currencyEngine.loadEngine(tools, walletInfo, opts)
    // This is just to make sure otherData is type checked
    currencyEngine.otherData = currencyEngine.walletLocalData
      .otherData as TronOtherdata

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
