import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  asKaspaPrivateKeys,
  asSafeKaspaWalletInfo,
  KaspaInfoPayload,
  KaspaNetworkInfo
} from './kaspaTypes'

export class KaspaTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: KaspaNetworkInfo

  constructor(env: PluginEnvironment<KaspaNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
    this.networkInfo = networkInfo
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const keys = asKaspaPrivateKeys(privateWalletInfo.keys)
    return keys.kaspaMnemonic
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeKaspaWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(kaspaMnemonic: string): Promise<Object> {
    const isValid = validateMnemonic(kaspaMnemonic)
    if (!isValid) throw new Error('Invalid Kaspa mnemonic')

    // For now, we'll use the mnemonic directly as the private key
    // In a full implementation, this would derive the actual private key
    const kaspaKey = base16.stringify(mnemonicToSeedSync(kaspaMnemonic))
    
    return { kaspaMnemonic, kaspaKey }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type !== 'kaspa') throw new Error('InvalidWalletType')

    const entropy = Buffer.from(this.io.random(32))
    const kaspaMnemonic = entropyToMnemonic(entropy)

    return await this.importPrivateKey(kaspaMnemonic)
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'kaspa') {
      // For this basic implementation, we'll generate a placeholder address
      // In a full implementation, this would use the @kaspa/wallet library
      // to derive the actual Kaspa address from the private key
      const keys = asKaspaPrivateKeys(walletInfo.keys)
      
      // Generate a deterministic address based on the mnemonic
      // This is a placeholder - real implementation would use Kaspa address derivation
      const seed = mnemonicToSeedSync(keys.kaspaMnemonic)
      const addressBytes = seed.slice(0, 20)
      const publicKey = `kaspa:${base16.stringify(addressBytes).toLowerCase()}`
      
      return { publicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  checkAddress(address: string): boolean {
    // Basic Kaspa address validation
    // Kaspa addresses start with 'kaspa:' and are followed by a hex string
    const kaspaAddressRegex = /^kaspa:[a-fA-F0-9]{40}$/
    return kaspaAddressRegex.test(address)
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const networks = { kaspa: true }

    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      builtinTokens: this.builtinTokens,
      currencyCode: currencyCode ?? 'KAS',
      customTokens
    })
    const address = edgeParsedUri.publicAddress ?? ''

    const valid = this.checkAddress(address)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj
    const valid = this.checkAddress(publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    
    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getLegacyDenomination(
        currencyCode ?? 'KAS',
        this.currencyInfo,
        customTokens,
        this.builtinTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      // Convert from base units (sompis) to display units (KAS)
      amount = parseFloat(nativeAmount) / parseFloat(denom.multiplier)
    }
    
    const encodedUri = encodeUriCommon(obj, 'kaspa', amount?.toString())
    return encodedUri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<KaspaNetworkInfo>
): Promise<KaspaTools> {
  return new KaspaTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<KaspaNetworkInfo>,
  infoPayload: KaspaInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './KaspaEngine'