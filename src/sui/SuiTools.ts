import { fromBech32 } from '@cosmjs/encoding'
import { getFullnodeUrl, SuiClient, SuiHTTPTransport } from '@mysten/sui/client'
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
import { asMaybeContractLocation, validateToken } from '../common/tokenHelpers'
import { asSafeCommonWalletInfo } from '../common/types'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import { asSuiPrivateKeys, SuiInfoPayload, SuiNetworkInfo } from './suiTypes'

export class SuiTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: SuiNetworkInfo
  initOptions: JsonObject

  suiClient: SuiClient

  constructor(env: PluginEnvironment<SuiNetworkInfo>) {
    const { builtinTokens, currencyInfo, initOptions, io, networkInfo } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.networkInfo = networkInfo
    this.initOptions = initOptions

    const suiTransport = new SuiHTTPTransport({
      url: getFullnodeUrl(networkInfo.network),
      fetch: io.fetch as typeof fetch
    })
    this.suiClient = new SuiClient({
      transport: suiTransport
    })
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

    // Handle Bech32 encoded private key (suiprivkey1...)
    if (input.startsWith('suiprivkey1')) {
      try {
        const decoded = fromBech32(input)
        if (decoded.prefix === 'suiprivkey' && decoded.data.length === 33) {
          const schemeFlag = decoded.data[0]
          if (schemeFlag !== 0x00) throw new Error('UnsupportedKeyScheme')
          const privateKeyBytes = decoded.data.slice(1)
          if (privateKeyBytes.length !== 32)
            throw new Error('InvalidPrivateKey')
          const secretKeyHex = base16.stringify(privateKeyBytes).toLowerCase()
          return {
            [`${pluginId}Key`]: secretKeyHex,
            [`${pluginId}KeyDisplay`]: input
          }
        }
      } catch (error) {
        // Fall through to error below
      }
    }

    // If the input is ASCII-hex of a Bech32 string (common copy issue), detect & decode:
    if (/^(?:0x)?[0-9a-fA-F]{2,}$/.test(input)) {
      try {
        const hexAscii = input.replace(/^0x/i, '')
        const ascii = Buffer.from(hexAscii, 'hex').toString('ascii')
        if (ascii.startsWith('suiprivkey1')) {
          const decoded = fromBech32(ascii)
          if (decoded.prefix === 'suiprivkey' && decoded.data.length === 33) {
            const schemeFlag = decoded.data[0]
            if (schemeFlag !== 0x00) throw new Error('UnsupportedKeyScheme')
            const privateKeyBytes = decoded.data.slice(1)
            if (privateKeyBytes.length !== 32)
              throw new Error('InvalidPrivateKey')
            const secretKeyHex = base16.stringify(privateKeyBytes).toLowerCase()
            return {
              [`${pluginId}Key`]: secretKeyHex,
              [`${pluginId}KeyDisplay`]: ascii
            }
          }
        }
      } catch (error) {
        // Ignore and fall through to other formats
      }
    }

    // Fallback: allow importing a raw hex private key (exactly 32 bytes)
    if (/^(?:0x)?[0-9a-fA-F]{64}$/.test(input)) {
      const hex = input.replace(/^0x/i, '').toLowerCase()
      const bytes = base16.parse(hex)
      if (bytes.length !== 32) throw new Error('InvalidPrivateKey')
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
      const bytes = base16.parse(hex)
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
      testPrivateKeys: this.importPrivateKey.bind(this)
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
