import { div, mul, toFixed } from 'biggystring'
import { asMaybe, asString } from 'cleaners'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeGetTokenDetailsFilter,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import type { NativeZanoModule } from 'react-native-zano'
import { CppBridge } from 'react-native-zano/lib/src/CppBridge'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { asMaybeContractLocation, validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import { parseZanoDeeplink } from './parseZanoDeeplink'
import {
  asZanoAssetDetails,
  asZanoPrivateKeys,
  ZanoImportPrivateKeyOpts,
  ZanoInfoPayload,
  ZanoNetworkInfo
} from './zanoTypes'

export class ZanoTools implements EdgeCurrencyTools {
  zano: CppBridge
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo
  log: EdgeLog
  networkInfo: ZanoNetworkInfo

  constructor(env: PluginEnvironment<ZanoNetworkInfo>) {
    const { currencyInfo, io, log, nativeIo, networkInfo } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.log = log
    this.networkInfo = networkInfo

    // Grab the raw C++ API and wrap it in argument parsing:
    const cppModule = nativeIo.zano as NativeZanoModule
    if (cppModule == null) throw new Error('Need zano native IO')
    this.zano = new CppBridge(cppModule)
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asZanoPrivateKeys(pluginId)(privateWalletInfo.keys)
    const passphraseStr =
      keys.passphrase != null ? `\n\nPassphrase:\n${keys.passphrase}` : ''
    return `Seed Phrase:\n${keys.mnemonic}${passphraseStr}`
  }

  /**
   * The storagePath isn't a private piece of information and just points to files
   * stored locally on disk. We need something that persists across restarts and
   * we don't have access to the address before needing to declare a storage path.
   */
  private createPath(): string {
    const entropy = this.io.random(32)
    return base16.stringify(entropy)
  }

  async importPrivateKey(
    input: string,
    opts: ZanoImportPrivateKeyOpts = {}
  ): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo

    const out = {
      [`${pluginId}Mnemonic`]: input
    }

    const { passphrase } = opts
    let { storagePath } = opts
    let seedPassword = ''

    if (passphrase != null) {
      seedPassword = asString(passphrase)
      out[`${pluginId}Passphrase`] = seedPassword
    }

    if (storagePath == null) {
      storagePath = this.createPath()
    }
    out[`${pluginId}StoragePath`] = storagePath

    await this.zano.init(this.networkInfo.walletRpcAddress, -1)
    const seedPhraseInfo = await this.zano.getSeedPhraseInfo(
      input,
      seedPassword
    )

    if (
      seedPhraseInfo.error_code !== 'OK' ||
      seedPhraseInfo.response_data.address === ''
    ) {
      throw new Error(`Unable to validate mnemonic`)
    }

    return out
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const storagePath = this.createPath()

    await this.zano.init(this.networkInfo.walletRpcAddress, -1)
    const generatedWallet = await this.zano.generateSeedPhrase(
      this.networkInfo.walletRpcAddress,
      storagePath,
      ''
    )

    return await this.importPrivateKey(generatedWallet.seed, { storagePath })
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const { pluginId } = this.currencyInfo
    const zanoPrivateKeys = asZanoPrivateKeys(pluginId)(walletInfo.keys)
    const { mnemonic, passphrase = '' } = zanoPrivateKeys

    await this.zano.init(this.networkInfo.walletRpcAddress, -1)
    const seedPhraseInfo = await this.zano.getSeedPhraseInfo(
      mnemonic,
      passphrase
    )

    return {
      publicKey: seedPhraseInfo.response_data.address
    }
  }

  async isValidAddress(address: string): Promise<boolean> {
    const info = await this.zano.getAddressInfo(address)
    // Reject wrapped (ETH) addresses - only accept native Zano addresses
    return info.valid && !info.wrap
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const networks = { [pluginId]: true }

    // Handle Zano Deeplink URIs:
    if (uri.startsWith('zano:')) {
      const zanoDeeplink = parseZanoDeeplink(uri)
      if (zanoDeeplink.action !== 'send') {
        throw new Error('Invalid Zano URI: only send action is supported')
      }
      if (!(await this.isValidAddress(zanoDeeplink.address))) {
        throw new Error('InvalidPublicAddressError')
      }
      const edgeParsedUri: EdgeParsedUri = {
        publicAddress: zanoDeeplink.address
      }
      const amountStr = zanoDeeplink.amount
      if (amountStr != null && typeof amountStr === 'string') {
        // Validate that the currency in the deeplink matches the requested
        // currency code:
        let deeplinkCurrencyCode: string | undefined
        if (zanoDeeplink.asset_id == null) {
          deeplinkCurrencyCode = this.currencyInfo.currencyCode
        } else {
          deeplinkCurrencyCode = customTokens?.find(
            token =>
              token.contractAddress?.toLowerCase() ===
              zanoDeeplink.asset_id?.toLowerCase()
          )?.currencyCode
        }
        if (
          deeplinkCurrencyCode == null ||
          (currencyCode != null && currencyCode !== deeplinkCurrencyCode)
        ) {
          throw new Error('InvalidCurrencyCodeError')
        }
        const denom = getLegacyDenomination(
          deeplinkCurrencyCode,
          this.currencyInfo,
          customTokens ?? []
        )
        if (denom == null) {
          throw new Error('InternalErrorInvalidCurrencyCode')
        }
        let nativeAmount = mul(amountStr, denom.multiplier)
        nativeAmount = toFixed(nativeAmount, 0, 0)

        edgeParsedUri.nativeAmount = nativeAmount
        edgeParsedUri.currencyCode = deeplinkCurrencyCode
      }
      return edgeParsedUri
    }

    // Handle standard URIs:
    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      currencyCode,
      customTokens
    })

    let address = ''

    if (edgeParsedUri.publicAddress != null) {
      address = edgeParsedUri.publicAddress
    }

    const isValid = await this.isValidAddress(address)
    if (!isValid) throw new Error('InvalidPublicAddressError')

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    const isValid = await this.isValidAddress(publicAddress)
    if (!isValid) throw new Error('InvalidPublicAddressError')

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

  async getTokenDetails(
    filter: EdgeGetTokenDetailsFilter
  ): Promise<EdgeToken[]> {
    const { contractAddress } = filter
    if (contractAddress == null) return []

    const hex64Regex = /^[0-9a-fA-F]{64}$/
    if (!hex64Regex.test(contractAddress)) {
      return []
    }

    const opts = {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify({
        method: 'get_asset_info',
        params: { asset_id: contractAddress }
      })
    }

    const response = await this.io.fetch(
      `${this.networkInfo.walletRpcAddress}/json_rpc`,
      opts
    )

    if (!response.ok) {
      const message = await response.text()
      throw new Error(message)
    }

    const json: unknown = await response.json()

    const assetDetails = asMaybe(asZanoAssetDetails)(json)
    if (assetDetails == null) return []

    const {
      ticker,
      full_name: displayName,
      decimal_point: decimals
    } = assetDetails.result.asset_descriptor
    const out: EdgeToken = {
      currencyCode: ticker,
      denominations: [
        {
          name: ticker,
          multiplier: '1' + '0'.repeat(decimals)
        }
      ],
      displayName,
      networkLocation: { contractAddress }
    }
    return [out]
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const cleanLocation = asMaybeContractLocation(token.networkLocation)
    if (cleanLocation == null) {
      throw new Error('ErrorInvalidContractAddress')
    }
    // Test if it's valid hex
    base16.parse(cleanLocation.contractAddress)

    return cleanLocation.contractAddress.toLowerCase()
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<ZanoNetworkInfo>
): Promise<ZanoTools> {
  return new ZanoTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<ZanoNetworkInfo>,
  infoPayload: ZanoInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './ZanoEngine'
