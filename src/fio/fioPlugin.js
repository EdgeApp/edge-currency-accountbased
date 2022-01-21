// @flow

import { FIOSDK } from '@fioprotocol/fiosdk'
import { Transactions } from '@fioprotocol/fiosdk/lib/transactions/Transactions'
import { bns } from 'biggystring'
import { validateMnemonic } from 'bip39'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'
import ecc from 'eosjs-ecc'

import { CurrencyPlugin } from '../common/plugin.js'
import {
  asyncWaterfall,
  getDenomInfo,
  safeErrorMessage,
  shuffleArray
} from '../common/utils'
import {
  DEFAULT_APR,
  FIO_REG_API_ENDPOINTS,
  FIO_REQUESTS_TYPES
} from './fioConst'
import { FioEngine } from './fioEngine'
import { fioApiErrorCodes, FioError, fioRegApiErrorCodes } from './fioError.js'
import { currencyInfo } from './fioInfo.js'

const FIO_CURRENCY_CODE = 'FIO'
const FIO_TYPE = 'fio'
const FIO_REG_SITE_API_KEY = ''

type DomainItem = { domain: string, free: boolean }

export function checkAddress(address: string): boolean {
  const start = address.startsWith(FIO_CURRENCY_CODE)
  const length = address.length === 53
  return start && length
}

export class FioPlugin extends CurrencyPlugin {
  otherMethods: Object

  constructor(io: EdgeIo) {
    super(io, FIO_TYPE, currencyInfo)
  }

  async importPrivateKey(userInput: string): Promise<Object> {
    const { pluginId } = this.currencyInfo
    const keys = {}
    if (/[0-9a-zA-Z]{51}$/.test(userInput)) {
      if (!ecc.isValidPrivate(userInput)) {
        throw new Error('Invalid private key')
      }

      keys.fioKey = userInput
    } else {
      // it looks like a mnemonic, so validate that way:
      if (!validateMnemonic(userInput)) {
        // "input" instead of "mnemonic" in case private key
        // was just the wrong length
        throw new Error('Invalid input')
      }
      const privKeys = await FIOSDK.createPrivateKeyMnemonic(userInput)
      keys.fioKey = privKeys.fioKey
      keys.mnemonic = privKeys.mnemonic
    }

    // Validate the address derivation:
    const pubKeys = await this.derivePublicKey({
      type: `wallet:${pluginId}`,
      id: 'fake',
      keys
    })
    keys.publicKey = pubKeys.publicKey

    return keys
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type === FIO_TYPE) {
      const buffer = Buffer.from(this.io.random(32))
      return FIOSDK.createPrivateKey(buffer)
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
    const { edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      {
        fio: true
      },
      FIO_CURRENCY_CODE
    )
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
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 16)
    }
    const encodedUri = this.encodeUriCommon(obj, FIO_TYPE, amount)
    return encodedUri
  }
}

export function makeFioPlugin(opts: EdgeCorePluginOptions): EdgeCurrencyPlugin {
  const { initOptions, io } = opts
  const { fetchCors = io.fetch } = io
  const { tpid = 'finance@edge', fioRegApiToken = FIO_REG_SITE_API_KEY } =
    initOptions
  const connection = new FIOSDK('', '', '', fetchCors, undefined, tpid)

  let toolsPromise: Promise<FioPlugin>
  function makeCurrencyTools(): Promise<FioPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new FioPlugin(io))
    return toolsPromise
  }

  async function multicastServers(
    actionName: string,
    params?: any
  ): Promise<any> {
    const res = await asyncWaterfall(
      shuffleArray(
        currencyInfo.defaultSettings.apiUrls.map(apiUrl => async () => {
          let out

          Transactions.baseUrl = apiUrl

          try {
            out = await connection.genericAction(actionName, params)
          } catch (e) {
            // handle FIO API error
            if (e.errorCode && fioApiErrorCodes.indexOf(e.errorCode) > -1) {
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

    if (res.isError) {
      const error = new FioError(res.errorMessage)
      error.json = res.data.json
      error.list = res.data.list
      error.errorCode = res.data.code

      throw error
    }

    return res
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new FioEngine(
      tools,
      walletInfo,
      opts,
      fetchCors,
      tpid
    )
    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    // Initialize otherData defaults if they weren't on disk
    if (!currencyEngine.otherData.highestTxHeight) {
      currencyEngine.otherData.highestTxHeight = 0
    }
    if (!currencyEngine.otherData.fioAddresses) {
      currencyEngine.otherData.fioAddresses = []
    }
    if (!currencyEngine.otherData.fioDomains) {
      currencyEngine.otherData.fioDomains = []
    }
    if (!currencyEngine.otherData.fioRequestsToApprove) {
      currencyEngine.otherData.fioRequestsToApprove = {}
    }
    if (!currencyEngine.otherData.fioRequests) {
      currencyEngine.otherData.fioRequests = {
        [FIO_REQUESTS_TYPES.SENT]: [],
        [FIO_REQUESTS_TYPES.PENDING]: []
      }
    }
    if (currencyEngine.otherData.stakingStatus == null) {
      currencyEngine.otherData.stakingStatus = {
        stakedAmounts: []
      }
    }

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  const otherMethods = {
    async getConnectedPublicAddress(
      fioAddress: string,
      chainCode: string,
      tokenCode: string
    ) {
      try {
        FIOSDK.isFioAddressValid(fioAddress)
      } catch (e) {
        throw new FioError(
          '',
          400,
          currencyInfo.defaultSettings.errorCodes.INVALID_FIO_ADDRESS
        )
      }
      try {
        const isAvailableRes = await multicastServers('isAvailable', {
          fioName: fioAddress
        })
        if (!isAvailableRes.is_registered) {
          throw new FioError(
            '',
            404,
            currencyInfo.defaultSettings.errorCodes.FIO_ADDRESS_IS_NOT_EXIST
          )
        }
      } catch (e) {
        if (
          e.name === 'FioError' &&
          e.json &&
          e.json.fields &&
          e.errorCode === 400
        ) {
          e.labelCode =
            currencyInfo.defaultSettings.errorCodes.INVALID_FIO_ADDRESS
        }

        throw e
      }
      try {
        const result = await multicastServers('getPublicAddress', {
          fioAddress,
          chainCode,
          tokenCode
        })
        if (!result.public_address || result.public_address === '0') {
          throw new FioError(
            '',
            404,
            currencyInfo.defaultSettings.errorCodes.FIO_ADDRESS_IS_NOT_LINKED
          )
        }
        return result
      } catch (e) {
        if (
          (e.name === 'FioError' &&
            e.labelCode ===
              currencyInfo.defaultSettings.errorCodes
                .FIO_ADDRESS_IS_NOT_LINKED) ||
          e.errorCode === 404
        ) {
          throw new FioError(
            '',
            404,
            currencyInfo.defaultSettings.errorCodes.FIO_ADDRESS_IS_NOT_LINKED
          )
        }
        throw e
      }
    },
    async isFioAddressValid(fioAddress: string): Promise<boolean> {
      try {
        return FIOSDK.isFioAddressValid(fioAddress)
      } catch (e) {
        return false
      }
    },
    async validateAccount(
      fioName: string,
      isDomain: boolean = false
    ): Promise<boolean> {
      try {
        if (isDomain) {
          if (!FIOSDK.isFioDomainValid(fioName)) return false
        } else {
          if (!FIOSDK.isFioAddressValid(fioName)) return false
        }
      } catch (e) {
        throw new FioError(
          '',
          400,
          currencyInfo.defaultSettings.errorCodes.INVALID_FIO_ADDRESS
        )
      }
      try {
        const isAvailableRes = await multicastServers('isAvailable', {
          fioName
        })

        return !isAvailableRes.is_registered
      } catch (e) {
        if (
          e.name === 'FioError' &&
          e.json &&
          e.json.fields &&
          e.errorCode === 400
        ) {
          e.labelCode =
            currencyInfo.defaultSettings.errorCodes.INVALID_FIO_ADDRESS
        }

        throw e
      }
    },
    async isDomainPublic(domain): Promise<boolean> {
      const isAvailableRes = await multicastServers('isAvailable', {
        fioName: domain
      })
      if (!isAvailableRes.is_registered)
        throw new FioError(
          '',
          400,
          currencyInfo.defaultSettings.errorCodes.FIO_DOMAIN_IS_NOT_EXIST
        )
      const result = await fetchCors(
        `${currencyInfo.defaultSettings.fioRegApiUrl}${FIO_REG_API_ENDPOINTS.isDomainPublic}/${domain}`,
        {
          method: 'GET'
        }
      )
      if (!result.ok) {
        const data = await result.json()
        throw new FioError(
          '',
          result.status,
          currencyInfo.defaultSettings.errorCodes.IS_DOMAIN_PUBLIC_ERROR,
          data
        )
      }
      const { isPublic } = await result.json()
      return isPublic
    },
    async doesAccountExist(fioName: string): Promise<boolean> {
      try {
        if (!FIOSDK.isFioAddressValid(fioName)) return false
      } catch (e) {
        return false
      }
      try {
        const isAvailableRes = await multicastServers('isAvailable', {
          fioName
        })

        return isAvailableRes.is_registered
      } catch (e) {
        this.error('doesAccountExist error: ', e)
        return false
      }
    },
    async buyAddressRequest(
      options: {
        address: string,
        referralCode: string,
        publicKey: string,
        apiToken?: string
      },
      isFree: boolean = false
    ): Promise<any> {
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
      if (isFree) {
        options.apiToken = fioRegApiToken
      }
      try {
        const result = await fetchCors(
          `${currencyInfo.defaultSettings.fioRegApiUrl}${FIO_REG_API_ENDPOINTS.buyAddress}`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify(options)
          }
        )
        if (!result.ok) {
          const data = await result.json()

          if (fioRegApiErrorCodes[data.errorCode]) {
            throw new FioError(
              data.error,
              result.status,
              fioRegApiErrorCodes[data.errorCode],
              data
            )
          }

          if (data.error === 'Already registered') {
            throw new FioError(
              data.error,
              result.status,
              fioRegApiErrorCodes.ALREADY_REGISTERED,
              data
            )
          }

          throw new Error(data.error)
        }
        return result.json()
      } catch (e) {
        if (e.labelCode) throw e
        throw new FioError(
          safeErrorMessage(e),
          500,
          currencyInfo.defaultSettings.errorCodes.SERVER_ERROR
        )
      }
    },
    async getDomains(ref: string = ''): Promise<DomainItem[] | { error: any }> {
      if (!ref) ref = currencyInfo.defaultSettings.defaultRef
      try {
        const result = await fetchCors(
          `${currencyInfo.defaultSettings.fioRegApiUrl}${FIO_REG_API_ENDPOINTS.getDomains}/${ref}`,
          {
            method: 'GET'
          }
        )
        const json = await result.json()
        if (!result.ok) {
          if (fioRegApiErrorCodes[json.errorCode]) {
            throw new FioError(
              json.error,
              result.status,
              fioRegApiErrorCodes[json.errorCode],
              json
            )
          }

          throw new Error(json.error)
        }
        return json.domains
      } catch (e) {
        if (e.labelCode) throw e
        throw new FioError(
          safeErrorMessage(e),
          500,
          currencyInfo.defaultSettings.errorCodes.SERVER_ERROR
        )
      }
    },
    async getStakeEstReturn(): Promise<number | { error: any }> {
      try {
        const result = await fetchCors(
          `${currencyInfo.defaultSettings.fioStakingApyUrl}`,
          {
            method: 'GET'
          }
        )
        const json: {
          staked_token_pool: number,
          outstanding_srps: number,
          rewards_token_pool: number,
          combined_token_pool: number,
          staking_rewards_reserves_minted: number,
          roe: number,
          activated: boolean,
          historical_apr: {
            '1day': number | null,
            '7day': number | null,
            '30day': number | null
          }
        } = await result.json()
        if (!result.ok) {
          throw new Error(currencyInfo.defaultSettings.errorCodes.SERVER_ERROR)
        }
        const apr = json.historical_apr['7day']
        return (apr != null && apr > DEFAULT_APR) || apr == null
          ? DEFAULT_APR
          : apr
      } catch (e) {
        if (e.labelCode) throw e
        throw new FioError(
          e.message,
          500,
          currencyInfo.defaultSettings.errorCodes.SERVER_ERROR
        )
      }
    }
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools,
    otherMethods
  }
}
