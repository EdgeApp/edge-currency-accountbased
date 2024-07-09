import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo
} from 'edge-core-js/types'
import EthereumUtil from 'ethereumjs-util'
import hdKey from 'ethereumjs-wallet/hdkey'
import { ethers } from 'ethers'

import { PluginEnvironment } from '../common/innerPlugin'
import { asMaybeContractLocation, validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import {
  biggyScience,
  getLegacyDenomination,
  mergeDeeply,
  multicastEthProviders
} from '../common/utils'
import { ethereumPlugins } from './ethereumInfos'
import {
  asEthereumPrivateKeys,
  asSafeEthWalletInfo,
  EthereumInfoPayload,
  EthereumInitOptions,
  EthereumNetworkInfo
} from './ethereumTypes'

export class EthereumTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo
  networkInfo: EthereumNetworkInfo
  initOptions: EthereumInitOptions

  constructor(env: PluginEnvironment<EthereumNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo, initOptions } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo
    this.initOptions = initOptions
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asEthereumPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.privateKey
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeEthWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const { pluginMnemonicKeyName, pluginRegularKeyName } = this.networkInfo
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
    const { pluginMnemonicKeyName, pluginRegularKeyName } = this.networkInfo
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
    const { pluginId } = this.currencyInfo
    const { hdPathCoinType, pluginMnemonicKeyName, pluginRegularKeyName } =
      this.networkInfo
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
      const walletHdpath = `m/44'/${hdPathCoinType}'/0'/0`
      const walletPathDerivation = hdwallet.derivePath(`${walletHdpath}/0`)
      const wallet = walletPathDerivation.getWallet()
      const publicKey = wallet.getPublicKey()
      const addressHex = EthereumUtil.pubToAddress(publicKey).toString('hex')
      address = EthereumUtil.toChecksumAddress(addressHex)
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
    const { hdPathCoinType } = this.networkInfo
    const hdwallet = hdKey.fromMasterSeed(mnemonicToSeedSync(mnemonic))
    const walletHdpath = `m/44'/${hdPathCoinType}'/0'/0`
    const walletPathDerivation = hdwallet.derivePath(`${walletHdpath}/0`)
    const wallet = walletPathDerivation.getWallet()
    const privKey = wallet.getPrivateKeyString().replace(/^0x/, '')
    return privKey
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const networks: { [uriNetwork: string]: boolean } = {}
    this.networkInfo.uriNetworks.forEach(network => {
      networks[network] = true
    })

    const { parsedUri, edgeParsedUri } = parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      this.builtinTokens,
      currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    )

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

      const type = parsedUri.query.type ?? this.networkInfo.ercTokenStandard

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

          // Get token from contract address
          const edgeToken = Object.values(this.builtinTokens).find(
            token => token.networkLocation?.contractAddress === contractAddress
          )

          // If there is a currencyCode param, the token must be found
          // and it's currency code must matching the currencyCode param.
          if (
            currencyCode != null &&
            (edgeToken == null || edgeToken.currencyCode !== currencyCode)
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
            currencyCode: edgeToken?.currencyCode,
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
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj
    const valid = EthereumUtil.isValidAddress(publicAddress)
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof nativeAmount === 'string') {
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
    const encodedUri = encodeUriCommon(obj, this.currencyInfo.pluginId, amount)
    return encodedUri
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getSplittableTypes(walletInfo: EdgeWalletInfo): string[] {
    return Object.keys(ethereumPlugins).map(plugin => `wallet:${plugin}`)
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const cleanLocation = asMaybeContractLocation(token.networkLocation)
    if (
      cleanLocation == null ||
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !EthereumUtil.isValidAddress(cleanLocation.contractAddress)
    ) {
      throw new Error('ErrorInvalidContractAddress')
    }
    return cleanLocation.contractAddress.toLowerCase().replace(/^0x/, '')
  }

  // #region otherMethods

  /**
   * Resolve an ENS name, for example: "bob.eth"
   */
  async resolveEnsName(ensName: string): Promise<string | null> {
    const { networkAdapterConfigs } = this.networkInfo

    const networkAdapterConfig = networkAdapterConfigs.find(
      networkAdapterConfig => networkAdapterConfig.type === 'rpc'
    )

    if (networkAdapterConfig == null)
      throw new Error('resolveEnsName: No RpcAdapterConfig')

    const rpcServers = networkAdapterConfig.servers

    const ethProviders: ethers.providers.JsonRpcProvider[] = rpcServers.map(
      // This call only works on Ethereum networks, hence chainId of 1
      rpcServer => new ethers.providers.JsonRpcProvider(rpcServer, 1)
    )

    return await multicastEthProviders<
      string | null,
      ethers.providers.JsonRpcProvider
    >({
      func: async (ethProvider: ethers.providers.JsonRpcProvider) =>
        await ethProvider.resolveName(ensName),
      providers: ethProviders
    })
  }

  // #endregion otherMethods
}

export async function makeCurrencyTools(
  env: PluginEnvironment<EthereumNetworkInfo>
): Promise<EthereumTools> {
  const out = new EthereumTools(env)

  return out
}

export async function updateInfoPayload(
  env: PluginEnvironment<EthereumNetworkInfo>,
  infoPayload: EthereumInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './EthereumEngine'
