/**
 * Created by paul on 8/8/17.
 */
// @flow

import { bns } from 'biggystring'
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeMetaToken,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'
import EthereumUtil from 'ethereumjs-util'
import hdKey from 'ethereumjs-wallet/hdkey'

import { CurrencyPlugin } from '../common/plugin.js'
import { getDenomInfo } from '../common/utils.js'
import { EthereumEngine } from './ethEngine.js'

export { calcMiningFee } from './ethMiningFees.js' // may be tricky for RSK

export class EthereumPlugin extends CurrencyPlugin {
  constructor(io: EdgeIo, currencyInfo: EdgeCurrencyInfo) {
    super(io, currencyInfo.pluginName, currencyInfo)
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    const { pluginName } = this.currencyInfo
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(userInput)) {
      // It looks like a private key, so validate the hex:
      const keyBuffer = Buffer.from(userInput.replace(/^0x/, ''), 'hex')
      if (!EthereumUtil.isValidPrivate(keyBuffer)) {
        throw new Error('Invalid private key')
      }
      const hexKey = keyBuffer.toString('hex')

      // Validate the address derivation:
      const keys = {
        [`${pluginName}Key`]: hexKey
      }
      this.derivePublicKey({
        type: `wallet:${pluginName}`,
        id: 'fake',
        keys
      })
      return keys
    } else {
      // it looks like a mnemonic, so validate that way:
      if (!validateMnemonic(userInput)) {
        // "input" instead of "mnemonic" in case private key
        // was just the wrong length
        throw new Error('Invalid input')
      }
      const hexKey = await this._mnemonicToHex(userInput)
      return {
        [`${pluginName}Mnemonic`]: userInput,
        [`${pluginName}Key`]: hexKey
      }
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type !== this.currencyInfo.pluginName) {
      throw new Error('InvalidWalletType')
    }

    const mnemonicKey = generateMnemonic(128)
      .split(',')
      .join(' ')

    const hexKey = await this._mnemonicToHex(mnemonicKey) // will not have 0x in it
    return {
      [`${this.currencyInfo.pluginName}Mnemonic`]: mnemonicKey,
      [`${this.currencyInfo.pluginName}Key`]: hexKey
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const { pluginName, defaultSettings } = this.currencyInfo
    const { hdPathCoinType } = defaultSettings.otherSettings
    if (walletInfo.type !== `wallet:${pluginName}`) {
      throw new Error('Invalid wallet type')
    }
    let address
    if (walletInfo.keys[`${pluginName}Mnemonic`] != null) {
      // If we have a mnemonic, use that:
      const seedBuffer = mnemonicToSeedSync(
        walletInfo.keys[`${pluginName}Mnemonic`]
      )
      const hdwallet = hdKey.fromMasterSeed(seedBuffer)
      const walletHdpath = `m/44'/${hdPathCoinType}'/0'/0/`
      const walletPathDerivation = hdwallet.derivePath(walletHdpath + 0)
      const wallet = walletPathDerivation.getWallet()
      const publicKey = wallet.getPublicKey()
      address = `0x${EthereumUtil.pubToAddress(publicKey).toString('hex')}`
    } else {
      // Otherwise, use the private key:
      const keyBuffer = Buffer.from(
        walletInfo.keys[`${pluginName}Key`].replace(/^0x/, ''),
        'hex'
      )
      if (!EthereumUtil.isValidPrivate(keyBuffer)) {
        throw new Error('Invalid private key')
      }
      address = `0x${EthereumUtil.privateToAddress(keyBuffer).toString('hex')}`
    }
    if (!EthereumUtil.isValidAddress(address)) {
      throw new Error('Invalid address')
    }
    return { publicKey: address }
  }

  async _mnemonicToHex(mnemonic: string): Promise<string> {
    const { defaultSettings } = this.currencyInfo
    const { hdPathCoinType } = defaultSettings.otherSettings
    const hdwallet = hdKey.fromMasterSeed(mnemonicToSeedSync(mnemonic))
    const walletHdpath = `m/44'/${hdPathCoinType}'/0'/0/`
    const walletPathDerivation = hdwallet.derivePath(walletHdpath + 0)
    const wallet = walletPathDerivation.getWallet()
    const privKey = wallet.getPrivateKeyString().replace(/^0x/, '')
    return privKey
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: Array<EdgeMetaToken>
  ): Promise<EdgeParsedUri> {
    const networks = {}
    this.currencyInfo.defaultSettings.otherSettings.uriNetworks.forEach(
      network => {
        networks[network] = true
      }
    )

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      currencyCode || this.currencyInfo.currencyCode,
      customTokens
    )
    let address = ''
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
    }

    let [prefix, contractAddress] = address.split('-') // Split the address to get the prefix according to EIP-681
    // If contractAddress is null or undefined it means there is no prefix
    if (!contractAddress) {
      contractAddress = prefix // Set the contractAddress to be the prefix when the prefix is missing.
      prefix = 'pay' // The default prefix according to EIP-681 is "pay"
    }
    address = contractAddress
    // TODO: add chainId 30 to isValidAddress when included EIP-1191 and remove toLowerCase
    const valid = EthereumUtil.isValidAddress(address.toLowerCase() || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    if (prefix === 'token' || prefix === 'token_info') {
      if (!parsedUri.query) throw new Error('InvalidUriError')

      const currencyCode = parsedUri.query.symbol || 'SYM'
      if (currencyCode.length < 2 || currencyCode.length > 5) {
        throw new Error('Wrong Token symbol')
      }
      const currencyName = parsedUri.query.name || currencyCode
      const decimalsInput = parsedUri.query.decimals || '18'
      let multiplier = '1000000000000000000'
      const decimals = parseInt(decimalsInput)
      if (decimals < 0 || decimals > 18) {
        throw new Error('Wrong number of decimals')
      }
      multiplier = '1' + '0'.repeat(decimals)

      const type =
        parsedUri.query.type ||
        this.currencyInfo.defaultSettings.otherSettings.ercTokenStandard

      const edgeParsedUriToken: EdgeParsedUri = {
        token: {
          currencyCode,
          contractAddress,
          currencyName,
          multiplier,
          denominations: [{ name: currencyCode, multiplier }],
          type: type.toUpperCase()
        }
      }
      return edgeParsedUriToken
    }
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: Array<EdgeMetaToken>
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj
    const valid = EthereumUtil.isValidAddress(publicAddress.toLowerCase())
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        this.currencyInfo,
        currencyCode || this.currencyInfo.currencyCode,
        customTokens
      )
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = this.encodeUriCommon(
      obj,
      this.currencyInfo.pluginName,
      amount
    )
    return encodedUri
  }
}

export function makeEthereumBasedPluginInner(
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo
): EdgeCurrencyPlugin {
  const { io, initOptions } = opts

  let toolsPromise: Promise<EthereumPlugin>
  function makeCurrencyTools(): Promise<EthereumPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new EthereumPlugin(io, currencyInfo))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new EthereumEngine(
      tools,
      walletInfo,
      initOptions,
      opts,
      currencyInfo
    )

    // Do any async initialization necessary for the engine
    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    // Initialize otherData defaults if they weren't on disk
    if (!currencyEngine.otherData.nextNonce) {
      currencyEngine.otherData.nextNonce = '0'
    }
    if (!currencyEngine.otherData.unconfirmedNextNonce) {
      currencyEngine.otherData.unconfirmedNextNonce = '0'
    }
    if (!currencyEngine.otherData.networkFees) {
      currencyEngine.otherData.networkFees =
        currencyInfo.defaultSettings.otherSettings.defaultNetworkFees
    }

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
