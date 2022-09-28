/**
 * Created by paul on 8/8/17.
 */

import { mul, toFixed } from 'biggystring'
// import { currencyInfo } from './currencyInfoXRP'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeEncodeUri,
  EdgeIo,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeToken,
  EdgeWalletInfo
} from 'edge-core-js/types'
import { serialize } from 'uri-js'
import parse from 'url-parse'

import { getDenomInfo } from '../common/utils'

type ParsedUri = parse<Record<string, string | undefined>>

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

  async createPrivateKey(_walletType: string): Promise<Object> {
    throw new Error('Must implement createPrivateKey')
  }

  async derivePublicKey(_walletInfo: EdgeWalletInfo): Promise<Object> {
    throw new Error('Must implement derivePublicKey')
  }

  async makeEngine(
    _walletInfo: EdgeWalletInfo,
    _opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    throw new Error('Must implement makeEngine')
  }

  async parseUri(_uri: string): Promise<EdgeParsedUri> {
    throw new Error('Must implement parseUri')
  }

  async encodeUri(_obj: EdgeEncodeUri): Promise<string> {
    throw new Error('Must implement encodeUri')
  }

  parseUriCommon(
    currencyInfo: EdgeCurrencyInfo,
    uri: string,
    networks: { [network: string]: boolean },
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): { edgeParsedUri: EdgeParsedUri; parsedUri: ParsedUri } {
    const parsedUri = { ...parse(uri, {}, true) }

    // Add support for renproject Gateway URI type
    const isGateway = uri.startsWith(`${currencyInfo.pluginId}://`)

    // Remove ":" from protocol
    if (parsedUri.protocol != null) {
      parsedUri.protocol = parsedUri.protocol.replace(':', '')
    }

    // Wrong crypto or protocol is not supported
    if (
      parsedUri.protocol != null &&
      parsedUri.protocol !== '' &&
      !networks[parsedUri.protocol]
    ) {
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

    if (label != null || message != null || category != null || isGateway) {
      edgeParsedUri.metadata = {}
      edgeParsedUri.metadata.name = label
      edgeParsedUri.metadata.notes = message
      edgeParsedUri.metadata.category = category
      // @ts-expect-error
      edgeParsedUri.metadata.gateway = isGateway ?? false
    }

    const amountStr = parsedUri.query.amount
    if (amountStr != null && typeof amountStr === 'string') {
      if (currencyCode == null) {
        currencyCode = currencyInfo.currencyCode
      }
      const denom = getDenomInfo(currencyInfo, currencyCode ?? '', customTokens)
      if (denom == null) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      let nativeAmount = mul(amountStr, denom.multiplier)
      nativeAmount = toFixed(nativeAmount, 0, 0)

      edgeParsedUri.nativeAmount = nativeAmount
      edgeParsedUri.currencyCode = currencyCode
    }

    return { edgeParsedUri, parsedUri }
  }

  encodeUriCommon(
    obj: EdgeEncodeUri,
    network: string,
    amount?: string
  ): string {
    if (obj.publicAddress == null) {
      throw new Error('InvalidPublicAddressError')
    }
    if (amount == null && obj.label == null && obj.message == null) {
      return obj.publicAddress
    } else {
      let queryString: string = ''
      if (amount != null) {
        queryString += 'amount=' + amount + '&'
      }
      if (obj.label != null || obj.message != null) {
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

  async getTokenId(_token: EdgeToken): Promise<string> {
    return this.currencyInfo.pluginId
  }
}
