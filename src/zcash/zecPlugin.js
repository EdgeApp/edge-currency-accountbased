/**
 * Created by paul on 8/8/17.
 */
// @flow

import { bns } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
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
import { ZcashEngine } from './zecEngine.js'
import { currencyInfo } from './zecInfo.js'
import { type UnifiedViewingKey } from './zecTypes.js'

export class ZcashPlugin extends CurrencyPlugin {
  KeyTool: any
  AddressTool: any
  constructor(io: EdgeIo, KeyTool: any, AddressTool: any) {
    super(io, 'zcash', currencyInfo)
    this.KeyTool = KeyTool
    this.AddressTool = AddressTool
  }

  // TODO: Replace with RPC method
  async getNewWalletBirthdayBlockheight(): Promise<number> {
    let blockheight =
      this.currencyInfo.defaultSettings.otherSettings.defaultBirthday
    try {
      const response = await this.io.fetch(
        `${this.currencyInfo.defaultSettings.otherSettings.blockchairServers[0]}/zcash/stats`
      )
      blockheight = asZcashBlockchairInfo(await response.json()).data
        .best_block_height
    } catch (e) {
      // Failure is ok, use default
    }
    return blockheight
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
    if (!isValid) throw new Error('Invalid ZEC mnemonic')
    const hexBuffer = await mnemonicToSeed(userInput)
    const hex = hexBuffer.toString('hex')
    const zcashSpendKey = await this.KeyTool.deriveSpendingKey(hex)
    if (typeof zcashSpendKey !== 'string')
      throw new Error('Invalid zcashSpendKey type')

    // Get current network height for the birthday height
    const zcashBirthdayHeight = await this.getNewWalletBirthdayBlockheight()

    return {
      zcashMnemonic: userInput,
      zcashSpendKey,
      zcashBirthdayHeight
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === 'zcash') {
      const entropy = Buffer.from(this.io.random(32)).toString('hex')
      const zcashMnemonic = entropyToMnemonic(entropy)
      return this.importPrivateKey(zcashMnemonic)
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'zcash') {
      const mnemonic = walletInfo.keys.zcashMnemonic
      if (typeof mnemonic !== 'string') {
        throw new Error('InvalidZcashMnemonic')
      }
      const hexBuffer = await mnemonicToSeed(mnemonic)
      const hex = hexBuffer.toString('hex')
      const unifiedViewingKeys: UnifiedViewingKey =
        await this.KeyTool.deriveViewingKey(hex)
      const shieldedAddress = await this.AddressTool.deriveShieldedAddress(
        unifiedViewingKeys.extfvk
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
    const networks = { zcash: true }

    const {
      edgeParsedUri,
      edgeParsedUri: { publicAddress }
    } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks,
      currencyCode || 'ZEC',
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
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        currencyInfo,
        currencyCode || 'ZEC',
        customTokens
      )
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = this.encodeUriCommon(obj, 'zcash', amount)
    return encodedUri
  }
}

export function makeZcashPlugin(
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  const { io, initOptions } = opts
  if (!opts.nativeIo['edge-currency-accountbased']) {
    throw new Error('Need opts')
  }
  const RNAccountbased = opts.nativeIo['edge-currency-accountbased']
  const { KeyTool, AddressTool, makeSynchronizer } = RNAccountbased
  let toolsPromise: Promise<ZcashPlugin>
  function makeCurrencyTools(): Promise<ZcashPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new ZcashPlugin(io, KeyTool, AddressTool))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new ZcashEngine(
      tools,
      walletInfo,
      initOptions,
      opts,
      makeSynchronizer
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
