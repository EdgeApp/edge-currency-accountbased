import { isAddressValid, pkToAddress } from '@tronscan/client/src/utils/crypto'
import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
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
import EthereumUtil from 'ethereumjs-util'
import hdKey from 'ethereumjs-wallet/hdkey'

import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getDenomInfo, getFetchCors } from '../common/utils'
import { TronEngine } from './tronEngine'
import { TronNetworkInfo, TronOtherdata } from './tronTypes'

export class TronTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo
  log: EdgeLog

  constructor(io: EdgeIo, currencyInfo: EdgeCurrencyInfo, log: EdgeLog) {
    this.io = io
    this.currencyInfo = currencyInfo
    this.log = log
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(userInput)) {
      // It looks like a private key, so validate the hex:
      const tronKeyBuffer = Buffer.from(userInput.replace(/^0x/, ''), 'hex')
      if (EthereumUtil.isValidPrivate(tronKeyBuffer) === true) {
        throw new Error('Invalid private key')
      }
      const tronKey = tronKeyBuffer.toString('hex')
      return { tronKey }
    } else {
      // it looks like a mnemonic, so validate that way:
      if (!validateMnemonic(userInput)) {
        throw new Error('Invalid input')
      }
      const tronKey = await this._mnemonicToTronKey(userInput)
      return {
        tronMnemonic: userInput,
        tronKey
      }
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const entropy = Buffer.from(this.io.random(32)).toString('hex')
    const tronMnemonic = entropyToMnemonic(entropy)
    const tronKey = await this._mnemonicToTronKey(tronMnemonic)
    return { tronMnemonic, tronKey }
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
    if (walletInfo.type !== this.currencyInfo.pluginId) {
      throw new Error('InvalidWalletType')
    }

    const publicKey = pkToAddress(walletInfo.keys.tronKey)
    return { publicKey }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const networks = { [this.currencyInfo.pluginId]: true }

    const { parsedUri, edgeParsedUri } = parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    )
    const address = edgeParsedUri.publicAddress ?? ''

    if (!isAddressValid(address)) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj

    if (!isAddressValid(publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        this.currencyInfo,
        currencyCode ?? this.currencyInfo.currencyCode,
        customTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = encodeUriCommon(obj, this.currencyInfo.pluginId, amount)
    return encodedUri
  }
}

export function makeTronPluginInner(
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo,
  networkInfo: TronNetworkInfo
): EdgeCurrencyPlugin {
  const { io, log } = opts
  const fetchCors = getFetchCors(opts)
  let toolsPromise: Promise<TronTools>
  async function makeCurrencyTools(): Promise<TronTools> {
    if (toolsPromise != null) return await toolsPromise
    toolsPromise = Promise.resolve(new TronTools(io, currencyInfo, log))
    return await toolsPromise
  }
  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new TronEngine(
      tools,
      walletInfo,
      opts,
      fetchCors,
      networkInfo
    )
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
