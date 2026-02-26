import { getMetadataAccountDataSerializer } from '@metaplex-foundation/mpl-token-metadata'
import { unpackMint } from '@solana/spl-token'
import {
  Connection,
  ConnectionConfig,
  FetchFn,
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
  EdgeFetchFunction,
  EdgeGetTokenDetailsFilter,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { asyncWaterfall } from '../common/promiseUtils'
import { validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  asSafeSolanaWalletInfo,
  asSolanaInitOptions,
  asSolanaNetworkLocation,
  asSolanaPrivateKeys,
  SolanaInfoPayload,
  SolanaInitOptions,
  SolanaNetworkInfo
} from './solanaTypes'

export class SolanaTools implements EdgeCurrencyTools {
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo
  log: EdgeLog
  networkInfo: SolanaNetworkInfo
  initOptions: SolanaInitOptions
  connections: Connection[]
  archiveConnections: Connection[]
  clientCount: number
  tokenProgramPublicKey: PublicKey
  token2022ProgramPublicKey: PublicKey

  constructor(env: PluginEnvironment<SolanaNetworkInfo>) {
    const { currencyInfo, io, log, networkInfo } = env
    this.currencyInfo = currencyInfo
    this.io = io
    this.log = log
    this.networkInfo = networkInfo
    this.initOptions = asSolanaInitOptions(env.initOptions)
    this.connections = []
    this.archiveConnections = []
    this.clientCount = 0
    this.tokenProgramPublicKey = new PublicKey(networkInfo.tokenPublicKey)
    this.token2022ProgramPublicKey = new PublicKey(
      networkInfo.token2022PublicKey
    )
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
      // Some fixup
      return {
        [`${pluginId}Mnemonic`]: input,
        [`${pluginId}Key`]: Buffer.from(keypair.secretKey).toString('hex'),
        publicKey: keypair.publicKey.toBase58()
      }
    } else if (/^[0-9a-fA-F]{128}$/.test(input)) {
      // Handle 64-byte hex private key (128 hex characters)
      const keyBuffer = Buffer.from(input, 'hex')
      const keypair = Keypair.fromSecretKey(keyBuffer)

      return {
        [`${pluginId}Key`]: input,
        publicKey: keypair.publicKey.toBase58()
      }
    } else {
      // Try base58 format
      try {
        const bytes = bs58.decode(input)
        const keypair = Keypair.fromSecretKey(bytes)

        return {
          [`${pluginId}Base58Key`]: input,
          [`${pluginId}Key`]: Buffer.from(keypair.secretKey).toString('hex'),
          publicKey: keypair.publicKey.toBase58()
        }
      } catch (e) {
        throw new Error(
          'Invalid private key format. Expected mnemonic, base58, or hex format.'
        )
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

    const privateKeyInput =
      walletInfo.keys[`${pluginId}Mnemonic`] ??
      walletInfo.keys[`${pluginId}Base58Key`] ??
      walletInfo.keys[`${pluginId}Key`]

    if (privateKeyInput == null) {
      throw new Error('SOL: No private key found in wallet')
    }

    const keys = await this.importPrivateKey(privateKeyInput)
    return { publicKey: keys.publicKey.toString() }
  }

  private readonly isValidAddress = (address: string): boolean => {
    try {
      PublicKey.isOnCurve(new PublicKey(address).toBytes())
      return true
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

    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
      customTokens,
      testPrivateKeys: this.importPrivateKey.bind(this)
    })

    if (edgeParsedUri.privateKeys != null) {
      return edgeParsedUri
    }

    if (
      edgeParsedUri.publicAddress != null &&
      !this.isValidAddress(edgeParsedUri.publicAddress)
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

    if (!this.isValidAddress(publicAddress))
      throw new Error('InvalidPublicAddressError')

    let amount
    if (typeof nativeAmount === 'string') {
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
    const encodedUri = encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }

  rpcWithApiKey(serverUrl: string): string {
    const apiKeys = this.initOptions as {
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

  makeConnections(rpcUrls: string[]): Connection[] {
    const engineFetchBypassed: EdgeFetchFunction = async (uri, opts) =>
      await this.io.fetch(uri, {
        ...opts,
        corsBypass: 'always'
      })
    const connectionConfig: ConnectionConfig = {
      commitment: this.networkInfo.commitment,
      fetch: engineFetchBypassed as FetchFn
    }

    const out: Connection[] = []
    for (const url of rpcUrls) {
      try {
        const connection = new Connection(
          this.rpcWithApiKey(url),
          connectionConfig
        )
        out.push(connection)
      } catch (e) {
        this.log.warn('Error creating connection', e)
      }
    }
    return out
  }

  async connectClient(): Promise<void> {
    if (this.clientCount === 0) {
      this.connections = this.makeConnections(this.networkInfo.rpcNodes)
      this.archiveConnections = this.makeConnections(
        this.networkInfo.rpcNodesArchival
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

  async getTokenDetails(
    filter: EdgeGetTokenDetailsFilter
  ): Promise<EdgeToken[]> {
    const { contractAddress } = filter
    if (contractAddress == null) return []

    if (!this.isValidAddress(contractAddress)) {
      throw new Error('ErrorInvalidContractAddress')
    }

    const connections = this.makeConnections(this.networkInfo.rpcNodes)

    return await new Promise(resolve => {
      const _getTokenDetails = async (): Promise<void> => {
        const tokenProgramFuncs = connections.map(connection => async () => {
          const info = await connection.getAccountInfo(
            new PublicKey(contractAddress)
          )
          if (info == null) {
            resolve([])
            return
          }

          const unpackedMint = unpackMint(
            new PublicKey(contractAddress),
            info,
            new PublicKey(info.owner)
          )

          return {
            tokenProgram: info.owner.toBase58(),
            decimals: unpackedMint.decimals
          }
        })

        const mintPublicKey = new PublicKey(contractAddress)
        const metadataPublicKey = new PublicKey(
          'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
        )
        const [metadataPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('metadata'),
            metadataPublicKey.toBuffer(),
            mintPublicKey.toBuffer()
          ],
          metadataPublicKey
        )
        const tokenNameAndSymbolFuncs = connections.map(
          connection => async () => {
            const accountInfo = await connection.getAccountInfo(metadataPDA)
            if (accountInfo == null) {
              resolve([])
              return
            }

            const serializer = getMetadataAccountDataSerializer()
            const [metadata] = serializer.deserialize(accountInfo.data)

            return {
              name: metadata.name,
              symbol: metadata.symbol
            }
          }
        )

        const { tokenProgram, decimals } = await asyncWaterfall(
          tokenProgramFuncs
        )
        const { name, symbol } = await asyncWaterfall(tokenNameAndSymbolFuncs)

        const token: EdgeToken = {
          currencyCode: symbol,
          denominations: [
            { name: symbol, multiplier: '1' + '0'.repeat(decimals) }
          ],
          displayName: name,
          networkLocation: {
            contractAddress,
            tokenProgram
          }
        }
        resolve([token])
      }
      _getTokenDetails().catch(() => resolve([]))
    })
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const cleanLocation = asSolanaNetworkLocation(token.networkLocation)
    if (
      cleanLocation == null ||
      !this.isValidAddress(cleanLocation.contractAddress)
    ) {
      throw new Error('ErrorInvalidContractAddress')
    }
    return cleanLocation.contractAddress
  }

  getTokenOwnerPublicKey(token: EdgeToken): PublicKey {
    const cleanLocation = asSolanaNetworkLocation(token.networkLocation)
    const { tokenProgram = this.networkInfo.tokenPublicKey } = cleanLocation

    return tokenProgram === this.networkInfo.tokenPublicKey
      ? this.tokenProgramPublicKey
      : tokenProgram === this.networkInfo.token2022PublicKey
      ? this.token2022ProgramPublicKey
      : new PublicKey(tokenProgram)

    // TODO: If the key is undefined, look it up on the network,
    // but with some sort of cache so we don't hit this endlessly:
    // const connections = (this.connections = this.makeConnections(
    //   this.networkInfo.rpcNodes
    // ))
    // const funcs = connections.map(connection => async () => {
    //   const info = await connection.getAccountInfo(
    //     new PublicKey(cleanLocation.contractAddress)
    //   )
    //   if (info == null) {
    //     throw new Error('ErrorInvalidContractAddress')
    //   }
    //   return info.owner.toBase58()
    // })
    // const owner: string = await asyncWaterfall(funcs)
    // return new PublicKey(owner)
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
