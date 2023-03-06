import { FIOSDK } from '@fioprotocol/fiosdk'
import { PrivateKey } from '@greymass/eosio'
import { div } from 'biggystring'
import { validateMnemonic } from 'bip39'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeFetchFunction,
  EdgeIo,
  EdgeParsedUri,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { PluginEnvironment } from '../common/innerPlugin'
import { encodeUriCommon, parseUriCommon } from '../common/uriHelpers'
import {
  asyncWaterfall,
  getDenomInfo,
  getFetchCors,
  safeErrorMessage,
  shuffleArray
} from '../common/utils'
import { DEFAULT_APR, FIO_REG_API_ENDPOINTS } from './fioConst'
import { fioApiErrorCodes, FioError } from './fioError'
import { currencyInfo } from './fioInfo'
import { FioNetworkInfo } from './fioTypes'

const FIO_CURRENCY_CODE = 'FIO'
const FIO_TYPE = 'fio'
const FIO_REG_SITE_API_KEY = ''

interface DomainItem {
  domain: string
  free: boolean
}

export function checkAddress(address: string): boolean {
  const start = address.startsWith(FIO_CURRENCY_CODE)
  const length = address.length === 53
  return start && length
}

export class FioTools implements EdgeCurrencyTools {
  io: EdgeIo
  currencyInfo: EdgeCurrencyInfo
  fetchCors: EdgeFetchFunction
  fioRegApiToken: string
  networkInfo: FioNetworkInfo
  tpid: string

  constructor(env: PluginEnvironment<FioNetworkInfo>) {
    const { initOptions, io, networkInfo } = env
    const { tpid = 'finance@edge', fioRegApiToken = FIO_REG_SITE_API_KEY } =
      initOptions

    this.io = io
    this.currencyInfo = currencyInfo
    this.fetchCors = getFetchCors(env)
    this.fioRegApiToken = fioRegApiToken
    this.networkInfo = networkInfo
    this.tpid = tpid

    // The sdk constructor will fetch and store abi definitions for future instances
    for (const baseUrl of this.networkInfo.apiUrls) {
      // eslint-disable-next-line
      new FIOSDK('', '', baseUrl, this.fetchCors, undefined, tpid)
    }
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const keys = {}
    if (/[0-9a-zA-Z]{51}$/.test(userInput)) {
      PrivateKey.fromString(userInput) // will throw if invalid

      // @ts-expect-error
      keys.fioKey = userInput
    } else {
      // it looks like a mnemonic, so validate that way:
      if (!validateMnemonic(userInput)) {
        // "input" instead of "mnemonic" in case private key
        // was just the wrong length
        throw new Error('Invalid input')
      }
      const privKeys = await FIOSDK.createPrivateKeyMnemonic(userInput)
      // @ts-expect-error
      keys.fioKey = privKeys.fioKey
      // @ts-expect-error
      keys.mnemonic = privKeys.mnemonic
    }

    // Validate the address derivation:
    const pubKeys = await this.derivePublicKey({
      type: `wallet:${pluginId}`,
      id: 'fake',
      keys
    })
    // @ts-expect-error
    keys.publicKey = pubKeys.publicKey

    return keys
  }

  async createPrivateKey(
    walletType: string
  ): Promise<{ fioKey: string; mnemonic: string }> {
    const type = walletType.replace('wallet:', '')
    if (type === FIO_TYPE) {
      const buffer = Buffer.from(this.io.random(32))
      const out: { fioKey: string; mnemonic: string } =
        await FIOSDK.createPrivateKey(buffer)
      return out
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === FIO_TYPE) {
      return FIOSDK.derivedPublicKey(walletInfo.keys.fioKey)
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const { edgeParsedUri } = parseUriCommon(
      currencyInfo,
      uri,
      {
        fio: true
      },
      FIO_CURRENCY_CODE
    )
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
      const currencyCode: string = FIO_CURRENCY_CODE
      const nativeAmount: string = obj.nativeAmount
      const denom = getDenomInfo(currencyInfo, currencyCode)
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = div(nativeAmount, denom.multiplier, 16)
    }
    const encodedUri = encodeUriCommon(obj, FIO_TYPE, amount)
    return encodedUri
  }

  //
  // otherMethods
  //

  async getConnectedPublicAddress(
    fioAddress: string,
    chainCode: string,
    tokenCode: string
  ): Promise<any> {
    try {
      FIOSDK.isFioAddressValid(fioAddress)
    } catch (e: any) {
      throw new FioError(
        '',
        400,
        this.networkInfo.errorCodes.INVALID_FIO_ADDRESS
      )
    }
    try {
      const isAvailableRes = await this.multicastServers('isAvailable', {
        fioName: fioAddress
      })
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!isAvailableRes.is_registered) {
        throw new FioError(
          '',
          404,
          this.networkInfo.errorCodes.FIO_ADDRESS_IS_NOT_EXIST
        )
      }
    } catch (e: any) {
      if (
        e.name === 'FioError' &&
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        e.json &&
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        e.json.fields &&
        e.errorCode === 400
      ) {
        e.labelCode = this.networkInfo.errorCodes.INVALID_FIO_ADDRESS
      }

      throw e
    }
    try {
      const result = await this.multicastServers('getPublicAddress', {
        fioAddress,
        chainCode,
        tokenCode
      })
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!result.public_address || result.public_address === '0') {
        throw new FioError(
          '',
          404,
          this.networkInfo.errorCodes.FIO_ADDRESS_IS_NOT_LINKED
        )
      }
      return result
    } catch (e: any) {
      if (
        (e.name === 'FioError' &&
          e.labelCode ===
            this.networkInfo.errorCodes.FIO_ADDRESS_IS_NOT_LINKED) ||
        e.errorCode === 404
      ) {
        throw new FioError(
          '',
          404,
          this.networkInfo.errorCodes.FIO_ADDRESS_IS_NOT_LINKED
        )
      }
      throw e
    }
  }

  async isFioAddressValid(fioAddress: string): Promise<boolean> {
    try {
      return FIOSDK.isFioAddressValid(fioAddress)
    } catch (e: any) {
      return false
    }
  }

  async validateAccount(
    fioName: string,
    isDomain: boolean = false
  ): Promise<boolean> {
    try {
      if (isDomain) {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!FIOSDK.isFioDomainValid(fioName)) return false
      } else {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!FIOSDK.isFioAddressValid(fioName)) return false
      }
    } catch (e: any) {
      throw new FioError(
        '',
        400,
        this.networkInfo.errorCodes.INVALID_FIO_ADDRESS
      )
    }
    try {
      const isAvailableRes = await this.multicastServers('isAvailable', {
        fioName
      })

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      return !isAvailableRes.is_registered
    } catch (e: any) {
      if (
        e.name === 'FioError' &&
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        e.json &&
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        e.json.fields &&
        e.errorCode === 400
      ) {
        e.labelCode = this.networkInfo.errorCodes.INVALID_FIO_ADDRESS
      }

      throw e
    }
  }

  async isDomainPublic(domain: string): Promise<boolean> {
    const isAvailableRes = await this.multicastServers('isAvailable', {
      fioName: domain
    })
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!isAvailableRes.is_registered)
      throw new FioError(
        '',
        400,
        this.networkInfo.errorCodes.FIO_DOMAIN_IS_NOT_EXIST
      )
    const result = await this.fetchCors(
      `${this.networkInfo.fioRegApiUrl}${FIO_REG_API_ENDPOINTS.isDomainPublic}/${domain}`,
      {
        method: 'GET'
      }
    )
    if (!result.ok) {
      const data = await result.json()
      throw new FioError(
        '',
        result.status,
        this.networkInfo.errorCodes.IS_DOMAIN_PUBLIC_ERROR,
        data
      )
    }
    const { isPublic } = await result.json()
    return isPublic
  }

  async doesAccountExist(fioName: string): Promise<boolean> {
    try {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!FIOSDK.isFioAddressValid(fioName)) return false
    } catch (e: any) {
      return false
    }
    try {
      const isAvailableRes = await this.multicastServers('isAvailable', {
        fioName
      })

      return isAvailableRes.is_registered
    } catch (e: any) {
      // @ts-expect-error
      this.error('doesAccountExist error: ', e)
      return false
    }
  }

  async buyAddressRequest(
    options: {
      address: string
      referralCode: string
      publicKey: string
      apiToken?: string
    },
    isFree: boolean = false
  ): Promise<any> {
    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
    if (isFree) {
      options.apiToken = this.fioRegApiToken
    }
    try {
      const result = await this.fetchCors(
        `${this.networkInfo.fioRegApiUrl}${FIO_REG_API_ENDPOINTS.buyAddress}`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(options)
        }
      )
      if (!result.ok) {
        const data = await result.json()
        // @ts-expect-error
        if (this.networkInfo.errorCodes[data.errorCode] != null) {
          throw new FioError(
            data.error,
            result.status,
            // @ts-expect-error
            this.networkInfo.errorCodes[data.errorCode],
            data
          )
        }

        if (data.error === 'Already registered') {
          throw new FioError(
            data.error,
            result.status,
            this.networkInfo.errorCodes.ALREADY_REGISTERED,
            data
          )
        }

        throw new Error(data.error)
      }
      return await result.json()
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (e.labelCode) throw e
      throw new FioError(
        safeErrorMessage(e),
        500,
        this.networkInfo.errorCodes.SERVER_ERROR
      )
    }
  }

  async getDomains(ref: string = ''): Promise<DomainItem[] | { error: any }> {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!ref) ref = this.networkInfo.defaultRef
    try {
      const result = await this.fetchCors(
        `${this.networkInfo.fioRegApiUrl}${FIO_REG_API_ENDPOINTS.getDomains}/${ref}`,
        {
          method: 'GET'
        }
      )
      const json = await result.json()
      if (!result.ok) {
        // @ts-expect-error
        if (this.networkInfo.errorCodes[json.errorCode] != null) {
          throw new FioError(
            json.error,
            result.status,
            // @ts-expect-error
            this.networkInfo.errorCodes[json.errorCode],
            json
          )
        }

        throw new Error(json.error)
      }
      return json.domains
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (e.labelCode) throw e
      throw new FioError(
        safeErrorMessage(e),
        500,
        this.networkInfo.errorCodes.SERVER_ERROR
      )
    }
  }

  async getStakeEstReturn(): Promise<number | { error: any }> {
    try {
      const result = await this.fetchCors(
        `${this.networkInfo.fioStakingApyUrl}`,
        {
          method: 'GET'
        }
      )
      const json: {
        staked_token_pool: number
        outstanding_srps: number
        rewards_token_pool: number
        combined_token_pool: number
        staking_rewards_reserves_minted: number
        roe: number
        activated: boolean
        historical_apr: {
          '1day': number | null
          '7day': number | null
          '30day': number | null
        }
      } = await result.json()
      if (!result.ok) {
        throw new Error(this.networkInfo.errorCodes.SERVER_ERROR)
      }
      const apr = json.historical_apr['7day']
      return (apr != null && apr > DEFAULT_APR) || apr == null
        ? DEFAULT_APR
        : apr
    } catch (e: any) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (e.labelCode) throw e
      throw new FioError(
        e.message,
        500,
        this.networkInfo.errorCodes.SERVER_ERROR
      )
    }
  }

  //
  // Helpers
  //

  private async multicastServers(
    actionName: string,
    params?: any
  ): Promise<any> {
    const res = await asyncWaterfall(
      shuffleArray(
        this.networkInfo.apiUrls.map(apiUrl => async () => {
          let out

          const connection = new FIOSDK(
            '',
            '',
            apiUrl,
            this.fetchCors,
            undefined,
            this.tpid
          )

          try {
            out = await connection.genericAction(actionName, params)
          } catch (e: any) {
            // handle FIO API error
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            if (e.errorCode && fioApiErrorCodes.includes(e.errorCode)) {
              out = {
                isError: true,
                data: {
                  code: e.errorCode,
                  message: safeErrorMessage(e),
                  json: e.json,
                  list: e.list
                }
              }
            } else {
              throw e
            }
          }

          return out
        })
      )
    )

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (res.isError) {
      const error = new FioError(res.errorMessage)
      error.json = res.data.json
      error.list = res.data.list
      error.errorCode = res.data.code

      throw error
    }

    return res
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<FioNetworkInfo>
): Promise<FioTools> {
  return new FioTools(env)
}

export { makeCurrencyEngine } from './fioEngine'
