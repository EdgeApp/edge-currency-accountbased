import { ChainRegistryFetcher } from '@chain-registry/client'
import type { Chain } from '@chain-registry/types'
import { stringToPath } from '@cosmjs/crypto'
import { fromBech32 } from '@cosmjs/encoding'
import { DirectSecp256k1HdWallet, Registry } from '@cosmjs/proto-signing'
import { div } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
import { chains } from 'chain-registry'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { asMaybeContractLocation, validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import { upgradeRegistryAndCreateMethods } from './cosmosRegistry'
import {
  asCosmosPrivateKeys,
  asSafeCosmosWalletInfo,
  CosmosClients,
  CosmosInfoPayload,
  CosmosMethods,
  CosmosNetworkInfo
} from './cosmosTypes'
import { createCosmosClients, rpcWithApiKey } from './cosmosUtils'

export class CosmosTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: CosmosNetworkInfo
  clients?: CosmosClients
  clientCount: number
  methods: CosmosMethods
  registry: Registry
  initOptions: JsonObject
  chainData: Chain

  constructor(env: PluginEnvironment<CosmosNetworkInfo>) {
    const { builtinTokens, currencyInfo, initOptions, io, networkInfo } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.networkInfo = networkInfo
    this.initOptions = initOptions
    this.clientCount = 0
    const { methods, registry } = upgradeRegistryAndCreateMethods(
      currencyInfo.pluginId
    )
    this.methods = methods
    this.registry = registry
    const { chainId, url } = this.networkInfo.chainInfo
    const chainData = chains.find(
      chain => chain.chain_id === chainId && chain.network_type === 'mainnet'
    )
    if (chainData == null) {
      throw new Error('Unknown chain')
    }
    this.chainData = chainData
    const chainUpdater = new ChainRegistryFetcher()
    chainUpdater
      .fetch(url)
      .then(() => {
        this.chainData = chainUpdater.getChain(this.chainData.chain_name)
      })
      .catch(e => {
        // failure is ok
      })
  }

  async createSigner(mnemonic: string): Promise<DirectSecp256k1HdWallet> {
    const { bech32AddressPrefix, bip39Path } = this.networkInfo
    const path = stringToPath(bip39Path)
    const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      hdPaths: [path],
      prefix: bech32AddressPrefix
    })
    return signer
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asCosmosPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.mnemonic
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeCosmosWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    const isValid = validateMnemonic(input)
    if (!isValid) throw new Error('Invalid mnemonic')

    // Test it
    await this.createSigner(input)

    return { [this.networkInfo.pluginMnemonicKeyName]: input }
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const entropy = Buffer.from(this.io.random(32))
    const mnemonic = entropyToMnemonic(entropy)

    return await this.importPrivateKey(mnemonic)
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const { mnemonic } = asCosmosPrivateKeys(this.currencyInfo.pluginId)(
      walletInfo.keys
    )
    const signer = await this.createSigner(mnemonic)
    const accountInfos = await signer.getAccounts()
    const { address, /* algo */ pubkey } = accountInfos[0]
    const publicKey = base16.stringify(pubkey)

    return { bech32Address: address, publicKey }
  }

  isValidOurAddress(address: string): boolean {
    try {
      const pubkey = fromBech32(address)
      if (pubkey.prefix === this.networkInfo.bech32AddressPrefix) {
        return true
      }
    } catch (e) {}
    return false
  }

  isValidTargetAddress(address: string): boolean {
    try {
      const pubkey = fromBech32(address)
      const matchingChain = chains.find(
        chain => chain.bech32_prefix === pubkey.prefix
      )
      if (matchingChain != null) return true
    } catch (e) {}
    return false
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true }

    const { parsedUri, edgeParsedUri } = parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      this.builtinTokens,
      currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    )

    let address = ''

    if (edgeParsedUri.publicAddress != null) {
      address = edgeParsedUri.publicAddress
    }

    if (!this.isValidTargetAddress(address))
      throw new Error('InvalidPublicAddressError')

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!this.isValidOurAddress(publicAddress))
      throw new Error('InvalidPublicAddressError')

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
    const encodedUri = encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }

  async connectClient(): Promise<void> {
    if (this.clients == null) {
      this.clients = await createCosmosClients(
        this.io.fetchCors,
        rpcWithApiKey(this.networkInfo.rpcNode, this.initOptions)
      )
    }
    ++this.clientCount
  }

  async disconnectClient(): Promise<void> {
    --this.clientCount
    if (this.clientCount === 0) {
      await this.clients?.stargateClient?.disconnect()
      this.clients = undefined
    }
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const { contractAddress } =
      asMaybeContractLocation(token.networkLocation) ?? {}

    // Regexes inspired by a general regex in https://github.com/cosmos/cosmos-sdk
    // Broken up to more tightly enforce the rules for each type of asset so the entered value matches what a node would expect
    const ibcDenomRegex = /^ibc\/[0-9A-F]{64}$/
    const nativeDenomRegex = /^(?!ibc)[a-z][a-z0-9/]{2,127}/

    if (
      contractAddress == null ||
      (!ibcDenomRegex.test(contractAddress) &&
        !nativeDenomRegex.test(contractAddress))
    ) {
      throw new Error('ErrorInvalidContractAddress')
    }

    return contractAddress.toLowerCase().replace(/\//g, '')
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<CosmosNetworkInfo>
): Promise<CosmosTools> {
  return new CosmosTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<CosmosNetworkInfo>,
  infoPayload: CosmosInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './CosmosEngine'
