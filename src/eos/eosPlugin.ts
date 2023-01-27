import { API, APIClient, FetchProvider, PrivateKey } from '@greymass/eosio'
import { div, toFixed } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeFetchFunction,
  EdgeIo,
  EdgeLog,
  EdgeParsedUri,
  EdgeToken,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { asMaybeContractLocation, validateToken } from '../common/tokenHelpers'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import { asyncWaterfall, getDenomInfo, getFetchCors } from '../common/utils'
import {
  asGetActivationCost,
  asGetActivationSupportedCurrencies
} from './eosSchema'
import { EosNetworkInfo } from './eosTypes'

export function checkAddress(address: string): boolean {
  return /^[a-z0-9.]{1,12}$/.test(address)
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
  currencyInfo: EdgeCurrencyInfo
  fetchCors: EdgeFetchFunction
  io: EdgeIo
  log: EdgeLog
  networkInfo: EosNetworkInfo

  constructor(env: PluginEnvironment<EosNetworkInfo>) {
    const { currencyInfo, io, log, networkInfo } = env
    this.io = io
    this.log = log
    this.currencyInfo = currencyInfo
    this.networkInfo = networkInfo
    this.fetchCors = getFetchCors(env)
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
      // TODO: User currency library to create private key as a string
      // Use io.random() for random number generation
      // Multiple keys can be created and stored here. ie. If there is both a mnemonic and key format,
      // Generate and store them here by returning an arbitrary object with them.
      let entropy = Buffer.from(this.io.random(32)).toString('hex')
      const eosOwnerKey = PrivateKey.from(entropy).toWif()
      entropy = Buffer.from(this.io.random(32)).toString('hex')
      const eosKey = PrivateKey.from(entropy).toWif()
      return { eosOwnerKey, eosKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    const currencyInfoType = this.currencyInfo.walletType.replace('wallet:', '')
    if (type === currencyInfoType) {
      // TODO: User currency library to derive the public keys/addresses from the private key.
      // Multiple keys can be generated and stored if needed. Do not store an HD chain
      // but rather just different versions of the master public key
      // const publicKey = derivePubkey(walletInfo.keys.eosKey)
      // const publicKey = deriveAddress(walletInfo.keys.eosKey)
      const publicKey = PrivateKey.from(walletInfo.keys.eosKey)
        .toPublic()
        .toLegacyString()
      let ownerPublicKey
      // usage of eosOwnerKey must be protected by conditional
      // checking for its existence
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (walletInfo.keys.eosOwnerKey) {
        ownerPublicKey = PrivateKey.from(walletInfo.keys.eosOwnerKey)
          .toPublic()
          .toLegacyString()
      }
      return { publicKey, ownerPublicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const { edgeParsedUri } = parseUriCommon(this.currencyInfo, uri, {
      [this.networkInfo.uriProtocol]: true
    })

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
    const valid = checkAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    return edgeParsedUri
  }

  async encodeUri(obj: EdgeEncodeUri): Promise<string> {
    const valid = checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode = this.currencyInfo.currencyCode
      const nativeAmount = obj.nativeAmount
      const denom = getDenomInfo(this.currencyInfo, currencyCode)
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
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (result) {
        const e = new Error('ErrorAccountUnavailable')
        e.name = 'ErrorAccountUnavailable'
        throw e
      }
      throw new Error('ErrorUnknownError')
    } catch (e: any) {
      if (e.code === 'ErrorUnknownAccount') {
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

export { makeCurrencyEngine } from './eosEngine'
