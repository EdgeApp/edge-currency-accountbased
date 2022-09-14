import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
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
import { ZcashEngine } from './zecEngine'
import { currencyInfo } from './zecInfo'
import { asBlockchairInfo, UnifiedViewingKey } from './zecTypes'

export class ZcashPlugin extends CurrencyPlugin {
  pluginId: string
  KeyTool: any
  AddressTool: any
  network: string

  constructor(io: EdgeIo, KeyTool: any, AddressTool: any) {
    super(io, `${currencyInfo.pluginId}`, currencyInfo)
    this.pluginId = currencyInfo.pluginId
    this.network =
      currencyInfo.defaultSettings.otherSettings.rpcNode.networkName
    this.KeyTool = KeyTool
    this.AddressTool = AddressTool
  }

  // TODO: Replace with RPC method
  async getNewWalletBirthdayBlockheight(): Promise<number> {
    const response = await this.io.fetch(
      `${this.currencyInfo.defaultSettings.otherSettings.blockchairServers[0]}/${this.pluginId}/stats`
    )
    return asBlockchairInfo(await response.json()).data.best_block_height
  }

  async isValidAddress(address: string): Promise<boolean> {
    return (
      (await this.AddressTool.isValidShieldedAddress(address)) ||
      (await this.AddressTool.isValidTransparentAddress(address))
    )
  }

  // will actually use MNEMONIC version of private key
  async importPrivateKey(userInput: string): Promise<Object> {
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
      [`${this.pluginId}Mnemonic`]: userInput,
      [`${this.pluginId}SpendKey`]: spendKey,
      [`${this.pluginId}BirthdayHeight`]: birthdayHeight
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === `${this.pluginId}`) {
      const entropy = Buffer.from(this.io.random(32)).toString('hex')
      const mnemonic = entropyToMnemonic(entropy)
      return await this.importPrivateKey(mnemonic)
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === `${this.pluginId}`) {
      const mnemonic = walletInfo.keys[`${this.pluginId}Mnemonic`]
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

    const {
      edgeParsedUri,
      edgeParsedUri: { publicAddress }
    } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks,
      currencyCode || `${this.currencyInfo.currencyCode}`,
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
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!(await this.isValidAddress(publicAddress))) {
      throw new Error('InvalidPublicAddressError')
    }

    let amount
    if (nativeAmount != null) {
      const denom = getDenomInfo(
        currencyInfo,
        currencyCode || `${this.currencyInfo.currencyCode}`,
        customTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = this.encodeUriCommon(obj, `${this.pluginId}`, amount)
    return encodedUri
  }
}

export function makeZcashPlugin(
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io } = opts
  if (!opts.nativeIo['edge-currency-accountbased']) {
    throw new Error('Need opts')
  }
  const RNAccountbased = opts.nativeIo['edge-currency-accountbased']
  const { KeyTool, AddressTool, makeSynchronizer } = RNAccountbased
  let toolsPromise: Promise<ZcashPlugin>
  async function makeCurrencyTools(): Promise<ZcashPlugin> {
    if (toolsPromise != null) return await toolsPromise
    toolsPromise = Promise.resolve(new ZcashPlugin(io, KeyTool, AddressTool))
    return await toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new ZcashEngine(
      tools,
      walletInfo,
      opts,
      makeSynchronizer
    )

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
