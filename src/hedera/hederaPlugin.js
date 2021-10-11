// @flow

import * as hedera from '@hashgraph/sdk'
import { bns } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyPlugin } from '../common/plugin.js'
import { getDenomInfo } from './../common/utils.js'
import { HederaEngine } from './hederaEngine.js'
import { createChecksum, getOtherMethods, validAddress } from './hederaUtils.js'

// if users want to import their mnemonic phrase in e.g. MyHbarWallet.com
// they can just leave the passphrase field blank
const mnemonicPassphrase = ''
const Ed25519PrivateKeyPrefix = '302e020100300506032b657004220420'

export class HederaPlugin extends CurrencyPlugin {
  pluginId: string

  constructor(io: EdgeIo, currencyInfo: EdgeCurrencyInfo) {
    super(io, currencyInfo.pluginId, currencyInfo)
    this.pluginId = currencyInfo.pluginId
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === this.pluginId) {
      const entropy = this.io.random(32)
      const mnemonic = entropyToMnemonic(entropy)
      return this.importPrivateKey(mnemonic)
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    try {
      let privateMnemonic
      let privateKey
      if (
        /^(0x)?[0-9a-fA-F]{64}$/.test(
          userInput.replace(Ed25519PrivateKeyPrefix, '')
        )
      ) {
        const privateKeyString = userInput
          .replace(/^0x/, '')
          .replace(Ed25519PrivateKeyPrefix, '')

        privateKey =
          hedera.Ed25519PrivateKey.fromString(privateKeyString).toString()
      } else if (validateMnemonic(userInput)) {
        const mnemonic = hedera.Mnemonic.fromString(userInput)
        const sdkPrivateKey = await mnemonic.toPrivateKey(mnemonicPassphrase)
        privateMnemonic = userInput
        privateKey = sdkPrivateKey.toString()
      } else {
        throw new Error('InvalidPrivateKey')
      }

      return {
        [`${this.pluginId}Mnemonic`]: privateMnemonic,
        [`${this.pluginId}Key`]: privateKey
      }
    } catch (e) {
      throw new Error('InvalidPrivateKey')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === this.pluginId) {
      if (
        walletInfo.keys == null ||
        walletInfo.keys?.[`${this.pluginId}Key`] == null
      ) {
        throw new Error('Invalid private key')
      }

      const privateKey = hedera.Ed25519PrivateKey.fromString(
        walletInfo.keys[`${this.pluginId}Key`]
      )

      return {
        publicKey: privateKey.publicKey.toString()
      }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const {
      edgeParsedUri,
      edgeParsedUri: { publicAddress }
    } = this.parseUriCommon(
      this.currencyInfo,
      uri,
      { [`${this.pluginId}`]: true },
      this.currencyInfo.currencyCode
    )

    if (publicAddress != null) {
      const { checksumNetworkId } =
        this.currencyInfo.defaultSettings.otherSettings
      const [address, checksum] = publicAddress.split('-')
      if (
        !validAddress(publicAddress) ||
        (checksum != null &&
          checksum !== createChecksum(address, checksumNetworkId))
      )
        throw new Error('InvalidPublicAddressError')
    }

    return edgeParsedUri
  }

  async encodeUri(obj: EdgeEncodeUri): Promise<string> {
    const { publicAddress, nativeAmount } = obj
    if (!validAddress(publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }

    if (nativeAmount == null || typeof nativeAmount !== 'string') {
      // don't encode as a URI, just return the public address
      return publicAddress
    }

    const denom = getDenomInfo(
      this.currencyInfo,
      this.currencyInfo.currencyCode
    )
    if (denom == null) {
      throw new Error('InternalErrorInvalidCurrencyCode')
    }
    const amount = bns.div(nativeAmount, denom.multiplier, 8)

    return this.encodeUriCommon(obj, this.pluginId, amount)
  }
}

export function makeHederaPluginInner(
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo
): EdgeCurrencyPlugin {
  const { io } = opts

  let toolsPromise: Promise<HederaPlugin>

  function makeCurrencyTools(): Promise<HederaPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new HederaPlugin(io, currencyInfo))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()

    const currencyEngine = new HederaEngine(
      tools,
      walletInfo,
      opts,
      io,
      currencyInfo
    )

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  const otherMethods = getOtherMethods(opts, currencyInfo)

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools,
    otherMethods
  }
}
