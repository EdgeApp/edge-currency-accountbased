import { div } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
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
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import type { DashshieldedIo } from './dashshieldedIo'
import {
  asDashshieldedPrivateKeys,
  asDashshieldedPublicKey,
  asSafeDashshieldedWalletInfo,
  DashshieldedInfoPayload,
  DashshieldedNetworkInfo
} from './dashshieldedTypes'

export class DashshieldedTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo
  networkInfo: DashshieldedNetworkInfo
  nativeTools: DashshieldedIo['Tools']

  constructor(env: PluginEnvironment<DashshieldedNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo

    const dashshieldedIo =
      (env.nativeIo.dashshielded as DashshieldedIo) ??
      env.nativeIo['edge-currency-accountbased']?.dashshielded
    if (dashshieldedIo == null) {
      throw new Error('Need dashshielded native IO')
    }
    this.nativeTools = dashshieldedIo.Tools
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asDashshieldedPrivateKeys(pluginId)(privateWalletInfo.keys)
    return `Seed Phrase:\n${keys.mnemonic}`
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeDashshieldedWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async isValidAddress(address: string): Promise<boolean> {
    return this.nativeTools.isValidAddress(
      address,
      this.networkInfo.rpcNode.networkName
    )
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const isValid = validateMnemonic(userInput)
    if (userInput.split(' ').length !== 24) {
      throw new Error('Mnemonic must be 24 words')
    }
    if (!isValid)
      throw new Error(`Invalid ${this.currencyInfo.currencyCode} mnemonic`)

    return {
      [`${pluginId}Mnemonic`]: userInput,
      [`${pluginId}BirthdayHeight`]: 0
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const entropy = Buffer.from(this.io.random(32)).toString('hex')
    const mnemonic = entropyToMnemonic(entropy)
    return await this.importPrivateKey(mnemonic)
  }

  async checkPublicKey(publicKey: JsonObject): Promise<boolean> {
    try {
      asDashshieldedPublicKey(publicKey)
      return true
    } catch (err) {
      return false
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const privateKeys = asDashshieldedPrivateKeys(pluginId)(walletInfo.keys)
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const mnemonic = privateKeys.mnemonic
    if (typeof mnemonic !== 'string') {
      throw new Error('InvalidMnemonic')
    }
    const viewing = await this.nativeTools.deriveViewingKey(
      mnemonic,
      this.networkInfo.rpcNode.networkName
    )
    return {
      birthdayHeight: privateKeys.birthdayHeight,
      publicKey: viewing.fullViewingKey
    }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true }

    const { edgeParsedUri, edgeParsedUri: { publicAddress } } =
      await parseUriCommon({
        currencyInfo: this.currencyInfo,
        uri,
        networks,
        builtinTokens: this.builtinTokens,
        currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
        customTokens
      })

    if (publicAddress == null || !(await this.isValidAddress(publicAddress))) {
      throw new Error('InvalidPublicAddressError')
    }

    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!(await this.isValidAddress(publicAddress))) {
      throw new Error('InvalidPublicAddressError')
    }

    let amount
    if (nativeAmount != null) {
      const denom = getLegacyDenomination(
        currencyCode ?? this.currencyInfo.currencyCode,
        this.currencyInfo,
        customTokens,
        this.builtinTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 18)
    }
    return encodeUriCommon(obj, `${pluginId}`, amount)
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<DashshieldedNetworkInfo>
): Promise<DashshieldedTools> {
  return new DashshieldedTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<DashshieldedNetworkInfo>,
  infoPayload: DashshieldedInfoPayload
): Promise<void> {
  const { ...networkInfo } = infoPayload
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './DashshieldedEngine'
