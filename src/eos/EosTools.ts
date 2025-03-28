import {
  API,
  APIClient,
  APIError,
  Bytes,
  FetchProvider,
  KeyType,
  Name,
  PrivateKey
} from '@greymass/eosio'
import { div, toFixed } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeFetchFunction,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { asyncWaterfall } from '../common/promiseUtils'
import {
  asMaybeContractLocation,
  makeMetaTokens,
  validateToken
} from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import {
  getFetchCors,
  getLegacyDenomination,
  mergeDeeply
} from '../common/utils'
import {
  asGetActivationCost,
  asGetActivationSupportedCurrencies
} from './eosSchema'
import {
  asEosPrivateKeys,
  asSafeEosWalletInfo,
  EosInfoPayload,
  EosNetworkInfo
} from './eosTypes'

export function checkAddress(address: string): boolean {
  return Name.pattern.test(address)
}

export function getClient(fetch: EdgeFetchFunction, server: string): APIClient {
  const provider = new FetchProvider(server, {
    fetch
  })
  return new APIClient({
    provider
  })
}

export class EosTools implements EdgeCurrencyTools {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  fetchCors: EdgeFetchFunction
  io: EdgeIo
  log: EdgeLog
  networkInfo: EosNetworkInfo

  constructor(env: PluginEnvironment<EosNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, log, networkInfo } = env
    this.builtinTokens = builtinTokens
    this.currencyInfo = currencyInfo
    this.fetchCors = getFetchCors(env.io)
    this.io = io
    this.log = log
    this.networkInfo = networkInfo
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const keys = asEosPrivateKeys(privateWalletInfo.keys)
    let out = ''
    // usage of eosOwnerKey must be protected by conditional
    // checking for its existence
    out += 'owner key\n' + String(keys.eosOwnerKey) + '\n\n'
    out += 'active key\n' + String(keys.eosKey) + '\n\n'
    return out
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeEosWalletInfo(publicWalletInfo)

    let out = ''
    if (keys?.ownerPublicKey != null) {
      out += 'owner publicKey\n' + String(keys.ownerPublicKey) + '\n\n'
    }
    if (keys?.publicKey != null) {
      out += 'active publicKey\n' + String(keys.publicKey) + '\n\n'
    }
    return out
  }

  async importPrivateKey(privateKey: string): Promise<Object> {
    const strippedPrivateKey = privateKey.replace(/ /g, '') // should be in WIF format
    if (strippedPrivateKey.length !== 51) {
      throw new Error('Private key wrong length')
    }
    PrivateKey.fromString(strippedPrivateKey) // will throw if invalid
    return {
      // best practice not to import owner key, only active
      // note that signing is done by active key (eosKey, not eosOwnerKey)
      eosKey: strippedPrivateKey // active private key
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    const currencyInfoType = this.currencyInfo.walletType.replace('wallet:', '')
    if (type === currencyInfoType) {
      const eosOwnerKey = new PrivateKey(
        KeyType.K1,
        Bytes.from(this.io.random(32))
      ).toWif()
      const eosKey = new PrivateKey(
        KeyType.K1,
        Bytes.from(this.io.random(32))
      ).toWif()
      return { eosOwnerKey, eosKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const publicKey = PrivateKey.from(walletInfo.keys.eosKey)
      .toPublic()
      .toLegacyString()
    let ownerPublicKey
    // usage of eosOwnerKey must be protected by conditional
    // checking for its existence
    if (walletInfo.keys.eosOwnerKey != null) {
      ownerPublicKey = PrivateKey.from(walletInfo.keys.eosOwnerKey)
        .toPublic()
        .toLegacyString()
    }
    return { publicKey, ownerPublicKey }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const { edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks: {
        [this.networkInfo.uriProtocol]: true
      },
      builtinTokens: this.builtinTokens
    })

    if (!checkAddress(edgeParsedUri.publicAddress ?? '')) {
      throw new Error('InvalidPublicAddressError')
    }
    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const valid = checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode = this.currencyInfo.currencyCode
      const nativeAmount = obj.nativeAmount
      const denom = getLegacyDenomination(
        currencyCode,
        this.currencyInfo,
        [...customTokens, ...makeMetaTokens(this.builtinTokens)],
        this.builtinTokens
      )
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 4)
    }
    const encodedUri = encodeUriCommon(
      obj,
      this.networkInfo.uriProtocol,
      amount
    )
    return encodedUri
  }

  async getTokenId(token: EdgeToken): Promise<string> {
    validateToken(token)
    const cleanLocation = asMaybeContractLocation(token.networkLocation)
    if (cleanLocation == null || !checkAddress(cleanLocation.contractAddress)) {
      throw new Error('ErrorInvalidContractAddress')
    }
    return cleanLocation.contractAddress.toLowerCase()
  }

  async getAccSystemStats(account: string): Promise<API.v1.AccountObject> {
    return await asyncWaterfall(
      this.networkInfo.eosNodes.map(server => async () => {
        const client = getClient(this.fetchCors, server)
        return await client.v1.chain.get_account(account)
      })
    )
  }

  //
  // otherMethods
  //

  async getActivationSupportedCurrencies(): Promise<{
    result: { [code: string]: boolean }
  }> {
    try {
      const out = await asyncWaterfall(
        this.networkInfo.eosActivationServers.map(server => async () => {
          const uri = `${server}/api/v1/getSupportedCurrencies`
          const response = await this.fetchCors(uri)
          const result = await response.json()
          return {
            result
          }
        })
      )
      return asGetActivationSupportedCurrencies(out)
    } catch (e: any) {
      this.log.error(`UnableToGetSupportedCurrencies error: `, e)
      throw new Error('UnableToGetSupportedCurrencies')
    }
  }

  async getActivationCost(currencyCode: string): Promise<string | undefined> {
    try {
      const out = await asyncWaterfall(
        this.networkInfo.eosActivationServers.map(server => async () => {
          const uri = `${server}/api/v1/eosPrices/${currencyCode}`
          const response = await this.fetchCors(uri)
          const prices = asGetActivationCost(await response.json())
          const startingResourcesUri = `${server}/api/v1/startingResources/${currencyCode}`
          const startingResourcesResponse = await this.fetchCors(
            startingResourcesUri
          )
          const startingResources = asGetActivationCost(
            await startingResourcesResponse.json()
          )
          const totalEos =
            Number(prices.ram) * startingResources.ram +
            Number(prices.net) * startingResources.net +
            Number(prices.cpu) * startingResources.cpu
          const totalEosString = totalEos.toString()
          const price = toFixed(totalEosString, 0, 4)
          return price
        })
      )
      return out
    } catch (e: any) {
      this.log.error(`ErrorUnableToGetCost: `, e)
      throw new Error('ErrorUnableToGetCost')
    }
  }

  async validateAccount(
    account: string
  ): Promise<{ result: '' | 'AccountAvailable' }> {
    const valid = checkAddress(account) && account.length === 12
    const out: { result: '' | 'AccountAvailable' } = { result: '' }
    if (!valid) {
      const e = new Error('ErrorInvalidAccountName')
      e.name = 'ErrorInvalidAccountName'
      throw e
    }
    try {
      const result = await this.getAccSystemStats(account)
      if (result != null) {
        const e = new Error('ErrorAccountUnavailable')
        e.name = 'ErrorAccountUnavailable'
        throw e
      }
      throw new Error('ErrorUnknownError')
    } catch (e: any) {
      if (
        e instanceof APIError &&
        e.details[0].message.includes('unknown key')
      ) {
        out.result = 'AccountAvailable'
      } else {
        throw e
      }
    }
    this.log(`validateAccount: result=${out.result}`)
    return out
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<EosNetworkInfo>
): Promise<EosTools> {
  return new EosTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<EosNetworkInfo>,
  infoPayload: EosInfoPayload
): Promise<void> {
  // In the future, other fields might not be "network info" fields
  const { ...networkInfo } = infoPayload

  // Update plugin NetworkInfo:
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './EosEngine'
