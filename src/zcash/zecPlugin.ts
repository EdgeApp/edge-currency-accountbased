import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getDenomInfo } from '../common/utils'
import { asBlockchairInfo, UnifiedViewingKey } from './zecTypes'

export class ZcashTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo

  KeyTool: any
  AddressTool: any
  network: string

  constructor(env: PluginEnvironment<{}>) {
    const { currencyInfo, io } = env
    this.io = io
    this.currencyInfo = currencyInfo

    const RNAccountbased = env.nativeIo['edge-currency-accountbased']
    if (RNAccountbased == null) {
      throw new Error('Need opts')
    }
    const { KeyTool, AddressTool } = RNAccountbased

    this.network =
      currencyInfo.defaultSettings.otherSettings.rpcNode.networkName
    this.KeyTool = KeyTool
    this.AddressTool = AddressTool
  }

  // TODO: Replace with RPC method
  async getNewWalletBirthdayBlockheight(): Promise<number> {
    const { pluginId } = this.currencyInfo

    const response = await this.io.fetch(
      `${this.currencyInfo.defaultSettings.otherSettings.blockchairServers[0]}/${pluginId}/stats`
    )
    return asBlockchairInfo(await response.json()).data.best_block_height
  }

  async isValidAddress(address: string): Promise<boolean> {
    return (
      (await this.AddressTool.isValidShieldedAddress(address)) === true ||
      (await this.AddressTool.isValidTransparentAddress(address)) === true
    )
  }

  // will actually use MNEMONIC version of private key
  async importPrivateKey(userInput: string): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const isValid = validateMnemonic(userInput)
    if (!isValid)
      throw new Error(`Invalid ${this.currencyInfo.currencyCode} mnemonic`)
    const hexBuffer = await mnemonicToSeed(userInput)
    const hex = hexBuffer.toString('hex')
    const spendKey = await this.KeyTool.deriveSpendingKey(hex, this.network)
    if (typeof spendKey !== 'string') throw new Error('Invalid spendKey type')

    // Get current network height for the birthday height
    const birthdayHeight = await this.getNewWalletBirthdayBlockheight()

    return {
      [`${pluginId}Mnemonic`]: userInput,
      [`${pluginId}SpendKey`]: spendKey,
      [`${pluginId}BirthdayHeight`]: birthdayHeight
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

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const { pluginId } = this.currencyInfo
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const mnemonic = walletInfo.keys[`${pluginId}Mnemonic`]
    if (typeof mnemonic !== 'string') {
      throw new Error('InvalidMnemonic')
    }
    const hexBuffer = await mnemonicToSeed(mnemonic)
    const hex = hexBuffer.toString('hex')
    const unifiedViewingKeys: UnifiedViewingKey =
      await this.KeyTool.deriveViewingKey(hex, this.network)
    const shieldedAddress = await this.AddressTool.deriveShieldedAddress(
      unifiedViewingKeys.extfvk,
      this.network
    )
    return {
      publicKey: shieldedAddress,
      unifiedViewingKeys
    }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true }

    const {
      edgeParsedUri,
      edgeParsedUri: { publicAddress }
    } = parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    )

    if (publicAddress == null || !(await this.isValidAddress(publicAddress))) {
      throw new Error('InvalidPublicAddressError')
    }

    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!(await this.isValidAddress(publicAddress))) {
      throw new Error('InvalidPublicAddressError')
    }

    let amount
    if (nativeAmount != null) {
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
    const encodedUri = encodeUriCommon(obj, `${pluginId}`, amount)
    return encodedUri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<{}>
): Promise<ZcashTools> {
  return new ZcashTools(env)
}

export { makeCurrencyEngine } from './zecEngine'
