import * as solanaWeb3 from '@solana/web3.js'
import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import * as ed25519 from 'ed25519-hd-key'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeCurrencyPlugin,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyPlugin } from '../common/plugin'
import { getDenomInfo, getFetchCors } from '../common/utils'
import { SolanaEngine } from './solanaEngine'

const { Keypair, PublicKey } = solanaWeb3

const createKeyPair = async (
  mnemonic: string,
  path: string
  // @ts-expect-error
): Promise<Keypair> => {
  const buffer = await mnemonicToSeed(mnemonic)
  const deriveSeed = ed25519.derivePath(path, buffer.toString('hex')).key
  // @ts-expect-error
  return Keypair.fromSeed(Uint8Array.from(Buffer.from(deriveSeed, 'hex')))
}

export class SolanaPlugin extends CurrencyPlugin {
  pluginId: string

  constructor(io: EdgeIo, currencyInfo: EdgeCurrencyInfo) {
    super(io, currencyInfo.pluginId, currencyInfo)
    this.pluginId = currencyInfo.pluginId
  }

  async importPrivateKey(mnemonic: string): Promise<JsonObject> {
    const isValid = validateMnemonic(mnemonic)
    if (!isValid) throw new Error('Invalid mnemonic')

    const keypair = await createKeyPair(
      mnemonic,
      this.currencyInfo.defaultSettings.otherSettings.derivationPath
    )

    return {
      [`${this.pluginId}Mnemonic`]: mnemonic,
      [`${this.pluginId}Key`]: Buffer.from(keypair.secretKey).toString('hex'),
      publicKey: keypair.publicKey.toBase58()
    }
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    const type = walletType.replace('wallet:', '')

    if (type === this.pluginId) {
      const entropy = Buffer.from(this.io.random(32))
      const mnemonic = entropyToMnemonic(entropy)
      return await this.importPrivateKey(mnemonic)
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    const type = walletInfo.type.replace('wallet:', '')
    if (
      type === this.pluginId &&
      walletInfo.keys[`${this.pluginId}Mnemonic`] != null
    ) {
      const keys = await this.importPrivateKey(
        walletInfo.keys[`${this.pluginId}Mnemonic`]
      )
      return { publicKey: keys.publicKey.toString() }
    } else {
      throw new Error('InvalidWalletType')
    }
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
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
      currencyCode || this.currencyInfo.currencyCode,
      customTokens
    )
    let address = ''
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
    }

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!PublicKey.isOnCurve(new PublicKey(address).toBytes()))
      throw new Error('InvalidPublicAddressError')

    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo || undefined
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { nativeAmount, currencyCode, publicAddress } = obj

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!PublicKey.isOnCurve(new PublicKey(publicAddress).toBytes()))
      throw new Error('InvalidPublicAddressError')

    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        this.currencyInfo,
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
        currencyCode || this.currencyInfo.currencyCode,
        customTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = this.encodeUriCommon(obj, this.pluginId, amount)
    return encodedUri
  }
}

export function makeSolanaPluginInner(
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo
): EdgeCurrencyPlugin {
  const { io } = opts
  const fetchCors = getFetchCors(opts)

  let toolsPromise: Promise<SolanaPlugin>
  async function makeCurrencyTools(): Promise<SolanaPlugin> {
    if (toolsPromise != null) return await toolsPromise
    toolsPromise = Promise.resolve(new SolanaPlugin(io, currencyInfo))
    return await toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new SolanaEngine(tools, walletInfo, opts, fetchCors)

    // Do any async initialization necessary for the engine
    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow checked
    // @ts-expect-error
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    // @ts-expect-error
    const out: EdgeCurrencyEngine = currencyEngine

    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
