import {
  Connection,
  ConnectionConfig,
  Keypair,
  PublicKey
} from '@solana/web3.js'
import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
import bs58 from 'bs58'
import { Buffer } from 'buffer'
import * as ed25519 from 'ed25519-hd-key'
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
import {
  asSafeSolanaWalletInfo,
  asSolanaInitOptions,
  asSolanaPrivateKeys,
  SolanaInfoPayload,
  SolanaInitOptions,
  SolanaNetworkInfo
} from './solanaTypes'

export class SolanaTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo
  networkInfo: SolanaNetworkInfo
  initOptions: SolanaInitOptions
  connections: Connection[]
  archiveConnections: Connection[]
  clientCount: number

  constructor(env: PluginEnvironment<SolanaNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo
    this.initOptions = asSolanaInitOptions(env.initOptions)
    this.connections = []
    this.archiveConnections = []
    this.clientCount = 0
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asSolanaPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.mnemonic ?? keys.base58Key ?? keys.privateKey
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeSolanaWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo

    if (validateMnemonic(input)) {
      const buffer = await mnemonicToSeed(input)
      const deriveSeed = ed25519.derivePath(
        this.networkInfo.derivationPath,
        base16.stringify(buffer)
      ).key
      const keypair = Keypair.fromSeed(Uint8Array.from(deriveSeed))

      return {
        [`${pluginId}Mnemonic`]: input,
        [`${pluginId}Key`]: Buffer.from(keypair.secretKey).toString('hex'),
        publicKey: keypair.publicKey.toBase58()
      }
    } else {
      const bytes = bs58.decode(input)
      const keypair = await Keypair.fromSecretKey(bytes)

      return {
        [`${pluginId}Base58Key`]: input,
        [`${pluginId}Key`]: Buffer.from(keypair.secretKey).toString('hex'),
        publicKey: keypair.publicKey.toBase58()
      }
    }
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
    const { pluginId } = this.currencyInfo
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const keys = await this.importPrivateKey(
      walletInfo.keys[`${pluginId}Mnemonic`] ??
        walletInfo.keys[`${pluginId}Base58Key`]
    )
    return { publicKey: keys.publicKey.toString() }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true }

    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      builtinTokens: this.builtinTokens,
      currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
      customTokens,
      testPrivateKeys: this.importPrivateKey.bind(this)
    })

    if (edgeParsedUri.privateKeys != null) {
      return edgeParsedUri
    }

    if (
      edgeParsedUri.publicAddress != null &&
      !PublicKey.isOnCurve(new PublicKey(edgeParsedUri.publicAddress).toBytes())
    ) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!PublicKey.isOnCurve(new PublicKey(publicAddress).toBytes()))
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

  rpcWithApiKey(serverUrl: string): string {
    const apiKeys = asSolanaInitOptions(this.initOptions) as {
      [key: string]: string
    }
    const regex = /{{(.*)}}/g
    const match = regex.exec(serverUrl)
    if (match != null) {
      const key = match[1]
      const apiKey = apiKeys[key]
      if (typeof apiKey === 'string') {
        serverUrl = serverUrl.replace(match[0], apiKey)
      } else if (apiKey == null) {
        throw new Error(
          `Missing ${key} in 'initOptions' for ${this.currencyInfo.pluginId}`
        )
      } else {
        throw new Error('Incorrect apikey type for RPC')
      }
    }
    return serverUrl
  }

  async connectClient(): Promise<void> {
    if (this.clientCount === 0) {
      const connectionConfig: ConnectionConfig = {
        commitment: this.networkInfo.commitment,
        // @ts-expect-error our fetch is close enough to the fetch api
        fetch: this.io.fetchCors
      }
      this.connections = this.networkInfo.rpcNodes.map(
        url => new Connection(this.rpcWithApiKey(url), connectionConfig)
      )
      this.archiveConnections = this.networkInfo.rpcNodesArchival.map(
        url => new Connection(this.rpcWithApiKey(url), connectionConfig)
      )
    }
    ++this.clientCount
  }

  async disconnectClient(): Promise<void> {
    --this.clientCount
    if (this.clientCount === 0) {
      this.connections = []
      this.archiveConnections = []
    }
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const cleanLocation = asMaybeContractLocation(token.networkLocation)
    if (cleanLocation == null) {
      throw new Error('ErrorInvalidContractAddress')
    }
    return cleanLocation.contractAddress
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<SolanaNetworkInfo>
): Promise<SolanaTools> {
  return new SolanaTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<SolanaNetworkInfo>,
  infoPayload: SolanaInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './SolanaEngine'
