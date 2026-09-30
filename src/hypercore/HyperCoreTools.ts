import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import { asObject, asString, Cleaner } from 'cleaners'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeGetTokenDetailsFilter,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import EthereumUtil from 'ethereumjs-util'
import hdKey from 'ethereumjs-wallet/hdkey'
import { ethers } from 'ethers'

import { PluginEnvironment } from '../common/innerPlugin'
import { timeout } from '../common/promiseUtils'
import { validateToken } from '../common/tokenHelpers'
import { asSafeCommonWalletInfo } from '../common/types'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import {
  getLegacyDenomination,
  mergeDeeply,
  shuffleArray
} from '../common/utils'
import {
  asHyperCorePrivateKeys,
  asHyperCoreTokenLocation,
  asSpotMeta,
  HyperCoreInfoPayload,
  HyperCoreNetworkInfo,
  HyperCoreSpotMeta,
  HyperCoreSpotToken,
  HyperCoreTokenLocation
} from './hypercoreTypes'

const REQUEST_TIMEOUT_MS = 10000

/** Token deployments are rare, so the token list is refreshed hourly. */
const SPOT_META_TTL_MS = 60 * 60 * 1000

const BALANCE_CHECKER_ABI = [
  'function balances(address[] users, uint64[] tokens) view returns (uint256[] totals, uint256[] holds)'
]

export interface HyperCoreSpotBalance {
  index: number
  total: string
  hold: string
}

export class HyperCoreTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  initOptions: JsonObject

  private readonly env: PluginEnvironment<HyperCoreNetworkInfo>
  private spotMeta?: { date: number; meta: Promise<HyperCoreSpotMeta> }
  private readonly checker = new ethers.utils.Interface(BALANCE_CHECKER_ABI)

  constructor(env: PluginEnvironment<HyperCoreNetworkInfo>) {
    const { builtinTokens, currencyInfo, initOptions, io } = env
    this.env = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.initOptions = initOptions
  }

  /**
   * Read through `env`, since `updateInfoPayload` replaces the network info
   * after the tools are constructed.
   */
  get networkInfo(): HyperCoreNetworkInfo {
    return this.env.networkInfo
  }

  //
  // Network
  //

  private async postJson(url: string, body: unknown): Promise<unknown> {
    const response = await timeout(
      this.io.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }),
      REQUEST_TIMEOUT_MS,
      new Error(`HyperCore request timed out: ${url}`)
    )
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`HyperCore ${url} ${response.status}: ${text}`)
    }
    return await response.json()
  }

  /** Posts to each API server in turn until one answers. */
  private async postApi(path: string, body: unknown): Promise<unknown> {
    const { apiServers } = this.networkInfo
    let lastError: unknown = new Error('No HyperCore API servers configured')
    for (const server of shuffleArray([...apiServers])) {
      try {
        return await this.postJson(`${server}${path}`, body)
      } catch (error: unknown) {
        lastError = error
      }
    }
    throw lastError
  }

  async fetchInfo<T>(body: JsonObject, cleaner: Cleaner<T>): Promise<T> {
    return cleaner(await this.postApi('/info', body))
  }

  /**
   * Submits a signed action. Not retried on other servers: an action is only
   * valid once per nonce, and the first server's error is the useful one.
   */
  async postExchange(body: JsonObject): Promise<unknown> {
    const [server] = this.networkInfo.apiServers
    if (server == null) throw new Error('No HyperCore API servers configured')
    return await this.postJson(`${server}/exchange`, body)
  }

  /**
   * Reads spot balances through the HyperEVM balance checker. HyperCore
   * returns zero for token indexes that do not exist.
   */
  async fetchEvmBalances(
    user: string,
    indexes: number[]
  ): Promise<HyperCoreSpotBalance[]> {
    const { balanceCheckerContract, evmRpcServers } = this.networkInfo
    const data = this.checker.encodeFunctionData('balances', [[user], indexes])
    const asRpcResult = asObject({ result: asString })

    let lastError: unknown = new Error('No HyperEVM RPC servers configured')
    for (const server of shuffleArray([...evmRpcServers])) {
      try {
        const { result } = asRpcResult(
          await this.postJson(server, {
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_call',
            params: [{ to: balanceCheckerContract, data }, 'latest']
          })
        )
        const [totals, holds] = this.checker.decodeFunctionResult(
          'balances',
          result
        )
        return indexes.map((index, i) => ({
          index,
          total: totals[i].toString(),
          hold: holds[i].toString()
        }))
      } catch (error: unknown) {
        lastError = error
      }
    }
    throw lastError
  }

  //
  // Tokens
  //

  async getSpotMeta(forceRefresh = false): Promise<HyperCoreSpotMeta> {
    const now = Date.now()
    if (
      forceRefresh ||
      this.spotMeta == null ||
      now - this.spotMeta.date > SPOT_META_TTL_MS
    ) {
      const meta = this.fetchInfo({ type: 'spotMeta' }, asSpotMeta)
      this.spotMeta = { date: now, meta }
      // Drop a failed fetch so the next caller retries:
      meta.catch(() => {
        if (this.spotMeta?.meta === meta) this.spotMeta = undefined
      })
    }
    return await this.spotMeta.meta
  }

  /**
   * Finds how the API names a token. Built-in tokens carry this in their
   * network location; custom tokens only have a token id, so they are looked
   * up in the spot token list.
   */
  async getTokenLocation(
    token: EdgeToken | undefined
  ): Promise<HyperCoreTokenLocation> {
    if (token == null) return this.networkInfo.nativeToken
    const location = asMaybeTokenLocation(token.networkLocation)
    if (location != null) return location

    const tokenId = normalizeTokenId(
      asObject({ contractAddress: asString })(token.networkLocation)
        .contractAddress
    )
    const find = (meta: HyperCoreSpotMeta): HyperCoreSpotToken | undefined =>
      meta.tokens.find(t => normalizeTokenId(t.tokenId) === tokenId)
    const spotToken =
      find(await this.getSpotMeta()) ?? find(await this.getSpotMeta(true))
    if (spotToken == null) throw new Error(`Unknown HyperCore token ${tokenId}`)
    return {
      contractAddress: spotToken.tokenId,
      name: spotToken.name,
      index: spotToken.index
    }
  }

  async getTokenDetails(
    filter: EdgeGetTokenDetailsFilter
  ): Promise<EdgeToken[]> {
    const { contractAddress } = filter
    if (contractAddress == null || !isTokenId(contractAddress)) return []
    const tokenId = normalizeTokenId(contractAddress)
    const meta = await this.getSpotMeta()
    const spotToken = meta.tokens.find(
      t => normalizeTokenId(t.tokenId) === tokenId
    )
    if (spotToken == null) return []
    return [
      {
        currencyCode: spotToken.name,
        denominations: [
          {
            multiplier: '1' + '0'.repeat(spotToken.weiDecimals),
            name: spotToken.name
          }
        ],
        displayName: spotToken.fullName ?? spotToken.name,
        networkLocation: {
          contractAddress: spotToken.tokenId,
          name: spotToken.name,
          index: spotToken.index
        }
      }
    ]
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const { contractAddress } = asObject({ contractAddress: asString })(
      token.networkLocation
    )
    if (!isTokenId(contractAddress)) {
      throw new Error('ErrorInvalidContractAddress')
    }
    return normalizeTokenId(contractAddress)
  }

  //
  // Keys
  //

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asHyperCorePrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.mnemonic ?? keys.privateKey
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeCommonWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  /**
   * Accepts a mnemonic or a raw secp256k1 key. HyperCore accounts are
   * Ethereum addresses, so keys exported from an EVM wallet import as-is and
   * mnemonics use the Ethereum derivation path.
   */
  async importPrivateKey(input: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    const trimmed = input.trim()

    if (/^(0x)?[0-9a-fA-F]{64}$/.test(trimmed)) {
      const keyBuffer = Buffer.from(trimmed.replace(/^0x/, ''), 'hex')
      if (!EthereumUtil.isValidPrivate(keyBuffer)) {
        throw new Error('Invalid private key')
      }
      return { [`${pluginId}Key`]: keyBuffer.toString('hex') }
    }

    if (!validateMnemonic(trimmed)) throw new Error('Invalid input')
    return {
      [`${pluginId}Mnemonic`]: trimmed,
      [`${pluginId}Key`]: mnemonicToPrivateKey(trimmed)
    }
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }
    const entropy = Buffer.from(this.io.random(32))
    return await this.importPrivateKey(entropyToMnemonic(entropy))
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }
    const { pluginId } = this.currencyInfo
    const keys = asHyperCorePrivateKeys(pluginId)(walletInfo.keys)
    const keyBuffer = Buffer.from(keys.privateKey.replace(/^0x/, ''), 'hex')
    if (!EthereumUtil.isValidPrivate(keyBuffer)) {
      throw new Error('Invalid private key')
    }
    const address = EthereumUtil.toChecksumAddress(
      `0x${EthereumUtil.privateToAddress(keyBuffer).toString('hex')}`
    )
    return { publicKey: address }
  }

  //
  // URIs
  //

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const { edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks: { [pluginId]: true },
      builtinTokens: this.builtinTokens,
      currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
      customTokens,
      testPrivateKeys: this.importPrivateKey.bind(this)
    })

    if (edgeParsedUri.privateKeys != null) return edgeParsedUri

    const address = edgeParsedUri.publicAddress ?? ''
    if (!ethers.utils.isAddress(address)) {
      throw new Error('InvalidPublicAddressError')
    }
    edgeParsedUri.publicAddress = ethers.utils.getAddress(address)
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!ethers.utils.isAddress(publicAddress)) {
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
}

const asMaybeTokenLocation = (
  raw: unknown
): HyperCoreTokenLocation | undefined => {
  try {
    return asHyperCoreTokenLocation(raw)
  } catch (error: unknown) {
    return undefined
  }
}

/** HyperCore token ids are 16 bytes of hex. */
export const isTokenId = (raw: string): boolean =>
  /^(0x)?[0-9a-fA-F]{32}$/.test(raw)

/** Edge token ids are the HyperCore token id, lowercase, without the 0x. */
export const normalizeTokenId = (raw: string): string =>
  raw.replace(/^0x/i, '').toLowerCase()

export const mnemonicToPrivateKey = (mnemonic: string): string => {
  const hdwallet = hdKey.fromMasterSeed(mnemonicToSeedSync(mnemonic))
  const wallet = hdwallet.derivePath("m/44'/60'/0'/0/0").getWallet()
  return wallet.getPrivateKeyString().replace(/^0x/, '')
}

export async function makeCurrencyTools(
  env: PluginEnvironment<HyperCoreNetworkInfo>
): Promise<HyperCoreTools> {
  return new HyperCoreTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<HyperCoreNetworkInfo>,
  infoPayload: HyperCoreInfoPayload
): Promise<void> {
  env.networkInfo = mergeDeeply(env.networkInfo, infoPayload)
}

export { makeCurrencyEngine } from './HyperCoreEngine'
