import { div } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { asyncWaterfall, timeout } from '../common/promiseUtils'
import { asSafeCommonWalletInfo } from '../common/types'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  addressFromPublicKey,
  ANIMICA_SEED_LENGTH,
  isValidAddress,
  keypairFromSeed,
  seedFromMnemonic
} from './animicaCrypto'
import {
  AnimicaInfoPayload,
  AnimicaNetworkInfo,
  AnimicaPrivateKeys,
  AnimicaRpcErrorBody,
  asAnimicaPrivateKeys,
  asAnimicaRpcResponse
} from './animicaTypes'

const RPC_TIMEOUT_MS = 10000

/**
 * The explorer spends up to ~3.5s scanning blocks before it answers, so this
 * needs more headroom than the node.
 */
const EXPLORER_TIMEOUT_MS = 20000

/**
 * A JSON-RPC error from the node. The node's admission codes (-32012 bad
 * signature, -32013 insufficient funds, ...) are surfaced unchanged so the
 * GUI log shows the real reason a broadcast was refused.
 */
export class AnimicaRpcError extends Error {
  code: number
  data: unknown

  constructor(method: string, error: AnimicaRpcErrorBody) {
    super(`Animica RPC ${method} error ${error.code}: ${error.message}`)
    this.name = 'AnimicaRpcError'
    this.code = error.code
    this.data = error.data
  }
}

export class AnimicaTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  initOptions: JsonObject
  log: EdgeLog

  private readonly env: PluginEnvironment<AnimicaNetworkInfo>

  constructor(env: PluginEnvironment<AnimicaNetworkInfo>) {
    const { builtinTokens, currencyInfo, initOptions, io, log } = env
    this.env = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.initOptions = initOptions
    this.log = log
  }

  /**
   * Read through `env` rather than copying in the constructor, so that
   * `updateInfoPayload` (which runs after `makeCurrencyTools`) is honored.
   */
  get networkInfo(): AnimicaNetworkInfo {
    return this.env.networkInfo
  }

  /** Positional-params JSON-RPC call, failing over across `rpcServers`. */
  async fetchRpc(method: string, params: unknown[] = []): Promise<unknown> {
    const body = JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
    const funcs = this.networkInfo.rpcServers.map(url => async () => {
      const response = await timeout(
        this.io.fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body
        }),
        RPC_TIMEOUT_MS,
        new Error(`Animica RPC timed out: ${url}`)
      )
      if (!response.ok) {
        throw new Error(`Animica RPC ${method} failed: HTTP ${response.status}`)
      }
      const { result, error } = asAnimicaRpcResponse(await response.json())
      if (error != null) throw new AnimicaRpcError(method, error)
      return result
    })
    return await asyncWaterfall(funcs, RPC_TIMEOUT_MS)
  }

  async fetchExplorer(path: string): Promise<unknown> {
    const url = `${this.networkInfo.explorerApi}${path}`
    const response = await timeout(
      this.io.fetch(url, { headers: { Accept: 'application/json' } }),
      EXPLORER_TIMEOUT_MS,
      new Error(`Animica explorer timed out: ${url}`)
    )
    if (!response.ok) {
      throw new Error(
        `Animica explorer ${path} failed: HTTP ${response.status}`
      )
    }
    return await response.json()
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asAnimicaPrivateKeys(pluginId)(privateWalletInfo.keys)
    if (keys.mnemonic != null) return keys.mnemonic
    if (keys.privateKey != null) return keys.privateKey
    throw new Error('NoPrivateKey')
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeCommonWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  /**
   * Accepts a BIP-39 mnemonic (derived at m/44'/4279885'/0'/0'/0') or a
   * 32-byte ML-DSA-65 seed in hex, which is what Animica's own wallets
   * export.
   */
  async importPrivateKey(input: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    const clean = input.trim()

    if (validateMnemonic(clean)) {
      const seed = await seedFromMnemonic(clean)
      return {
        [`${pluginId}Mnemonic`]: clean,
        [`${pluginId}Key`]: base16.stringify(seed).toLowerCase()
      }
    }

    if (/^(?:0x)?[0-9a-fA-F]{64}$/.test(clean)) {
      return {
        [`${pluginId}Key`]: clean.replace(/^0x/i, '').toLowerCase()
      }
    }

    throw new Error(
      'Invalid mnemonic or private key format. Expected a BIP-39 mnemonic or a 32-byte hex seed.'
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

    const keys = asAnimicaPrivateKeys(pluginId)(walletInfo.keys)
    const { publicKey } = keypairFromSeed(await this.seedFromKeys(keys))

    return {
      publicKey: addressFromPublicKey(publicKey),
      publicKeyHex: base16.stringify(publicKey).toLowerCase()
    }
  }

  /** The stored seed wins; the mnemonic is only derived when it is absent. */
  async seedFromKeys(keys: AnimicaPrivateKeys): Promise<Uint8Array> {
    if (keys.privateKey != null) {
      const seed = base16.parse(keys.privateKey.replace(/^0x/i, ''))
      if (seed.length !== ANIMICA_SEED_LENGTH)
        throw new Error('InvalidPrivateKey')
      return seed
    }
    if (keys.mnemonic != null) {
      return await seedFromMnemonic(keys.mnemonic)
    }
    throw new Error('Animica: No private key found in wallet')
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true }

    const { edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      builtinTokens: this.builtinTokens,
      currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
      customTokens,
      // Addresses are bech32m, so neither a mnemonic nor a hex seed can be
      // mistaken for one:
      testPrivateKeys: async (input: string) =>
        await this.importPrivateKey(input)
    })

    if (edgeParsedUri.privateKeys != null) {
      return edgeParsedUri
    }

    if (
      edgeParsedUri.publicAddress == null ||
      !isValidAddress(edgeParsedUri.publicAddress)
    ) {
      throw new Error('InvalidPublicAddressError')
    }

    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!isValidAddress(publicAddress)) {
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
    return encodeUriCommon(obj, pluginId, amount)
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    throw new Error('Method not implemented.')
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<AnimicaNetworkInfo>
): Promise<AnimicaTools> {
  return new AnimicaTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<AnimicaNetworkInfo>,
  infoPayload: AnimicaInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './AnimicaEngine'
