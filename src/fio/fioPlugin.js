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
import { getDenomInfo } from '../common/utils.js'
import { FioEngine } from './fioEngine'
import { currencyInfo } from './fioInfo.js'

const FIO_CURRENCY_CODE = 'FIO'
const FIO_TYPE = 'fio'

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
  const { tpid = 'finance@edge' } = initOptions

  const connection = new FIOSDK(
    '',
    '',
    currencyInfo.defaultSettings.apiUrls[0],
    fetchCors,
    undefined,
    tpid
  )

  let toolsPromise: Promise<FioPlugin>
  function makeCurrencyTools(): Promise<FioPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new FioPlugin(io))
    return toolsPromise
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
    if (!currencyEngine.otherData.feeTransactions) {
      currencyEngine.otherData.feeTransactions = []
    }
    if (!currencyEngine.otherData.fioAddresses) {
      currencyEngine.otherData.fioAddresses = []
    }
    if (!currencyEngine.otherData.fioDomains) {
      currencyEngine.otherData.fioDomains = []
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
      return connection.getPublicAddress(fioAddress, chainCode, tokenCode)
    },
    async isFioAddressValid(fioAddress: string): Promise<boolean> {
      try {
        return FIOSDK.isFioAddressValid(fioAddress)
      } catch (e) {
        return false
      }
    },
    async validateAccount(fioAddress: string): Promise<boolean> {
      try {
        if (!FIOSDK.isFioAddressValid(fioAddress)) return false
      } catch (e) {
        return false
      }
      try {
        const isAvailableRes = await connection.isAvailable(fioAddress)

        return !isAvailableRes.is_registered
      } catch (e) {
        console.log('validateAccount error: ' + JSON.stringify(e))
        return false
      }
    },
    async doesAccountExist(fioAddress: string): Promise<boolean> {
      try {
        if (!FIOSDK.isFioAddressValid(fioAddress)) return false
      } catch (e) {
        return false
      }
      try {
        const isAvailableRes = await connection.isAvailable(fioAddress)

        return isAvailableRes.is_registered
      } catch (e) {
        console.log('doesAccountExist error: ' + JSON.stringify(e))
        return false
      }
    },
    async buyAddressRequest(options: any): Promise<any> {
      try {
        const result = await fetchCors(
          currencyInfo.defaultSettings.fioAddressRegApiUrl,
          {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(options)
          }
        )
        return result.json()
      } catch (e) {
        return { error: e }
      }
    },
    getRegDomainUrl(): string {
      return currencyInfo.defaultSettings.fioDomainRegUrl
    }
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools,
    otherMethods
  }
}
