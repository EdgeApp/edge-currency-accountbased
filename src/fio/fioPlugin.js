// @flow

import { FIOSDK } from '@fioprotocol/fiosdk'
import { bns } from 'biggystring'
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

import { CurrencyPlugin } from '../common/plugin.js'
import { asyncWaterfall, getDenomInfo, shuffleArray } from '../common/utils'
import { FIO_REG_API_ENDPOINTS } from './fioConst.js'
import { FioEngine } from './fioEngine'
import { fioApiErrorCodes, FioError } from './fioError.js'
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

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type === FIO_TYPE) {
      const buffer = this.io.random(32)
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
    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
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
    if (parsedUri.query.memo_type) {
      if (parsedUri.query.memo_type === 'MEMO_ID') {
        if (parsedUri.query.memo) {
          const m = bns.add(parsedUri.query.memo, '0')
          // Check if the memo is an integer
          if (m !== parsedUri.query.memo) {
            throw new Error('ErrorInvalidMemoId')
          }
          edgeParsedUri.uniqueIdentifier = parsedUri.query.memo
        }
      }
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
  const {
    tpid = 'finance@edge',
    fioRegApiToken = FIO_REG_SITE_API_KEY
  } = initOptions

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

          const connection = new FIOSDK(
            '',
            '',
            apiUrl,
            fetchCors,
            undefined,
            tpid
          )

          try {
            out = await connection.genericAction(actionName, params)
          } catch (e) {
            // handle FIO API error
            if (e.errorCode && fioApiErrorCodes.indexOf(e.errorCode) > -1) {
              out = {
                isError: true,
                data: {
                  code: e.errorCode,
                  message: e.message,
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
        return false
      }
      try {
        const isAvailableRes = await multicastServers('isAvailable', {
          fioName
        })

        return !isAvailableRes.is_registered
      } catch (e) {
        console.log('validateAccount error: ' + JSON.stringify(e))
        return false
      }
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
        console.log('doesAccountExist error: ' + JSON.stringify(e))
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
          return {
            error: true,
            code: result.status,
            ...data
          }
        }
        return result.json()
      } catch (e) {
        return { error: e }
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
          return {
            error: true,
            code: result.status,
            ...json
          }
        }
        return json.domains
      } catch (e) {
        return { error: e }
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
