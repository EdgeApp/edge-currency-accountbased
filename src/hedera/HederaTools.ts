import { AccountId, Mnemonic, PrivateKey } from '@hashgraph/sdk'
import { div } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeFetchFunction,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import {
  getLegacyDenomination,
  makeEngineFetch,
  mergeDeeply
} from '../common/utils'
import {
  asHederaPrivateKeys,
  asSafeHederaWalletInfo,
  HederaInfoPayload,
  HederaNetworkInfo
} from './hederaTypes'
import { createChecksum } from './hederaUtils'

const Ed25519PrivateKeyPrefix = '302e020100300506032b657004220420'

export class HederaTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  engineFetch: EdgeFetchFunction
  io: EdgeIo
  log: EdgeLog
  networkInfo: HederaNetworkInfo

  constructor(env: PluginEnvironment<HederaNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, log, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.engineFetch = makeEngineFetch(io)
    this.io = io
    this.log = log
    this.networkInfo = networkInfo
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asHederaPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.mnemonic ?? keys.privateKey
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeHederaWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const entropy = base16.stringify(this.io.random(32))
    const mnemonic = entropyToMnemonic(entropy)
    return await this.importPrivateKey(mnemonic)
  }

  async importPrivateKey(userInput: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    try {
      let privateMnemonic
      let privateKey
      if (
        /^(0x)?[0-9a-fA-F]{64}$/.test(
          userInput.replace(Ed25519PrivateKeyPrefix, '')
        )
      ) {
        const privateKeyString = userInput
          .replace(/^0x/, '')
          .replace(Ed25519PrivateKeyPrefix, '')
        privateKey =
          PrivateKey.fromStringED25519(privateKeyString).toStringDer()
      } else if (validateMnemonic(userInput)) {
        const mnemonic = await Mnemonic.fromString(userInput)
        // Use of deprecated method to maintain compatibility with wallets created with the Hedera SDK v1 derivation path 44/3030/0/0
        const sdkPrivateKey = await mnemonic.toEd25519PrivateKey()
        privateMnemonic = userInput
        privateKey = sdkPrivateKey.toStringDer()
      } else {
        throw new Error('InvalidPrivateKey')
      }

      return {
        [`${pluginId}Mnemonic`]: privateMnemonic,
        [`${pluginId}Key`]: privateKey
      }
    } catch (e: any) {
      throw new Error('InvalidPrivateKey')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    if (
      walletInfo.keys == null ||
      walletInfo.keys?.[`${pluginId}Key`] == null
    ) {
      throw new Error('Invalid private key')
    }

    const privateKey = PrivateKey.fromStringED25519(
      walletInfo.keys[`${pluginId}Key`]
    )

    return {
      publicKey: privateKey.publicKey.toStringDer()
    }
  }

  validAddress(address: string): boolean {
    try {
      AccountId.fromString(address)
      return true
    } catch (e) {}
    return false
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const {
      edgeParsedUri,
      edgeParsedUri: { publicAddress }
    } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks: { [`${pluginId}`]: true },
      currencyCode: this.currencyInfo.currencyCode
    })

    if (publicAddress != null) {
      const { checksumNetworkID } = this.networkInfo
      const [address, checksum] = publicAddress.split('-')
      if (
        !this.validAddress(publicAddress) ||
        (checksum != null &&
          checksum !== createChecksum(address, checksumNetworkID))
      )
        throw new Error('InvalidPublicAddressError')
    }

    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { publicAddress, nativeAmount } = obj
    if (!this.validAddress(publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }

    if (nativeAmount == null || typeof nativeAmount !== 'string') {
      // don't encode as a URI, just return the public address
      return publicAddress
    }

    const denom = getLegacyDenomination(
      this.currencyInfo.currencyCode,
      this.currencyInfo,
      customTokens
    )
    if (denom == null) {
      throw new Error('InternalErrorInvalidCurrencyCode')
    }
    const amount = div(nativeAmount, denom.multiplier, 8)

    return encodeUriCommon(obj, pluginId, amount)
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<HederaNetworkInfo>
): Promise<HederaTools> {
  return new HederaTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<HederaNetworkInfo>,
  infoPayload: HederaInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './HederaEngine'
