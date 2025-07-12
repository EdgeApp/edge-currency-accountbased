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
import { base16 } from 'rfc4648'
import { 
  initKaspaFramework,
  kaspacore
} from '@kaspa/wallet'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  KaspaInfoPayload,
  KaspaNetworkInfo,
  asKaspaPrivateKeys,
  asSafeKaspaWalletInfo
} from './kaspaTypes'

// Kaspa address validation regex
const KASPA_ADDRESS_REGEX = /^kaspa:[a-z0-9]{61,67}$/
const KASPA_TESTNET_ADDRESS_REGEX = /^kaspatest:[a-z0-9]{61,67}$/
const KASPA_DEVNET_ADDRESS_REGEX = /^kaspadev:[a-z0-9]{61,67}$/
const KASPA_SIMNET_ADDRESS_REGEX = /^kaspasim:[a-z0-9]{61,67}$/

// Initialize the framework once
let kaspaFrameworkInitialized = false
const ensureKaspaFramework = async (): Promise<void> => {
  if (!kaspaFrameworkInitialized) {
    await initKaspaFramework()
    
    // Add custom Kaspa networks
    const { Networks } = kaspacore
    
    // Clear any existing networks and add Kaspa networks
    // Mainnet configuration based on Kaspa specifications
    Networks.add({
      name: 'kaspa-mainnet',
      alias: 'mainnet',
      pubkeyhash: 0x00, // 0x00 for mainnet
      privatekey: 0x80, // Standard private key version
      scripthash: 0x08, // 0x08 for mainnet script hash
      xpubkey: 0x0488b21e, // Standard HD public key version
      xprivkey: 0x0488ade4, // Standard HD private key version
      prefix: 'kaspa',
      prefixArray: [
        11, 1, 19, 16, 1 // 'kaspa' in base32
      ],
      networkMagic: 0x6b617370, // 'kasp' as hex integer
      port: 16111,
      dnsSeeds: []
    })
    
    // Testnet configuration
    Networks.add({
      name: 'kaspa-testnet',
      alias: 'testnet',
      pubkeyhash: 0x00, // Same as mainnet for Kaspa
      privatekey: 0x80,
      scripthash: 0x08,
      xpubkey: 0x043587cf, // Testnet HD public key version
      xprivkey: 0x04358394, // Testnet HD private key version
      prefix: 'kaspatest',
      prefixArray: [
        11, 1, 19, 16, 1, 20, 5, 19, 20 // 'kaspatest' in base32
      ],
      networkMagic: 0x6b747370, // 'ktsp' as hex integer
      port: 16211,
      dnsSeeds: []
    })
    
    // Devnet configuration
    Networks.add({
      name: 'kaspa-devnet',
      alias: 'devnet',
      pubkeyhash: 0x00,
      privatekey: 0x80,
      scripthash: 0x08,
      xpubkey: 0x043587cf,
      xprivkey: 0x04358394,
      prefix: 'kaspadev',
      prefixArray: [
        11, 1, 19, 16, 1, 4, 5, 22 // 'kaspadev' in base32
      ],
      networkMagic: 0x6b646576, // 'kdev' as hex integer
      port: 16311,
      dnsSeeds: []
    })
    
    // Simnet configuration
    Networks.add({
      name: 'kaspa-simnet',
      alias: 'simnet',
      pubkeyhash: 0x00,
      privatekey: 0x80,
      scripthash: 0x08,
      xpubkey: 0x043587cf,
      xprivkey: 0x04358394,
      prefix: 'kaspasim',
      prefixArray: [
        11, 1, 19, 16, 1, 19, 9, 13 // 'kaspasim' in base32
      ],
      networkMagic: 0x6b73696d, // 'ksim' as hex integer
      port: 16411,
      dnsSeeds: []
    })
    
    kaspaFrameworkInitialized = true
  }
}

export function makeKaspaTools(env: PluginEnvironment<KaspaNetworkInfo>): EdgeCurrencyTools {
  const { builtinTokens, currencyInfo } = env

  const kaspaTools = new KaspaTools(env.io, currencyInfo, builtinTokens)

  return kaspaTools
}

class KaspaTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  io: EdgeIo

  constructor(
    io: EdgeIo,
    currencyInfo: EdgeCurrencyInfo,
    builtinTokens: EdgeTokenMap
  ) {
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.io = io
  }

  async getDisplayPrivateKey(
    privateWalletInfo: JsonObject
  ): Promise<string> {
    await ensureKaspaFramework()
    const { pluginId } = this.currencyInfo
    const keys = asKaspaPrivateKeys(pluginId)(privateWalletInfo)

    // Return the private key in WIF format
    return keys.privateKey
  }

  async getDisplayPublicKey(publicWalletInfo: JsonObject): Promise<string> {
    await ensureKaspaFramework()
    const { publicKey } = publicWalletInfo
    if (typeof publicKey !== 'string') {
      throw new Error('InvalidPublicKey')
    }
    return publicKey
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    await ensureKaspaFramework()
    const { pluginId } = this.currencyInfo
    
    try {
      // Get the appropriate network
      const network = this.getNetwork()
      
      // Create a PrivateKey instance from the input
      const privateKey = new kaspacore.PrivateKey(input, network)
      
      // Derive public key from private key
      const publicKey = privateKey.toPublicKey()
      const publicKeyHex = publicKey.toString()
      
      // Generate address from public key
      const address = new kaspacore.Address(publicKey, network).toString()
      
      // Store private key in WIF format
      const privateKeyWIF = privateKey.toString()
      
      return {
        [`${pluginId}Key`]: privateKeyWIF,
        [`${pluginId}PublicKey`]: publicKeyHex,
        publicKey: address
      }
    } catch (error) {
      // Check for specific error messages
      const errorMessage = String(error)
      if (errorMessage.includes('Invalid checksum') || errorMessage.includes('Non-base58')) {
        throw new Error('Invalid private key')
      }
      throw new Error('Invalid private key format')
    }
  }

  // Helper method to get the network prefix based on plugin configuration
  private getNetworkPrefix(): string {
    const networkInfo = this.currencyInfo.defaultSettings as KaspaNetworkInfo
    const isTestnet = networkInfo?.rpcServers?.some(server => 
      server.includes('testnet')
    ) ?? false
    const isDevnet = networkInfo?.rpcServers?.some(server => 
      server.includes('devnet')
    ) ?? false
    const isSimnet = networkInfo?.rpcServers?.some(server => 
      server.includes('simnet')
    ) ?? false
    
    if (isTestnet) return 'kaspatest'
    if (isDevnet) return 'kaspadev'
    if (isSimnet) return 'kaspasim'
    return 'kaspa'
  }

  // Helper method to get the network object based on plugin configuration
  private getNetwork(): any {
    const network = this.getNetworkPrefix()
    
    // Get the appropriate network from kaspacore.Networks
    switch (network) {
      case 'kaspa':
        return kaspacore.Networks.get('kaspa-mainnet')
      case 'kaspatest':
        return kaspacore.Networks.get('kaspa-testnet')
      case 'kaspadev':
        return kaspacore.Networks.get('kaspa-devnet')
      case 'kaspasim':
        return kaspacore.Networks.get('kaspa-simnet')
      default:
        return kaspacore.Networks.get('kaspa-mainnet')
    }
  }

  // Helper method to validate address format
  private isValidAddress(address: string): boolean {
    const network = this.getNetworkPrefix()
    switch (network) {
      case 'kaspa':
        return KASPA_ADDRESS_REGEX.test(address)
      case 'kaspatest':
        return KASPA_TESTNET_ADDRESS_REGEX.test(address)
      case 'kaspadev':
        return KASPA_DEVNET_ADDRESS_REGEX.test(address)
      case 'kaspasim':
        return KASPA_SIMNET_ADDRESS_REGEX.test(address)
      default:
        return false
    }
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    await ensureKaspaFramework()
    const { pluginId } = this.currencyInfo
    
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    // Generate 32 bytes of entropy using EdgeIo
    const entropy = await this.io.random(32)
    const entropyHex = base16.stringify(entropy)
    
    // Get the appropriate network
    const network = this.getNetwork()
    
    // Create private key from entropy hex string
    const privateKey = new kaspacore.PrivateKey(entropyHex, network)
    
    // Derive public key and address
    const publicKey = privateKey.toPublicKey()
    const publicKeyHex = publicKey.toString()
    const address = new kaspacore.Address(publicKey, network).toString()
    
    // Store private key in WIF format
    const privateKeyWIF = privateKey.toString()
    
    return {
      [`${pluginId}Key`]: privateKeyWIF,
      [`${pluginId}PublicKey`]: publicKeyHex,
      publicKey: address
    }
  }

  async derivePublicKey(walletInfo: JsonObject): Promise<JsonObject> {
    await ensureKaspaFramework()
    const { pluginId } = this.currencyInfo
    
    const privateKeyWIF = walletInfo[`${pluginId}Key`] as string | undefined
    
    try {
      if (privateKeyWIF == null || privateKeyWIF === '') {
        throw new Error('Invalid private key')
      }
      
      const network = this.getNetwork()
      
      // Recreate private key from WIF
      const privateKey = new kaspacore.PrivateKey(privateKeyWIF, network)
      const publicKey = privateKey.toPublicKey()
      const publicKeyHex = publicKey.toString()
      const address = new kaspacore.Address(publicKey, network).toString()
      
      return {
        ...walletInfo,
        [`${pluginId}PublicKey`]: publicKeyHex,
        publicKey: address
      }
    } catch (error) {
      throw new Error('Invalid private key')
    }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const network = this.getNetworkPrefix()

    // Handle plain addresses without scheme
    if (this.isValidAddress(uri)) {
      return {
        publicAddress: uri
      }
    }

    // Handle URIs with scheme
    const { edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks: {
        [`${network}`]: true
      },
      builtinTokens: this.builtinTokens,
      currencyCode,
      customTokens
    })

    // Validate the address
    if (edgeParsedUri.publicAddress && !this.isValidAddress(edgeParsedUri.publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }

    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const network = this.getNetworkPrefix()

    if (!obj.publicAddress || !this.isValidAddress(obj.publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }

    // Calculate amount if needed
    let amount: string | undefined
    if (obj.nativeAmount != null) {
      const denom = getLegacyDenomination(
        obj.currencyCode ?? this.currencyInfo.currencyCode,
        this.currencyInfo,
        customTokens ?? [],
        this.builtinTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = (parseInt(obj.nativeAmount) / parseInt(denom.multiplier)).toString()
    }

    return encodeUriCommon(obj, network, amount)
  }

  getSplittableTypes(walletInfo: JsonObject): string[] {
    return []
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<KaspaNetworkInfo>
): Promise<EdgeCurrencyTools> {
  return makeKaspaTools(env)
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
