import * as solanaWeb3 from '@solana/web3.js'
import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import * as ed25519 from 'ed25519-hd-key'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getDenomInfo } from '../common/utils'
import { SolanaNetworkInfo } from './solanaTypes'

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

export class SolanaTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo
  networkInfo: SolanaNetworkInfo

  constructor(env: PluginEnvironment<SolanaNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo
  }

  async importPrivateKey(mnemonic: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    const isValid = validateMnemonic(mnemonic)
    if (!isValid) throw new Error('Invalid mnemonic')

    const keypair = await createKeyPair(
      mnemonic,
      this.networkInfo.derivationPath
    )

    return {
      [`${pluginId}Mnemonic`]: mnemonic,
      [`${pluginId}Key`]: Buffer.from(keypair.secretKey).toString('hex'),
      publicKey: keypair.publicKey.toBase58()
    }
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const entropy = Buffer.from(this.io.random(32))
    const mnemonic = entropyToMnemonic(entropy)
    return await this.importPrivateKey(mnemonic)
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }
    if (walletInfo.keys[`${pluginId}Mnemonic`] == null) {
      throw new Error('Missing mnemonic')
    }
    const keys = await this.importPrivateKey(
      walletInfo.keys[`${pluginId}Mnemonic`]
    )
    return { publicKey: keys.publicKey.toString() }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true }

    const { parsedUri, edgeParsedUri } = parseUriCommon(
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

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
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
    const encodedUri = encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<SolanaNetworkInfo>
): Promise<SolanaTools> {
  return new SolanaTools(env)
}

export { makeCurrencyEngine } from './solanaEngine'
