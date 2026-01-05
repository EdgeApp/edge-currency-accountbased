import { createFetchAdapter } from '@haverstack/axios-fetch-adapter'
import { Address } from '@ton/core'
import { mnemonicToPrivateKey } from '@ton/crypto'
import { TonClient } from '@ton/ton'
import { div } from 'biggystring'
import { entropyToMnemonic, validateMnemonic } from 'bip39'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { asSafeCommonWalletInfo } from '../common/types'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import {
  getLegacyDenomination,
  mergeDeeply,
  shuffleArray
} from '../common/utils'
import {
  asTonInitOptions,
  asTonPrivateKeys,
  TonInfoPayload,
  TonInitOptions,
  TonNetworkInfo,
  wasTonPrivateKeys
} from './tonTypes'

export class TonTools implements EdgeCurrencyTools {
  io: EdgeIo
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: TonNetworkInfo
  initOptions: TonInitOptions
  log: EdgeLog

  fetchAdaptor: ReturnType<typeof createFetchAdapter>
  getTonCenterClients: () => TonClient[]
  getOrbsClients: () => TonClient[]

  constructor(env: PluginEnvironment<TonNetworkInfo>) {
    const { builtinTokens, currencyInfo, initOptions, io } = env
    this.io = io
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.networkInfo = env.networkInfo
    this.initOptions = asTonInitOptions(initOptions)
    this.log = env.log

    // Barebones fetch adaptor to work specifically with the @ton/ton library
    this.fetchAdaptor = createFetchAdapter({
      fetch: async (
        input: RequestInfo | URL,
        init?: RequestInit | undefined
      ): Promise<Response> => {
        if (!(input instanceof Request)) throw new Error('Invalid input')

        const fetchHeaders: Record<string, string> = {}
        for (const [key, value] of input.headers.entries()) {
          fetchHeaders[key] = value
        }

        const res = await io.fetch(input.url, {
          headers: fetchHeaders,
          method: input.method,
          body: await input.arrayBuffer()
        })

        const out = {
          headers: res.headers,
          ok: res.ok,
          status: res.status,
          arrayBuffer: async () => await res.arrayBuffer(),
          json: async () => await res.json(),
          text: async () => await res.text()
        }

        return out as Response
      }
    })

    this.getTonCenterClients = () => {
      const apiKeys = [undefined, ...this.initOptions.tonCenterApiKeys]
      const clients = apiKeys.map(apiKey => {
        return new TonClient({
          apiKey,
          endpoint: this.networkInfo.tonCenterUrl,
          httpAdapter: this.fetchAdaptor
        })
      })
      return clients
    }
    this.getOrbsClients = () => {
      const clients = [...env.networkInfo.tonOrbsServers].map(url => {
        return new TonClient({
          endpoint: url,
          httpAdapter: this.fetchAdaptor
        })
      })
      return shuffleArray(clients)
    }
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asTonPrivateKeys(pluginId)(privateWalletInfo.keys)
    return `${keys.mnemonic}\n\nVersion: ${keys.walletContract}`
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeCommonWalletInfo(publicWalletInfo)
    return keys.publicKey
  }

  async importPrivateKey(input: string): Promise<JsonObject> {
    const isValid = validateMnemonic(input)
    if (!isValid) throw new Error('Invalid mnemonic')

    return wasTonPrivateKeys(this.currencyInfo.pluginId)({
      mnemonic: input,
      walletContract: this.networkInfo.defaultWalletContract
    })
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

    const { mnemonic } = asTonPrivateKeys(this.currencyInfo.pluginId)(
      walletInfo.keys
    )
    const keyPair = await mnemonicToPrivateKey(mnemonic.split(' '))
    const publicKeyHex = base16.stringify(keyPair.publicKey)

    return { publicKey: publicKeyHex }
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
      currencyCode: currencyCode ?? this.currencyInfo.currencyCode,
      customTokens
    })

    let address = ''

    if (edgeParsedUri.publicAddress != null) {
      address = edgeParsedUri.publicAddress
    }

    if (!Address.isFriendly(address) && !Address.isRaw(address)) {
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

    if (!Address.isFriendly(publicAddress) && !Address.isRaw(publicAddress)) {
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
      amount = div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = encodeUriCommon(obj, pluginId, amount)
    return encodedUri
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    throw new Error('Method not implemented.')
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<TonNetworkInfo>
): Promise<TonTools> {
  return new TonTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<TonNetworkInfo>,
  infoPayload: TonInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './TonEngine'
