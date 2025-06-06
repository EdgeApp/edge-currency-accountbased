import * as Cardano from '@emurgo/cardano-serialization-lib-nodejs'
import { div } from 'biggystring'
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from 'bip39'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  asCardanoPrivateKeys,
  asSafeCardanoWalletInfo,
  CardanoInfoPayload,
  CardanoNetworkInfo,
  CardanoPrivateKeys,
  EpochParams,
  SafeCardanoWalletInfo,
  wasCardanoPrivateKeys
} from './cardanoTypes'

export class CardanoTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo
  networkInfo: CardanoNetworkInfo
  epochParams?: EpochParams

  constructor(env: PluginEnvironment<CardanoNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo
  }

  /**
   * This function derives the account key and private key
   * Cardano.Bip32PrivateKey objects from the CardanoPrivateKeys object.
   *
   * All wallets should have the mnemonic, whereas only newer wallets would
   * also have the account key in bech32 format as an performance optimization.
   * This function will derive the `accountKey` from the mnemonic for older
   * wallets to maintain full backwards compatibility.
   *
   * @param keys CardanoPrivateKeys cleaned from the WalletInfo
   * @returns the `privateKey` and `accountKey` Cardano.Bip32PrivateKey objects
   */
  derivePrivateKeys(keys: CardanoPrivateKeys): {
    accountKey: Cardano.Bip32PrivateKey
    privateKey: Cardano.Bip32PrivateKey
  } {
    // Skip derivation on newer wallets which have the all the private keys.
    // These keys are optional for backwards compatibility.
    if (keys.accountKey != null && keys.privateKey != null) {
      return {
        accountKey: Cardano.Bip32PrivateKey.from_bech32(keys.accountKey),
        privateKey: Cardano.Bip32PrivateKey.from_bech32(keys.privateKey)
      }
    }

    const mnemonicEntropy = mnemonicToEntropy(keys.mnemonic)
    const privateKey = Cardano.Bip32PrivateKey.from_bip39_entropy(
      base16.parse(mnemonicEntropy),
      new Uint8Array()
    )

    function harden(num: number): number {
      return 0x80000000 + num
    }

    const accountKey = privateKey
      .derive(harden(1852)) // purpose
      .derive(harden(1815)) // coin type
      .derive(harden(0)) // account #0

    return {
      accountKey,
      privateKey
    }
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asCardanoPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.mnemonic
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeCardanoWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(mnemonic: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    const isValid = validateMnemonic(mnemonic)
    if (!isValid) throw new Error('Invalid mnemonic')
    const mnemonicEntropy = mnemonicToEntropy(mnemonic)

    // Validate input
    Cardano.Bip32PrivateKey.from_bip39_entropy(
      base16.parse(mnemonicEntropy),
      new Uint8Array()
    )

    // This is an upgrade to the private keys format for Cardano.
    // Older version of the plugin only stored the mnemonic in the keys object.
    // This addition stores the accountKey derivation path in the returned
    // private key object.
    const { accountKey, privateKey } = await this.derivePrivateKeys({
      mnemonic
    })

    // Use the cleaner codec to ensure that the format of the private key object
    // is strictly to specification by the types file.
    return wasCardanoPrivateKeys(pluginId)({
      mnemonic,
      accountKey: accountKey.to_bech32(),
      privateKey: privateKey.to_bech32()
    })
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const entropy = base16.stringify(this.io.random(32))
    const mnemonic = entropyToMnemonic(entropy)

    return await this.importPrivateKey(mnemonic)
  }

  async derivePublicKey(
    walletInfo: EdgeWalletInfo
  ): Promise<SafeCardanoWalletInfo['keys']> {
    const { pluginId, walletType } = this.currencyInfo
    if (walletInfo.type !== walletType) {
      throw new Error('InvalidWalletType')
    }
    const keys = asCardanoPrivateKeys(pluginId)(walletInfo.keys)
    const { accountKey, privateKey } = this.derivePrivateKeys(keys)

    // pub key derivation from https://github.com/Emurgo/cardano-serialization-lib/blob/master/doc/getting-started/generating-keys.md
    const addressKey = accountKey
      .derive(0) // external
      .derive(0)
      .to_public()

    const stakeKey = accountKey
      .derive(2) // chimeric
      .derive(0)
      .to_public()

    const address = Cardano.BaseAddress.new(
      this.networkInfo.networkId,
      Cardano.Credential.from_keyhash(addressKey.to_raw_key().hash()),
      Cardano.Credential.from_keyhash(stakeKey.to_raw_key().hash())
    )

    return {
      bech32Address: address.to_address().to_bech32(),
      publicKey: privateKey.to_public().to_bech32()
    }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const networks = { cardano: true }

    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      builtinTokens: this.builtinTokens,
      currencyCode: currencyCode ?? 'ADA',
      customTokens
    })

    Cardano.Address.from_bech32(edgeParsedUri.publicAddress ?? '')

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { nativeAmount, currencyCode, publicAddress } = obj

    Cardano.Address.from_bech32(publicAddress ?? '')

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
    const encodedUri = encodeUriCommon(obj, 'cardano', amount)
    return encodedUri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<CardanoNetworkInfo>
): Promise<CardanoTools> {
  return new CardanoTools(env)
}

export { makeCurrencyEngine } from './CardanoEngine'

export async function updateInfoPayload(
  env: PluginEnvironment<CardanoNetworkInfo>,
  infoPayload: CardanoInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}
