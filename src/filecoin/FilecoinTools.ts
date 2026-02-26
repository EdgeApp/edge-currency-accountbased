import {
  Address,
  NetworkPrefix,
  SignatureType,
  Wallet
} from '@zondax/izari-filecoin'
import { div } from 'biggystring'
import { fromSeed } from 'bip32'
import { entropyToMnemonic, mnemonicToSeed, validateMnemonic } from 'bip39'
import { asMaybe } from 'cleaners'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import EthereumUtil from 'ethereumjs-util'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  asFilecoinPrivateKeys,
  asFilPublicKey,
  FilecoinInfoPayload,
  FilecoinNetworkInfo
} from './filecoinTypes'

export class FilecoinTools implements EdgeCurrencyTools {
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo
  networkInfo: FilecoinNetworkInfo
  derivationPath: string

  constructor(env: PluginEnvironment<FilecoinNetworkInfo>) {
    const { currencyInfo, io, networkInfo } = env
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo
    this.derivationPath = `m/44'/${this.networkInfo.hdPathCoinType}'/0'/0/0`
  }

  isValidAddress(addressString: string): boolean {
    try {
      const address = this.normalizeAddress(addressString)

      // Address is a hex ETH address:
      if (
        Address.isFilEthAddress(address) &&
        /^(0x)?[A-Fa-f0-9]+$/.test(addressString)
      ) {
        // Verify checksum if it's present in the address
        if (
          /[A-F]/.test(addressString) &&
          !EthereumUtil.isValidChecksumAddress(addressString)
        ) {
          return false
        }

        if (!EthereumUtil.isValidAddress(addressString.toLowerCase() ?? '')) {
          return false
        }
      }
      return true
    } catch (error) {
      return false
    }
  }

  normalizeAddress(address: string): Address {
    try {
      return Address.fromEthAddress(
        NetworkPrefix[this.networkInfo.networkPrefix],
        address
      )
    } catch (error) {}
    return Address.fromString(address)
  }

  async importPrivateKey(
    userInput: string,
    opts: JsonObject = {}
  ): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo

    if (!validateMnemonic(userInput)) {
      throw new Error('Invalid mnemonic')
    }

    const seed = (await mnemonicToSeed(userInput)).toString('hex')

    return {
      [`${pluginId}Key`]: seed,
      [`${pluginId}Mnemonic`]: userInput
    }
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo

    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const seed = base16.stringify(this.io.random(32))
    const mnemonic = entropyToMnemonic(seed)

    return {
      [`${pluginId}Key`]: seed,
      [`${pluginId}Mnemonic`]: mnemonic
    }
  }

  async checkPublicKey(publicKey: JsonObject): Promise<boolean> {
    return asMaybe(asFilPublicKey)(publicKey) != null
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const { pluginId } = this.currencyInfo
    const { hdPathCoinType } = this.networkInfo

    const filecoinPrivateKeys = asFilecoinPrivateKeys(pluginId)(walletInfo.keys)

    // TODO: Figure out how to use the accountData.privateKey Buffer to gen xpub
    const seed = await mnemonicToSeed(filecoinPrivateKeys.mnemonic)
    const inter = fromSeed(seed)
    const xprivDerivation = inter
      .deriveHardened(44)
      .deriveHardened(hdPathCoinType)
      .deriveHardened(0)
    const xpubDerivation = xprivDerivation.neutered()
    const xpub = xpubDerivation.toBase58()

    const accountData = Wallet.deriveAccount(
      filecoinPrivateKeys.mnemonic,
      SignatureType.SECP256K1,
      this.derivationPath,
      undefined,
      NetworkPrefix[this.networkInfo.networkPrefix]
    )
    const address = accountData.address.toString()

    return {
      publicKey: xpub,
      address
    }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true }

    const {
      edgeParsedUri,
      edgeParsedUri: { publicAddress }
    } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    })

    if (publicAddress == null || !this.isValidAddress(publicAddress)) {
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

    if (!(await this.isValidAddress(publicAddress))) {
      throw new Error('InvalidPublicAddressError')
    }

    let amount
    if (nativeAmount != null) {
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
    const encodedUri = encodeUriCommon(obj, `${pluginId}`, amount)
    return encodedUri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<FilecoinNetworkInfo>
): Promise<FilecoinTools> {
  return new FilecoinTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<FilecoinNetworkInfo>,
  infoPayload: FilecoinInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './FilecoinEngine'
