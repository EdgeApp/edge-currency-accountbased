/**
 * Created by paul on 8/8/17.
 */

import { getLocalStorage } from '@walletconnect/browser-utils'
import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeWalletInfo
} from 'edge-core-js/types'
import EthereumUtil from 'ethereumjs-util'
import hdKey from 'ethereumjs-wallet/hdkey'

import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { biggyScience, getDenomInfo, getFetchCors } from '../common/utils'
import { EthereumEngine } from './ethEngine'
import { ethPlugins } from './ethInfos'

export class EthereumTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo

  constructor(io: EdgeIo, currencyInfo: EdgeCurrencyInfo) {
    this.io = io
    this.currencyInfo = currencyInfo
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const { pluginMnemonicKeyName, pluginRegularKeyName } =
      this.currencyInfo.defaultSettings.otherSettings
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(userInput)) {
      // It looks like a private key, so validate the hex:
      const keyBuffer = Buffer.from(userInput.replace(/^0x/, ''), 'hex')
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!EthereumUtil.isValidPrivate(keyBuffer)) {
        throw new Error('Invalid private key')
      }
      const hexKey = keyBuffer.toString('hex')

      // Validate the address derivation:
      const keys = {
        [pluginRegularKeyName]: hexKey
      }
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
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
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!EthereumUtil.isValidPrivate(keyBuffer)) {
        throw new Error('Invalid private key')
      }
      address = `0x${EthereumUtil.privateToAddress(keyBuffer).toString('hex')}`
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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
    // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
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
      // @ts-expect-error
      network => {
        // @ts-expect-error
        networks[network] = true
      }
    )

    const { parsedUri, edgeParsedUri } = parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
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
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
      edgeParsedUri.publicAddress = edgeParsedUri.publicAddress.toLowerCase()
    }

    let [prefix, contractAddress] = address.split('-') // Split the address to get the prefix according to EIP-681
    // If contractAddress is null or undefined it means there is no prefix
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!contractAddress) {
      contractAddress = prefix // Set the contractAddress to be the prefix when the prefix is missing.
      prefix = 'pay' // The default prefix according to EIP-681 is "pay"
    }
    address = contractAddress

    // Verify checksum if it's present in the address
    if (
      /[A-F]/.test(address) &&
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !EthereumUtil.isValidChecksumAddress(address)
    ) {
      throw new Error('InvalidPublicAddressError')
    }

    // Verify address is valid
    address = address.toLowerCase()
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!EthereumUtil.isValidAddress(address || '')) {
      throw new Error('InvalidPublicAddressError')
    }

    // Parse according to EIP-961
    if (prefix === 'token' || prefix === 'token_info') {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!parsedUri.query) throw new Error('InvalidUriError')

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const currencyCode = parsedUri.query.symbol ?? 'SYM'
      if (currencyCode.length < 2 || currencyCode.length > 5) {
        throw new Error('Wrong Token symbol')
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const currencyName = parsedUri.query.name ?? currencyCode
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      const decimalsInput = parsedUri.query.decimals ?? '18'
      let multiplier = '1000000000000000000'
      const decimals = parseInt(decimalsInput)
      if (decimals < 0 || decimals > 18) {
        throw new Error('Wrong number of decimals')
      }
      multiplier = '1' + '0'.repeat(decimals)

      const type =
        parsedUri.query.type ??
        this.currencyInfo.defaultSettings.otherSettings.ercTokenStandard

      const edgeParsedUriToken: EdgeParsedUri = {
        token: {
          currencyCode,
          contractAddress: contractAddress.toLowerCase(),
          currencyName,
          // @ts-expect-error
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
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!EthereumUtil.isValidAddress(publicAddress)) {
            throw new Error('InvalidPublicAddressError')
          }
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        this.currencyInfo,
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
        currencyCode || this.currencyInfo.currencyCode,
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getSplittableTypes(walletInfo: EdgeWalletInfo): string[] {
    return Object.keys(ethPlugins).map(plugin => `wallet:${plugin}`)
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    const contractAddress = token?.networkLocation?.contractAddress
    if (
      contractAddress == null ||
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !EthereumUtil.isValidAddress(contractAddress)
    ) {
      throw new Error('ErrorInvalidContractAddress')
    }
    return contractAddress.toLowerCase()
  }
}

export function makeEthereumBasedPluginInner(
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo
): EdgeCurrencyPlugin {
  const { io, initOptions } = opts
  const fetchCors = getFetchCors(opts)

  let toolsPromise: Promise<EthereumTools>
  async function makeCurrencyTools(): Promise<EthereumTools> {
    if (toolsPromise != null) return await toolsPromise
    toolsPromise = Promise.resolve(new EthereumTools(io, currencyInfo))

    // FIXME: This clears locally stored walletconnect sessions that would otherwise prevent
    // a user from reconnecting to an "active" but invisible connection. Future enhancement
    // will restore these active sessions to the GUI
    const wcStorage = getLocalStorage()
    if (wcStorage != null) wcStorage.clear()

    return await toolsPromise
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

    // This is just to make sure otherData is Flow checked
    // @ts-expect-error
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    // Initialize otherData defaults if they weren't on disk
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!currencyEngine.otherData.nextNonce) {
      currencyEngine.otherData.nextNonce = '0'
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!currencyEngine.otherData.unconfirmedNextNonce) {
      currencyEngine.otherData.unconfirmedNextNonce = '0'
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!currencyEngine.otherData.networkFees) {
      currencyEngine.otherData.networkFees = {
        ...currencyInfo.defaultSettings.otherSettings.defaultNetworkFees
      }
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
