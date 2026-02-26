// Force asm.js crypto on RN to avoid WASM crash paths
import '@polkadot/wasm-crypto/initOnlyAsm'

import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import * as utilCrypto from '@polkadot/util-crypto'
import { div } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { asMaybeContractLocation, validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, isHex, mergeDeeply } from '../common/utils'
import {
  asPolkapolkadotPrivateKeys,
  asSafePolkadotWalletInfo,
  PolkadotInfoPayload,
  PolkadotNetworkInfo
} from './polkadotTypes'

const { ed25519PairFromSeed, isAddress, mnemonicToMiniSecret, encodeAddress } =
  utilCrypto

export class PolkadotTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo
  networkInfo: PolkadotNetworkInfo

  // The SDK is wallet-agnostic and we need to track how many wallets are relying on it and disconnect if zero
  polkadotApi!: ApiPromise
  polkadotApiSubscribers: Set<string>

  constructor(env: PluginEnvironment<PolkadotNetworkInfo>) {
    const { currencyInfo, io, networkInfo } = env
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo

    this.polkadotApiSubscribers = new Set()
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asPolkapolkadotPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.mnemonic ?? keys.privateKey
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafePolkadotWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(userInput: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    if (validateMnemonic(userInput)) {
      const miniSecret = mnemonicToMiniSecret(userInput)
      const { secretKey } = ed25519PairFromSeed(miniSecret)
      return {
        [`${pluginId}Mnemonic`]: userInput,
        [`${pluginId}Key`]: base16.stringify(secretKey).toLowerCase()
      }
    } else if (isHex(userInput)) {
      const hex = userInput.replace(/^0x/i, '')
      // Validate hex is even and decodes, and derive a 32-byte seed
      const bytes = base16.parse(hex)
      if (bytes.length !== 32 && bytes.length !== 64)
        throw new Error('InvalidPrivateKey')
      const seed = bytes.length === 32 ? bytes : bytes.subarray(0, 32)
      const { secretKey } = ed25519PairFromSeed(seed)
      return { [`${pluginId}Key`]: base16.stringify(secretKey).toLowerCase() }
    } else {
      throw new Error('InvalidPrivateKey')
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
    const keyring = new Keyring({ ss58Format: this.networkInfo.ss58Format })

    const mnemonic = walletInfo.keys[`${pluginId}Mnemonic`]
    const privateKeyHex = walletInfo.keys[`${pluginId}Key`]

    if (typeof mnemonic === 'string') {
      const pair = keyring.addFromUri(mnemonic)
      return { publicKey: pair.address }
    }

    if (typeof privateKeyHex === 'string') {
      const hex = privateKeyHex.replace(/^0x/i, '').toLowerCase()
      const bytes = base16.parse(hex)
      const seed = bytes.length === 32 ? bytes : bytes.subarray(0, 32)
      const pair = keyring.addFromSeed(seed)
      return {
        publicKey: encodeAddress(pair.publicKey, this.networkInfo.ss58Format)
      }
    }

    throw new Error('InvalidWalletKeys')
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
    const address = edgeParsedUri.publicAddress ?? ''

    if (!isAddress(address) || address.toLowerCase().startsWith('0x')) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo ?? undefined
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!isAddress(publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }

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
      amount = div(nativeAmount, denom.multiplier, 10)
    }
    const encodedUri = encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }

  async connectApi(walletId: string): Promise<ApiPromise> {
    if (this.polkadotApi == null) {
      this.polkadotApi = await ApiPromise.create({
        initWasm: false,
        provider: new WsProvider(this.networkInfo.rpcNodes[0])
      })
    }
    this.polkadotApiSubscribers.add(walletId)
    return this.polkadotApi
  }

  async disconnectApi(walletId: string): Promise<void> {
    this.polkadotApiSubscribers.delete(walletId)
    if (this.polkadotApiSubscribers.size === 0) {
      await this.polkadotApi.disconnect()
      // @ts-expect-error
      this.polkadotApi = undefined
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
  env: PluginEnvironment<PolkadotNetworkInfo>
): Promise<PolkadotTools> {
  return new PolkadotTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<PolkadotNetworkInfo>,
  infoPayload: PolkadotInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './PolkadotEngine'
