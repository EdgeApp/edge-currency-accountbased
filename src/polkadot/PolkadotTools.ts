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
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { asMaybeContractLocation, validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, isHex } from '../common/utils'
import {
  asPolkapolkadotPrivateKeys,
  asSafePolkadotWalletInfo,
  PolkadotNetworkInfo
} from './polkadotTypes'

const { ed25519PairFromSeed, isAddress, mnemonicToMiniSecret } = utilCrypto

export class PolkadotTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: PolkadotNetworkInfo

  // The SDK is wallet-agnostic and we need to track how many wallets are relying on it and disconnect if zero
  polkadotApi!: ApiPromise
  polkadotApiSubscribers: Set<string>

  constructor(env: PluginEnvironment<PolkadotNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
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
        [`${pluginId}Key`]: Buffer.from(secretKey).toString('hex')
      }
    } else if (isHex(userInput)) {
      return {
        [`${pluginId}Key`]: userInput
      }
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
    const pair = keyring.addFromUri(walletInfo.keys[`${pluginId}Mnemonic`])
    return {
      publicKey: pair.address
    }
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
      currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    )
    const address = edgeParsedUri.publicAddress ?? ''

    if (!isAddress(address)) {
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

export { makeCurrencyEngine } from './PolkadotEngine'
