/**
 * Created by paul on 8/8/17.
 */
// @flow
// import { currencyInfo } from './currencyInfoXRP.js'
import type {
  EdgeParsedUri,
  EdgeEncodeUri,
  EdgeWalletInfo,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyInfo
} from 'edge-core-js'
import { getDenomInfo } from '../common/utils.js'
import { serialize } from 'uri-js'
import parse from 'url-parse'
import { bns } from 'biggystring'

// TODO: pass in denoms pull code into common
export class CurrencyPlugin {
  pluginName: string
  currencyInfo: EdgeCurrencyInfo
  highestTxHeight: number

  constructor (pluginName: string, currencyInfo: EdgeCurrencyInfo) {
    this.pluginName = pluginName
    this.currencyInfo = currencyInfo
    this.highestTxHeight = 0
  }

  createPrivateKey (walletType: string) {
    throw new Error('Must implement createPrivateKey')
  }

  derivePublicKey (walletInfo: EdgeWalletInfo) {
    throw new Error('Must implement derivePublicKey')
  }

  async makeEngine (
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    throw new Error('Must implement makeEngine')
  }

  parseUri (uri: string) {
    throw new Error('Must implement parseUri')
  }

  encodeUri (obj: EdgeEncodeUri) {
    throw new Error('Must implement encodeUri')
  }

  parseUriCommon (
    currencyInfo: EdgeCurrencyInfo,
    uri: string,
    networks: { [network: string]: boolean }
  ) {
    const parsedUri = parse(uri, {}, true)
    let address: string

    // Remove ":" from protocol
    if (parsedUri.protocol) {
      parsedUri.protocol = parsedUri.protocol.replace(':', '')
    }

    if (parsedUri.protocol && !networks[parsedUri.protocol]) {
      throw new Error('InvalidUriError') // possibly scanning wrong crypto type
    }

    if (parsedUri.host) {
      address = parsedUri.host
    } else if (parsedUri.pathname) {
      address = parsedUri.pathname
    } else {
      throw new Error('InvalidUriError')
    }

    address = address.replace('/', '') // Remove any slashes

    const label = parsedUri.query.label
    const message = parsedUri.query.message
    const category = parsedUri.query.category
    let currencyCode = parsedUri.query.currencyCode

    const edgeParsedUri: EdgeParsedUri = {
      publicAddress: address
    }
    if (label || message || category) {
      edgeParsedUri.metadata = {}
      edgeParsedUri.metadata.name = label || undefined
      edgeParsedUri.metadata.notes = message || undefined
      edgeParsedUri.metadata.category = category || undefined
    }

    const amountStr = parsedUri.query.amount
    if (amountStr && typeof amountStr === 'string') {
      if (!currencyCode) {
        currencyCode = currencyInfo.currencyCode
      }
      const denom = getDenomInfo(currencyInfo, currencyCode)
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      let nativeAmount = bns.mul(amountStr, denom.multiplier)
      nativeAmount = bns.toFixed(nativeAmount, 0, 0)

      edgeParsedUri.nativeAmount = nativeAmount || undefined
      edgeParsedUri.currencyCode = currencyCode || undefined
    }

    return { edgeParsedUri, parsedUri }
  }

  encodeUriCommon (obj: EdgeEncodeUri, network: string, amount?: string) {
    if (!obj.publicAddress) {
      throw new Error('InvalidPublicAddressError')
    }
    if (!amount && !obj.label && !obj.message) {
      return obj.publicAddress
    } else {
      let queryString: string = ''
      if (amount) {
        queryString += 'amount=' + amount + '&'
      }
      if (obj.label || obj.message) {
        if (typeof obj.label === 'string') {
          queryString += 'label=' + obj.label + '&'
        }
        if (typeof obj.message === 'string') {
          queryString += 'message=' + obj.message + '&'
        }
      }
      queryString = queryString.substr(0, queryString.length - 1)

      const serializeObj = {
        scheme: network,
        path: obj.publicAddress,
        query: queryString
      }
      const url = serialize(serializeObj)
      return url
    }
  }
}
