/**
 * Created by paul on 8/8/17.
 */
// @flow

import { getLocalStorage } from '@walletconnect/browser-utils'
import { bns } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeFetchFunction,
  type EdgeIo,
  type EdgeMetaToken,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'
import EthereumUtil from 'ethereumjs-util'
import hdKey from 'ethereumjs-wallet/hdkey'

import { CurrencyPlugin } from '../common/plugin.js'
import { biggyScience, getDenomInfo, getFetchCors } from '../common/utils.js'
import { EthereumEngine } from './ethEngine.js'

export { calcMiningFee } from './ethMiningFees.js' // may be tricky for RSK

export class EthereumPlugin extends CurrencyPlugin {
  constructor(
    io: EdgeIo,
    currencyInfo: EdgeCurrencyInfo,
    fetchCors: EdgeFetchFunction
  ) {
    super(io, currencyInfo.pluginId, currencyInfo)
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const { pluginMnemonicKeyName, pluginRegularKeyName } =
      this.currencyInfo.defaultSettings.otherSettings
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(userInput)) {
      // It looks like a private key, so validate the hex:
      const keyBuffer = Buffer.from(userInput.replace(/^0x/, ''), 'hex')
      if (!EthereumUtil.isValidPrivate(keyBuffer)) {
        throw new Error('Invalid private key')
      }
      const hexKey = keyBuffer.toString('hex')

      // Validate the address derivation:
      const keys = {
        [pluginRegularKeyName]: hexKey
      }
      this.derivePublicKey({
        type: `wallet:${pluginId}`,
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
        [pluginMnemonicKeyName]: userInput,
        [pluginRegularKeyName]: hexKey
      }
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const { pluginMnemonicKeyName, pluginRegularKeyName } =
      this.currencyInfo.defaultSettings.otherSettings
    const type = walletType.replace('wallet:', '')

    if (type !== this.currencyInfo.pluginId) {
      throw new Error('InvalidWalletType')
    }

    const entropy = Buffer.from(this.io.random(32))
    const mnemonicKey = entropyToMnemonic(entropy)

    const hexKey = await this._mnemonicToHex(mnemonicKey) // will not have 0x in it
    return {
      [pluginMnemonicKeyName]: mnemonicKey,
      [pluginRegularKeyName]: hexKey
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const { pluginId, defaultSettings } = this.currencyInfo
    const { hdPathCoinType, pluginMnemonicKeyName, pluginRegularKeyName } =
      defaultSettings.otherSettings
    if (walletInfo.type !== `wallet:${pluginId}`) {
      throw new Error('Invalid wallet type')
    }
    let address
    if (walletInfo.keys[pluginMnemonicKeyName] != null) {
      // If we have a mnemonic, use that:
      const seedBuffer = mnemonicToSeedSync(
        walletInfo.keys[pluginMnemonicKeyName]
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
        walletInfo.keys[pluginRegularKeyName].replace(/^0x/, ''),
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
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    // By default, all EVM clones should be WalletConnect compatible.
    const networks = { wc: true }
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

    if (parsedUri.protocol === 'wc') {
      if (parsedUri.query.bridge != null && parsedUri.query.key != null) {
        edgeParsedUri.walletConnect = {
          uri,
          topic: parsedUri.pathname.split('@')[0],
          version: parsedUri.pathname.split('@')[1],
          bridge: parsedUri.query.bridge,
          key: parsedUri.query.key
        }
        return edgeParsedUri
      } else throw new Error('MissingWcBridgeKey')
    }

    let address = ''
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
      edgeParsedUri.publicAddress = edgeParsedUri.publicAddress.toLowerCase()
    }

    let [prefix, contractAddress] = address.split('-') // Split the address to get the prefix according to EIP-681
    // If contractAddress is null or undefined it means there is no prefix
    if (!contractAddress) {
      contractAddress = prefix // Set the contractAddress to be the prefix when the prefix is missing.
      prefix = 'pay' // The default prefix according to EIP-681 is "pay"
    }
    address = contractAddress

    // Verify checksum if it's present in the address
    if (
      /[A-F]/.test(address) &&
      !EthereumUtil.isValidChecksumAddress(address)
    ) {
      throw new Error('InvalidPublicAddressError')
    }

    // Verify address is valid
    address = address.toLowerCase()
    if (!EthereumUtil.isValidAddress(address || '')) {
      throw new Error('InvalidPublicAddressError')
    }

    // Parse according to EIP-961
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
          contractAddress: contractAddress.toLowerCase(),
          currencyName,
          multiplier,
          denominations: [{ name: currencyCode, multiplier }],
          type: type.toUpperCase()
        }
      }
      return edgeParsedUriToken
    }

    // Parse according to EIP-681
    if (prefix === 'pay') {
      const targetAddress = address
      const functionName = parsedUri.pathname.split('/')[1]
      const parameters = parsedUri.query

      // Handle contract function invocations
      // This is a very important measure to prevent accidental payment to contract addresses
      switch (functionName) {
        // ERC-20 token transfer
        case 'transfer': {
          const publicAddress = parameters.address ?? ''
          const contractAddress = targetAddress ?? ''
          const nativeAmount =
            parameters.uint256 != null
              ? biggyScience(parameters.uint256)
              : edgeParsedUri.nativeAmount

          // Get meta token from contract address
          const metaToken = this.currencyInfo.metaTokens.find(
            metaToken => metaToken.contractAddress === contractAddress
          )

          // If there is a currencyCode param, the metaToken must be found
          // and it's currency code must matching the currencyCode param.
          if (
            currencyCode != null &&
            (metaToken == null || metaToken.currencyCode !== currencyCode)
          ) {
            throw new Error('InternalErrorInvalidCurrencyCode')
          }

          // Validate addresses
          if (!EthereumUtil.isValidAddress(publicAddress)) {
            throw new Error('InvalidPublicAddressError')
          }
          if (!EthereumUtil.isValidAddress(contractAddress)) {
            throw new Error('InvalidContractAddressError')
          }

          return {
            ...edgeParsedUri,
            currencyCode: metaToken?.currencyCode,
            nativeAmount,
            publicAddress
          }
        }
        // ETH payment
        case undefined: {
          const publicAddress = targetAddress
          const nativeAmount =
            parameters.value != null
              ? biggyScience(parameters.value)
              : edgeParsedUri.nativeAmount

          return { ...edgeParsedUri, publicAddress, nativeAmount }
        }
        default: {
          throw new Error('UnsupportedContractFunction')
        }
      }
    }

    throw new Error('InvalidUriError')
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj
    const valid = EthereumUtil.isValidAddress(publicAddress)
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
      this.currencyInfo.pluginId,
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
  const fetchCors = getFetchCors(opts)

  let toolsPromise: Promise<EthereumPlugin>
  function makeCurrencyTools(): Promise<EthereumPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(
      new EthereumPlugin(io, currencyInfo, fetchCors)
    )

    // FIXME: This clears locally stored walletconnect sessions that would otherwise prevent
    // a user from reconnecting to an "active" but invisible connection. Future enhancement
    // will restore these active sessions to the GUI
    const wcStorage = getLocalStorage()
    if (wcStorage != null) wcStorage.clear()

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
      currencyInfo,
      fetchCors
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
