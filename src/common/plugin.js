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
import { serialize } from 'uri-js'
import parse from 'url-parse'

// TODO: pass in denoms pull code into common
export class CurrencyPlugin {
  pluginName: string
  currencyInfo: EdgeCurrencyInfo

  constructor (pluginName: string, currencyInfo: EdgeCurrencyInfo) {
    this.pluginName = pluginName
    this.currencyInfo = currencyInfo
  }

  createPrivateKey (walletType: string) {
    throw new Error('Must implement createPrivateKey')
  }

  derivePublicKey (walletInfo: EdgeWalletInfo) {
    throw new Error('Must implement derivePublicKey')
  }

  async makeEngine (walletInfo: EdgeWalletInfo, opts: EdgeCurrencyEngineOptions): Promise<EdgeCurrencyEngine> {
    throw new Error('Must implement makeEngine')
  }

  parseUri (uri: string) {
    throw new Error('Must implement parseUri')
  }

  encodeUri (obj: EdgeEncodeUri) {
    throw new Error('Must implement encodeUri')
  }

  parseUriCommon (uri: string, networks: {[network: string]: boolean}) {
    const parsedUri = parse(uri, {}, true)
    let address: string

    // Remove ":" from protocol
    if (parsedUri.protocol) {
      parsedUri.protocol = parsedUri.protocol.replace(':', '')
    }

    if (
      parsedUri.protocol &&
      !networks[parsedUri.protocol]
    ) {
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

    const edgeParsedUri: EdgeParsedUri = {
      publicAddress: address
    }
    if (label || message || category) {
      edgeParsedUri.metadata = {}
      edgeParsedUri.metadata.name = label || undefined
      edgeParsedUri.metadata.message = message || undefined
      edgeParsedUri.metadata.category = category || undefined
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
