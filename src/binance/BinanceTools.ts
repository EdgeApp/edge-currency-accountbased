import { stringToPath } from '@cosmjs/crypto'
import { fromBech32 } from '@cosmjs/encoding'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { div } from 'biggystring'
import * as bip32 from 'bip32'
import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  asBnbPrivateKey,
  asSafeBnbWalletInfo,
  BinanceInfoPayload,
  BinanceNetworkInfo
} from './binanceTypes'

export class BinanceTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: BinanceNetworkInfo

  constructor(env: PluginEnvironment<BinanceNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const keys = asBnbPrivateKey(privateWalletInfo.keys)
    return keys.binanceMnemonic
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeBnbWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  // will actually use MNEMONIC version of private key
  async importPrivateKey(binanceMnemonic: string): Promise<Object> {
    const isValid = validateMnemonic(binanceMnemonic)
    if (!isValid) throw new Error('Invalid BNB mnemonic')

    const binanceKeyBytes = mnemonicToSeedSync(binanceMnemonic)
    const master = bip32.fromSeed(binanceKeyBytes)
    const child = master.derivePath(`44'/714'/0'/0/0`)
    if (child.privateKey == null) {
      throw new Error('child does not have a privateKey')
    }

    const binanceKey = child.privateKey.toString('hex')
    return { binanceMnemonic, binanceKey }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type !== 'binance') throw new Error('InvalidWalletType')

    const entropy = Buffer.from(this.io.random(32))
    const binanceMnemonic = entropyToMnemonic(entropy)

    return await this.importPrivateKey(binanceMnemonic)
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'binance') {
      let publicKey = ''
      let privateKey = walletInfo.keys.binanceKey
      if (typeof privateKey !== 'string') {
        privateKey = base16.stringify(
          mnemonicToSeedSync(walletInfo.keys.binanceMnemonic)
        )
      }
      const path = stringToPath(`m/44'/714'/0'/0/0`)
      const signer = await DirectSecp256k1HdWallet.fromMnemonic(
        walletInfo.keys.binanceMnemonic,
        {
          hdPaths: [path],
          prefix: 'bnb'
        }
      )
      const accountInfos = await signer.getAccounts()
      const { address } = accountInfos[0]
      publicKey = address
      return { publicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  checkAddress(address: string): boolean {
    try {
      const bech32Address = fromBech32(address)
      if (bech32Address.prefix !== 'bnb') {
        return false
      }
    } catch (e) {
      return false
    }
    return true
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const networks = { binance: true }

    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      currencyCode: currencyCode ?? 'BNB',
      customTokens
    })
    const address = edgeParsedUri.publicAddress ?? ''

    const valid = this.checkAddress(address)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj
    const valid = this.checkAddress(publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getLegacyDenomination(
        currencyCode ?? 'BNB',
        this.currencyInfo,
        customTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = encodeUriCommon(obj, 'binance', amount)
    return encodedUri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<BinanceNetworkInfo>
): Promise<BinanceTools> {
  return new BinanceTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<BinanceNetworkInfo>,
  infoPayload: BinanceInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './BinanceEngine'
