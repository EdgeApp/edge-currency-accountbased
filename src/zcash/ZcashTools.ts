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
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import {
  AddressTool as AddressToolType,
  KeyTool as KeyToolType
} from 'react-native-zcash'

import { PluginEnvironment } from '../common/innerPlugin'
import { asIntegerString } from '../common/types'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination } from '../common/utils'
import {
  asSafeZcashWalletInfo,
  asZcashPrivateKeys,
  asZecPublicKey,
  UnifiedViewingKey,
  ZcashNetworkInfo
} from './zcashTypes'

export class ZcashTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo
  networkInfo: ZcashNetworkInfo

  KeyTool: typeof KeyToolType
  AddressTool: typeof AddressToolType

  constructor(env: PluginEnvironment<ZcashNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo

    const RNAccountbased = env.nativeIo['edge-currency-accountbased']
    if (RNAccountbased == null) {
      throw new Error('Need opts')
    }
    const { KeyTool, AddressTool } = RNAccountbased[this.networkInfo.nativeSdk]

    this.KeyTool = KeyTool
    this.AddressTool = AddressTool
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asZcashPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.mnemonic
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeZcashWalletInfo(publicWalletInfo)
    return keys.unifiedViewingKeys?.extfvk
  }

  async getNewWalletBirthdayBlockheight(): Promise<number> {
    try {
      return await this.KeyTool.getBirthdayHeight(
        this.networkInfo.rpcNode.defaultHost,
        this.networkInfo.rpcNode.defaultPort
      )
    } catch (e: any) {
      return this.networkInfo.defaultBirthday
    }
  }

  async isValidAddress(address: string): Promise<boolean> {
    return (
      (await this.AddressTool.isValidShieldedAddress(address)) ||
      (await this.AddressTool.isValidTransparentAddress(address))
    )
  }

  // will actually use MNEMONIC version of private key
  async importPrivateKey(
    userInput: string,
    opts: JsonObject = {}
  ): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const isValid = validateMnemonic(userInput)
    if (!isValid)
      throw new Error(`Invalid ${this.currencyInfo.currencyCode} mnemonic`)
    const hexBuffer = await mnemonicToSeed(userInput)
    const hex = hexBuffer.toString('hex')
    const spendKey = await this.KeyTool.deriveSpendingKey(
      hex,
      this.networkInfo.rpcNode.networkName
    )
    if (typeof spendKey !== 'string') throw new Error('Invalid spendKey type')

    // Get current network height for the birthday height
    const currentNetworkHeight = await this.getNewWalletBirthdayBlockheight()

    let height = currentNetworkHeight

    const { birthdayHeight } = opts
    if (birthdayHeight != null) {
      asIntegerString(birthdayHeight)

      const birthdayHeightInt = parseInt(birthdayHeight)

      if (birthdayHeightInt > currentNetworkHeight) {
        throw new Error('InvalidBirthdayHeight') // must be less than current block height (assuming query was successful)
      }
      height = birthdayHeightInt
    }

    return {
      [`${pluginId}Mnemonic`]: userInput,
      [`${pluginId}SpendKey`]: spendKey,
      [`${pluginId}BirthdayHeight`]: height
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
      asZecPublicKey(publicKey)
      return true
    } catch (err) {
      return false
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const zcashPrivateKeys = asZcashPrivateKeys(pluginId)(walletInfo.keys)
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const mnemonic = zcashPrivateKeys.mnemonic
    if (typeof mnemonic !== 'string') {
      throw new Error('InvalidMnemonic')
    }
    const hexBuffer = await mnemonicToSeed(mnemonic)
    const hex = hexBuffer.toString('hex')
    const unifiedViewingKeys: UnifiedViewingKey =
      await this.KeyTool.deriveViewingKey(
        hex,
        this.networkInfo.rpcNode.networkName
      )
    const shieldedAddress = await this.AddressTool.deriveShieldedAddress(
      unifiedViewingKeys.extfvk,
      this.networkInfo.rpcNode.networkName
    )
    return {
      birthdayHeight: zcashPrivateKeys.birthdayHeight,
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
  env: PluginEnvironment<ZcashNetworkInfo>
): Promise<ZcashTools> {
  return new ZcashTools(env)
}

export { makeCurrencyEngine } from './ZcashEngine'
