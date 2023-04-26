import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo
} from 'edge-core-js/types'
import EthereumUtil from 'ethereumjs-util'
import hdKey from 'ethereumjs-wallet/hdkey'
import TronWeb from 'tronweb'

import { PluginEnvironment } from '../common/innerPlugin'
import { parsePixKey } from '../common/smartPay'
import { asMaybeContractLocation, validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getDenomInfo } from '../common/utils'
import {
  asTronInitOptions,
  asTronPrivateKeys,
  TronInitOptions,
  TronKeys,
  TronNetworkInfo
} from './tronTypes'

const {
  utils: {
    crypto: { isAddressValid, pkToAddress }
  }
} = TronWeb

export class TronTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  initOptions: TronInitOptions
  io: EdgeIo
  log: EdgeLog
  networkInfo: TronNetworkInfo

  constructor(env: PluginEnvironment<TronNetworkInfo>) {
    const { builtinTokens, currencyInfo, initOptions, io, log, networkInfo } =
      env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.initOptions = asTronInitOptions(initOptions)
    this.io = io
    this.log = log
    this.networkInfo = networkInfo
  }

  async importPrivateKey(
    userInput: string,
    opts?: { derivationPath?: string }
  ): Promise<TronKeys> {
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
      const derivationPath =
        opts?.derivationPath ?? this.networkInfo.defaultDerivationPath

      const tronKey = await this._mnemonicToTronKey(userInput, derivationPath)
      return {
        tronMnemonic: userInput,
        tronKey,
        derivationPath
      }
    }
  }

  async createPrivateKey(walletType: string): Promise<TronKeys> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const entropy = Buffer.from(this.io.random(32)).toString('hex')
    const tronMnemonic = entropyToMnemonic(entropy)
    return await this.importPrivateKey(tronMnemonic)
  }

  async _mnemonicToTronKey(mnemonic: string, path: string): Promise<string> {
    const myMnemonicToSeed = await mnemonicToSeed(mnemonic)
    const hdwallet = hdKey.fromMasterSeed(myMnemonicToSeed)
    const wallet = hdwallet.derivePath(path).getWallet()
    const tronKey = wallet.getPrivateKeyString().replace('0x', '')
    return tronKey
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const { tronKey } = asTronPrivateKeys(walletInfo.keys)
    const publicKey = pkToAddress(tronKey)
    return { publicKey }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const networks = { [this.currencyInfo.pluginId]: true }
    const { smartPayPublicAddress, smartPayUserId } = this.initOptions

    const { parsedUri, edgeParsedUri } = parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    )
    const address = edgeParsedUri.publicAddress ?? ''

    if (isAddressValid(address)) {
      edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
      return edgeParsedUri
    }

    // Look for PIX addresses
    const pixResults = await parsePixKey(
      this.io,
      this.builtinTokens,
      uri,
      smartPayPublicAddress,
      smartPayUserId
    )
    if (pixResults != null) return pixResults

    throw new Error('InvalidPublicAddressError')
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

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const cleanLocation = asMaybeContractLocation(token.networkLocation)
    if (
      cleanLocation == null ||
      !isAddressValid(cleanLocation.contractAddress)
    ) {
      throw new Error('ErrorInvalidContractAddress')
    }
    return cleanLocation.contractAddress
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<TronNetworkInfo>
): Promise<TronTools> {
  return new TronTools(env)
}

export { makeCurrencyEngine } from './TronEngine'
