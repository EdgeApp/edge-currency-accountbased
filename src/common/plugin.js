/**
 * Created by paul on 8/8/17.
 */
// @flow

import { bns } from 'biggystring'
// import { currencyInfo } from './currencyInfoXRP.js'
import {
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeMetaToken,
  type EdgeParsedUri,
  type EdgeToken,
  type EdgeWalletInfo
} from 'edge-core-js/types'
import { serialize } from 'uri-js'
import parse from 'url-parse'

import { getDenomInfo } from '../common/utils.js'

// TODO: pass in denoms pull code into common
export class CurrencyPlugin {
  io: EdgeIo
  pluginId: string
  currencyInfo: EdgeCurrencyInfo
  highestTxHeight: number

  constructor(io: EdgeIo, pluginId: string, currencyInfo: EdgeCurrencyInfo) {
    this.io = io
    this.pluginId = pluginId
    this.currencyInfo = currencyInfo
    this.highestTxHeight = 0
  }

  async createPrivateKey(walletType: string) {
    throw new Error('Must implement createPrivateKey')
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo) {
    throw new Error('Must implement derivePublicKey')
  }

  async makeEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    throw new Error('Must implement makeEngine')
  }

  async parseUri(uri: string) {
    throw new Error('Must implement parseUri')
  }

  async encodeUri(obj: EdgeEncodeUri) {
    throw new Error('Must implement encodeUri')
  }

  parseUriCommon(
    currencyInfo: EdgeCurrencyInfo,
    uri: string,
    networks: { [network: string]: boolean },
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ) {
    const parsedUri = parse(uri, {}, true)

    // Add support for renproject Gateway URI type
    const isGateway = uri.startsWith(`${currencyInfo.pluginId}://`)

    // Remove ":" from protocol
    if (parsedUri.protocol) {
      parsedUri.protocol = parsedUri.protocol.replace(':', '')
    }

    // Wrong crypto type or protocol is not supported
    if (parsedUri.protocol && !networks[parsedUri.protocol]) {
      throw new Error(
        `Uri protocol '${parsedUri.protocol}' is not supported for ${currencyInfo.pluginId}.`
      )
    }

    // If no host and no path, then it's not a valid URI
    if (parsedUri.host === '' && parsedUri.pathname === '') {
      throw new Error('Path and host not found in uri.')
    }

    // Address uses the host if present to support URLs with double-slashes (//)
    const publicAddress =
      parsedUri.host !== '' ? parsedUri.host : parsedUri.pathname.split('/')[0]

    const edgeParsedUri: EdgeParsedUri = {
      publicAddress
    }

    // Metadata query parameters
    const label = parsedUri.query.label
    const message = parsedUri.query.message
    const category = parsedUri.query.category

    if (label || message || category || isGateway) {
      edgeParsedUri.metadata = {}
      edgeParsedUri.metadata.name = label || undefined
      edgeParsedUri.metadata.notes = message || undefined
      edgeParsedUri.metadata.category = category || undefined
      edgeParsedUri.metadata.gateway = isGateway || undefined
    }

    const amountStr = parsedUri.query.amount
    if (amountStr && typeof amountStr === 'string') {
      if (!currencyCode) {
        currencyCode = currencyInfo.currencyCode
      }
      const denom = getDenomInfo(currencyInfo, currencyCode, customTokens)
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

  encodeUriCommon(obj: EdgeEncodeUri, network: string, amount?: string) {
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

  async getTokenId(token: EdgeToken): Promise<string> {
    return this.currencyInfo.pluginId
  }
}
