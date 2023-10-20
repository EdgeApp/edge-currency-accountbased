import { stringToPath } from '@cosmjs/crypto'
import { DirectSecp256k1HdWallet } from '@cosmjs/proto-signing'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
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
import {
  asCosmosPrivateKeys,
  asSafeCosmosWalletInfo,
  CosmosNetworkInfo
} from './cosmosTypes'

export class CosmosTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: CosmosNetworkInfo

  constructor(env: PluginEnvironment<CosmosNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, networkInfo } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.networkInfo = networkInfo
  }

  async createSigner(mnemonic: string): Promise<DirectSecp256k1HdWallet> {
    const { bech32AddressPrefix, bip39Path } = this.networkInfo
    const path = stringToPath(bip39Path)
    const signer = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      hdPaths: [path],
      prefix: bech32AddressPrefix
    })
    return signer
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asCosmosPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.mnemonic
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeCosmosWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    const isValid = validateMnemonic(input)
    if (!isValid) throw new Error('Invalid mnemonic')

    // Test it
    await this.createSigner(input)

    return { [this.networkInfo.pluginMnemonicKeyName]: input }
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
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const { mnemonic } = asCosmosPrivateKeys(this.currencyInfo.pluginId)(
      walletInfo.keys
    )
    const signer = await this.createSigner(mnemonic)
    const accountInfos = await signer.getAccounts()
    const { address, /* algo */ pubkey } = accountInfos[0]
    const publicKey = base16.stringify(pubkey)

    return { bech32Address: address, publicKey }
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    throw new Error('not implemented')
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    throw new Error('not implemented')
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<CosmosNetworkInfo>
): Promise<CosmosTools> {
  return new CosmosTools(env)
}

export { makeCurrencyEngine } from './CosmosEngine'
