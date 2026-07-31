import { fromHex } from '@mysten/bcs'
import { SuiClient, SuiHTTPTransport } from '@mysten/sui/client'
import {
  decodeSuiPrivateKey,
  encodeSuiPrivateKey
} from '@mysten/sui/cryptography'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'
import { isValidSuiAddress, parseStructTag } from '@mysten/sui/utils'
import { div } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
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
import { base16, base64 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { asyncStaggeredRace, promiseAny, timeout } from '../common/promiseUtils'
import { asMaybeContractLocation, validateToken } from '../common/tokenHelpers'
import { asSafeCommonWalletInfo } from '../common/types'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import {
  getLegacyDenomination,
  mergeDeeply,
  shuffleArray,
  snooze
} from '../common/utils'
import { asSuiPrivateKeys, SuiInfoPayload, SuiNetworkInfo } from './suiTypes'

/**
 * Ceiling on a single node's response. `asyncStaggeredRace` has no timeout of
 * its own: a node that accepts the connection but never answers is neither
 * resolved nor failed, so without this the race can never settle, and the
 * engine's polling loop would stop rescheduling for the rest of the session.
 */
const RPC_TIMEOUT_MS = 10000

/** Gap before the race brings the next node in alongside the current one. */
const STAGGER_INTERVAL_MS = 1000

export class SuiTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  initOptions: JsonObject

  private readonly env: PluginEnvironment<SuiNetworkInfo>
  private readonly clients = new Map<string, SuiClient>()

  /** Earliest time each node may be called again, keyed by URL. */
  private readonly nextSlot = new Map<string, number>()

  constructor(env: PluginEnvironment<SuiNetworkInfo>) {
    const { builtinTokens, currencyInfo, initOptions, io } = env
    this.env = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.initOptions = initOptions
  }

  /**
   * Read through `env` instead of copying in the constructor. `makeCurrencyTools`
   * runs *before* `updateInfoPayload`, so a copy taken here would freeze the
   * built-in defaults and silently ignore anything the info server sends.
   */
  get networkInfo(): SuiNetworkInfo {
    return this.env.networkInfo
  }

  get rpcNodes(): string[] {
    return this.networkInfo.rpcNodes
  }

  get rpcNodesArchival(): string[] {
    return this.networkInfo.rpcNodesArchival
  }

  getClient(url: string): SuiClient {
    let client = this.clients.get(url)
    if (client == null) {
      client = new SuiClient({
        transport: new SuiHTTPTransport({
          url,
          fetch: this.io.fetch as typeof fetch
        })
      })
      this.clients.set(url, client)
    }
    return client
  }

  /**
   * Spaces calls to a single node. `SuiTools` is one instance per plugin, so
   * every wallet in the app shares these slots: one wallet is latency-bound
   * far below the limit, but several syncing at once would otherwise stack up
   * against a provider's limiter from a single IP.
   */
  private async throttle(url: string): Promise<void> {
    const gapMs = 1000 / this.networkInfo.maxRequestsPerSecond
    const now = Date.now()
    const slot = Math.max(now, this.nextSlot.get(url) ?? 0)
    this.nextSlot.set(url, slot + gapMs)
    if (slot > now) await snooze(slot - now)
  }

  /** Run `fn` against one node, throttled and time-boxed. */
  async callRpc<T>(
    url: string,
    fn: (client: SuiClient) => Promise<T>
  ): Promise<T> {
    await this.throttle(url)
    return await timeout(
      fn(this.getClient(url)),
      RPC_TIMEOUT_MS,
      new Error(`Sui RPC timed out: ${url}`)
    )
  }

  /**
   * Race `fn` across nodes, staggered. Shuffled because the race only reaches
   * past the first node when that one is slow or failing, so a fixed order
   * would send every healthy request to one provider and leave the rest as
   * untested spares.
   */
  async raceRpc<T>(
    urls: string[],
    fn: (client: SuiClient) => Promise<T>
  ): Promise<T> {
    this.assertNodes(urls)
    const funcs = shuffleArray([...urls]).map(
      url => async () => await this.callRpc(url, fn)
    )
    return await asyncStaggeredRace(funcs, STAGGER_INTERVAL_MS)
  }

  /**
   * Run `fn` against every node at once, resolving on the first success. For
   * idempotent writes, where submitting more than once is harmless and
   * redundancy matters more than choosing a single node.
   */
  async blastRpc<T>(
    urls: string[],
    fn: (client: SuiClient) => Promise<T>
  ): Promise<T> {
    this.assertNodes(urls)
    return await promiseAny(urls.map(async url => await this.callRpc(url, fn)))
  }

  /**
   * An empty list is a misconfiguration rather than a failure to retry, and
   * it has to be caught before `promiseAny`, which never settles when handed
   * zero promises.
   */
  private assertNodes(urls: string[]): void {
    if (urls.length === 0) {
      throw new Error(
        `No Sui RPC nodes configured for ${this.currencyInfo.pluginId}`
      )
    }
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asSuiPrivateKeys(pluginId)(privateWalletInfo.keys)
    if (keys.mnemonic != null) return keys.mnemonic
    if (keys.displayKey != null) return keys.displayKey
    if (keys.privateKey != null) return keys.privateKey
    throw new Error('NoPrivateKey')
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeCommonWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo

    const isMnemonic = validateMnemonic(input)

    if (isMnemonic) {
      // Derive keypair to validate the mnemonic and to obtain the secret key bytes
      const keyPair = Ed25519Keypair.deriveKeypair(input)
      const secretKeyHex = Buffer.from(keyPair.getSecretKey() as any).toString(
        'hex'
      )

      return {
        [`${pluginId}Mnemonic`]: input,
        [`${pluginId}Key`]: secretKeyHex
      }
    }

    // Try Bech32-encoded Sui private key (suiprivkey1...)
    try {
      const { schema, secretKey } = decodeSuiPrivateKey(input)
      // Extra safety: construct keypair
      Ed25519Keypair.fromSecretKey(secretKey)

      const secretKeyHex = base16.stringify(secretKey).toLowerCase()
      return {
        [`${pluginId}Key`]: secretKeyHex,
        [`${pluginId}KeyDisplay`]: encodeSuiPrivateKey(secretKey, schema)
      }
    } catch (error) {}

    // Fallback: allow importing a raw hex private key (exactly 32 bytes)
    if (/^(?:0x)?[0-9a-fA-F]{64}$/.test(input)) {
      const hex = input.replace(/^0x/i, '').toLowerCase()
      const bytes = fromHex(hex)
      if (bytes.length !== 32) throw new Error('InvalidPrivateKey')
      // Validate secret with SDK to ensure acceptability
      Ed25519Keypair.fromSecretKey(bytes)
      return {
        [`${pluginId}Key`]: base16.stringify(bytes).toLowerCase(),
        [`${pluginId}KeyDisplay`]: input
      }
    }

    throw new Error(
      'Invalid mnemonic or private key format. Expected mnemonic, hex, or suiprivkey1... bech32 format.'
    )
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

    const keys = asSuiPrivateKeys(pluginId)(walletInfo.keys)
    let keyPair: Ed25519Keypair
    if (keys.mnemonic != null) {
      keyPair = Ed25519Keypair.deriveKeypair(keys.mnemonic)
    } else if (keys.privateKey != null) {
      const hex = keys.privateKey.replace(/^0x/i, '').toLowerCase()
      const bytes = fromHex(hex)
      if (bytes.length !== 32) throw new Error('InvalidPrivateKey')
      keyPair = Ed25519Keypair.fromSecretKey(bytes)
    } else {
      throw new Error('SUI: No private key found in wallet')
    }
    const publicKey = keyPair.getPublicKey()
    const publicKeyBytes = publicKey.toRawBytes()

    return { publicKey: base64.stringify(publicKeyBytes) }
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
      testPrivateKeys: async (input: string) => {
        // Accept mnemonic and Bech32 suiprivkey for sweep during URI parsing.
        if (validateMnemonic(input)) return await this.importPrivateKey(input)
        if (input.startsWith('suiprivkey1'))
          return await this.importPrivateKey(input)
        // Do NOT accept raw 32-byte hex here, because it's ambiguous with a
        // public address.
        throw new Error('NotPrivateKey')
      }
    })

    if (edgeParsedUri.privateKeys != null) {
      return edgeParsedUri
    }

    let address = ''

    if (edgeParsedUri.publicAddress != null) {
      address = edgeParsedUri.publicAddress
    }

    if (!isValidSuiAddress(address)) {
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

    if (!isValidSuiAddress(publicAddress)) {
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
    const encodedUri = encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }

  edgeTokenIdFromCoinType(structTagString: string): string {
    const structTag = parseStructTag(structTagString)
    return `${structTag.address}${structTag.module}${structTag.name}`
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const cleanLocation = asMaybeContractLocation(token.networkLocation)
    if (cleanLocation == null) {
      throw new Error('ErrorInvalidContractAddress')
    }

    return this.edgeTokenIdFromCoinType(cleanLocation.contractAddress)
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<SuiNetworkInfo>
): Promise<SuiTools> {
  return new SuiTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<SuiNetworkInfo>,
  infoPayload: SuiInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './SuiEngine'
