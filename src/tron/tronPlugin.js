/* global fetch */
// @flow

import { Buffer } from 'buffer'
import { bns } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed } from 'bip39'
import ethWallet from 'ethereumjs-wallet'
import hdkey from 'ethereumjs-wallet/hdkey'
import TronWeb from 'tronweb'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeMetaToken,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyPlugin } from '../common/plugin.js'
import { getDenomInfo } from '../common/utils.js'
import { getFetchCors } from '../react-native-io.js'
import { TronEngine } from './tronEngine.js'
import { currencyInfo } from './tronInfo.js'

const tronWeb = new TronWeb({ fullHost: 'https://api.trongrid.io' })

export class TronPlugin extends CurrencyPlugin {
  constructor (io: EdgeIo) {
    super(io, 'tron', currencyInfo)
  }

  async importPrivateKey (passPhrase: string): Promise<Object> {
    const strippedPassPhrase = passPhrase.replace('0x', '').replace(/ /g, '')
    const buffer = Buffer.from(strippedPassPhrase, 'hex')
    if (buffer.length !== 32) throw new Error('Private key wrong length')
    const tronKey = buffer.toString('hex')
    const wallet = ethWallet.fromPrivateKey(buffer)
    wallet.getAddressString()
    return {
      tronMnemonic: passPhrase,
      tronKey
    }
  }

  async createPrivateKey (walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type === 'tron') {
      const entropy = Buffer.from(this.io.random(32)).toString('hex')
      const tronMnemonic = entropyToMnemonic(entropy)
      const myMnemonicToSeed = mnemonicToSeed(tronMnemonic).toString('hex')
      const hdwallet = hdkey.fromMasterSeed(myMnemonicToSeed)
      const walletHDpath = "m/44'/195'/0'/0" // 195 = Tron
      const wallet = hdwallet.derivePath(walletHDpath).getWallet()
      const tronKey = wallet.getPrivateKeyString().replace('0x', '')
      return { tronMnemonic, tronKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey (walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'tron') {
      const publicKey = tronWeb.address.fromPrivateKey(walletInfo.keys.tronKey)
      return { publicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri (
    uri: string,
    currencyCode?: string,
    customTokens?: Array<EdgeMetaToken>
  ): Promise<EdgeParsedUri> {
    const networks = { tron: true }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks,
      currencyCode || 'TRX',
      customTokens
    )
    let address = ''
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
    }

    const valid = tronWeb.isAddress(address || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo || undefined
    return edgeParsedUri
  }

  async encodeUri (
    obj: EdgeEncodeUri,
    customTokens?: Array<EdgeMetaToken>
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj
    const valid = tronWeb.isAddress(publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        currencyInfo,
        currencyCode || 'TRX',
        customTokens
      )
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = this.encodeUriCommon(obj, 'tron', amount)
    return encodedUri
  }
}

export function makeTronPlugin (
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io, initOptions } = opts
  const fetchCors = getFetchCors(opts)

  let toolsPromise: Promise<TronPlugin>
  function makeCurrencyTools (): Promise<TronPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new TronPlugin(io))
    return toolsPromise
  }

  async function makeCurrencyEngine (
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new TronEngine(
      tools,
      walletInfo,
      initOptions,
      opts,
      fetchCors
    )

    // Do any async initialization necessary for the engine
    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
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
