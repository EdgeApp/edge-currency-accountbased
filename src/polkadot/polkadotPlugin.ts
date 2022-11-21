import { div } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
import { Buffer } from 'buffer'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeCurrencyPlugin,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyPlugin } from '../common/plugin'
import { getDenomInfo, isHex } from '../common/utils'
import { PolkadotEngine } from './polkadotEngine'
import {
  ApiPromise,
  ed25519PairFromSeed,
  isAddress,
  Keyring,
  mnemonicToMiniSecret,
  WsProvider
} from './polkadotUtils'

export class PolkadotPlugin extends CurrencyPlugin {
  // The SDK is wallet-agnostic and we need to track how many wallets are relying on it and disconnect if zero
  polkadotApi: ApiPromise | undefined
  polkadotApiSubscribers: { [walletId: string]: boolean }

  constructor(io: EdgeIo, currencyInfo: EdgeCurrencyInfo) {
    super(io, currencyInfo.pluginId, currencyInfo)
    this.polkadotApiSubscribers = {}
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
    const keyring = new Keyring({ ss58Format: 0 })
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

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      this.currencyInfo,
      uri,
      networks,
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
      currencyCode || this.currencyInfo.currencyCode,
      customTokens
    )
    let address = ''
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
    }

    if (!isAddress(address)) {
      throw new Error('InvalidPublicAddressError')
    }

    edgeParsedUri.uniqueIdentifier = parsedUri.query.memo ?? undefined
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens?: EdgeMetaToken[]
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { nativeAmount, currencyCode, publicAddress } = obj

    if (!isAddress(publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }

    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        this.currencyInfo,
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
        currencyCode || this.currencyInfo.currencyCode,
        customTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 10)
    }
    const encodedUri = this.encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }

  async connectApi(walletId: string): Promise<ApiPromise> {
    if (this.polkadotApi == null) {
      this.polkadotApi = await ApiPromise.create({
        initWasm: false,
        provider: new WsProvider(
          this.currencyInfo.defaultSettings.otherSettings.rpcNodes[0]
        )
      })
    }
    this.polkadotApiSubscribers[walletId] = true
    return this.polkadotApi
  }

  async disconnectApi(walletId: string): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete this.polkadotApiSubscribers[walletId]
    // @ts-expect-error
    if (Object.keys(this.polkadotApiSubscribers) === 0) {
      // @ts-expect-error
      await this.polkadotApi.disconnectApi()
      this.polkadotApi = undefined
    }
  }
}

export function makePolkadotPluginInner(
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo
): EdgeCurrencyPlugin | undefined {
  if (
    BigInt != null &&
    typeof BigInt === 'function' &&
    typeof BigInt(2) !== 'bigint'
  ) {
    // Return early if required bigint support isn't present
    return
  }

  const { io } = opts

  let toolsPromise: Promise<PolkadotPlugin>
  async function makeCurrencyTools(): Promise<PolkadotPlugin> {
    if (toolsPromise != null) return await toolsPromise
    toolsPromise = Promise.resolve(new PolkadotPlugin(io, currencyInfo))
    return await toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new PolkadotEngine(tools, walletInfo, opts)

    // Do any async initialization necessary for the engine
    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    const out: EdgeCurrencyEngine = currencyEngine

    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
