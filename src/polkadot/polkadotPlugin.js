// @flow
import '@polkadot/wasm-crypto/initOnlyAsm'

import { div } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
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
import { getDenomInfo, isHex } from '../common/utils.js'
import { PolkadotEngine } from './polkadotEngine.js'
import {
  ed25519PairFromSeed, // FIXME: Is this a good default?
  encodeAddress,
  isAddress,
  mnemonicToMiniSecret
} from './polkadotUtils'

export class PolkadotPlugin extends CurrencyPlugin {
  pluginId: string

  constructor(io: EdgeIo, currencyInfo: EdgeCurrencyInfo) {
    super(io, currencyInfo.pluginId, currencyInfo)
    this.pluginId = currencyInfo.pluginId
  }

  async importPrivateKey(userInput: string): Promise<JsonObject> {
    if (validateMnemonic(userInput)) {
      const miniSecret = mnemonicToMiniSecret(userInput)
      const { secretKey } = ed25519PairFromSeed(miniSecret)
      return {
        [`${this.pluginId}Mnemonic`]: userInput,
        [`${this.pluginId}Key`]: Buffer.from(secretKey).toString('hex')
      }
    } else if (isHex(userInput)) {
      return {
        [`${this.pluginId}Key`]: userInput
      }
    } else {
      throw new Error('InvalidPrivateKey')
    }
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
    const secret = new Uint8Array(walletInfo.keys[`${this.pluginId}Key`])
    const { publicKey } = ed25519PairFromSeed(secret)
    return encodeAddress(publicKey)
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const networks = { [this.pluginId]: true }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      currencyCode || this.currencyInfo.currencyCode,
      customTokens
    )
    let address = ''
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
    }

    if (!isAddress(address)) throw new Error('InvalidPublicAddressError')

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo || undefined
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!isAddress(publicAddress)) throw new Error('InvalidPublicAddressError')

    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        this.currencyInfo,
        currencyCode || this.currencyInfo.currencyCode,
        customTokens
      )
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 10)
    }
    const encodedUri = this.encodeUriCommon(obj, this.pluginId, amount)
    return encodedUri
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
    const tools = await makeCurrencyTools()
    const currencyEngine = new PolkadotEngine(tools, walletInfo, opts)

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
