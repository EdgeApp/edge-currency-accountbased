/**
 * Created by paul on 8/8/17.
 */


import { crypto } from '@binance-chain/javascript-sdk'
import { bns } from 'biggystring'
import { entropyToMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyPlugin,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyPlugin } from '../common/plugin'
import { getDenomInfo } from '../common/utils'
import { BinanceEngine } from './bnbEngine'
import { currencyInfo } from './bnbInfo'

const {
  checkAddress,
  getAddressFromPrivateKey,
  getPrivateKeyFromMnemonic,
  validateMnemonic
} = crypto

export class BinancePlugin extends CurrencyPlugin {
  constructor(io: EdgeIo) {
    super(io, 'binance', currencyInfo)
  }

  // will actually use MNEMONIC version of private key
  async importPrivateKey(mnemonic: string): Promise<Object> {
    const isValid = validateMnemonic(mnemonic)
    if (!isValid) throw new Error('Invalid BNB mnemonic')
    const binanceKey = getPrivateKeyFromMnemonic(mnemonic)

    return { binanceMnemonic: mnemonic, binanceKey }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === 'binance') {
      const entropy = Buffer.from(this.io.random(32)).toString('hex')
      const binanceMnemonic = entropyToMnemonic(entropy)
      const binanceKey = getPrivateKeyFromMnemonic(binanceMnemonic)

      return { binanceMnemonic, binanceKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'binance') {
      let publicKey = ''
      let privateKey = walletInfo.keys.binanceKey
      if (typeof privateKey !== 'string') {
        privateKey = getPrivateKeyFromMnemonic(walletInfo.keys.binanceMnemonic)
      }
      publicKey = getAddressFromPrivateKey(privateKey, 'bnb')
      return { publicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const networks = { binance: true }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks,
      currencyCode || 'BNB',
      customTokens
    )
    let address = ''
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
    }

    const valid = checkAddress(address || '', 'bnb')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo || undefined
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj
    const valid = checkAddress(publicAddress, 'bnb')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        currencyInfo,
        currencyCode || 'BNB',
        customTokens
      )
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = this.encodeUriCommon(obj, 'binance', amount)
    return encodedUri
  }
}

export function makeBinancePlugin(
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io, initOptions } = opts

  let toolsPromise: Promise<BinancePlugin>
  function makeCurrencyTools(): Promise<BinancePlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new BinancePlugin(io))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new BinanceEngine(
      tools,
      walletInfo,
      initOptions,
      opts
    )

    // Do any async initialization necessary for the engine
    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    const out: EdgeCurrencyEngine = currencyEngine

    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
