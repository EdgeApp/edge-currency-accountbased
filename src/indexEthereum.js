/**
 * Created by paul on 8/8/17.
 */
// @flow
import { txLibInfo } from './currencyInfoETH.js'
import { EthereumEngine } from './currencyEngineETH.js'
import type {
  EsParsedUri,
  EsEncodeUri,
  EsCurrencyPlugin,
  // EsCurrencyPluginFactory,
  EsWalletInfo,
  EsMakeCurrencyPlugin
} from 'airbitz-core-js'
import { parse, serialize } from 'uri-js'
import { bns } from 'biggystring'
import { BN } from 'bn.js'

const Buffer = require('buffer/').Buffer
const ethWallet = require('../lib/export-fixes-bundle.js').Wallet
const EthereumUtil = require('../lib/export-fixes-bundle.js').Util

let io

const randomBuffer = (size) => {
  const array = io.random(size)
  return Buffer.from(array)
}

function getDenomInfo (denom:string) {
  return txLibInfo.currencyInfo.denominations.find(element => {
    return element.name === denom
  })
}

function hexToBuf (hex:string) {
  const noHexPrefix = hex.replace('0x', '')
  const noHexPrefixBN = new BN(noHexPrefix, 16)
  const array = noHexPrefixBN.toArray()
  const buf = Buffer.from(array)
  return buf
}

function getParameterByName (param, url) {
  const name = param.replace(/[[\]]/g, '\\$&')
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
  const results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

// class EthereumPlugin implements EsCurrencyPluginFactory {
//   static async makePlugin (opts: any):Promise<EsCurrencyPlugin> {
export const makeEthereumPlugin:EsMakeCurrencyPlugin = (opts:any): Promise<EsCurrencyPlugin> => {
  io = opts.io

  const plugin:EsCurrencyPlugin = {
    pluginName: 'ethereum',
    currencyInfo: txLibInfo.currencyInfo,

    createPrivateKey: (walletType: string) => {
      const type = walletType.replace('wallet:', '')

      if (type === 'ethereum') {
        const cryptoObj = {
          randomBytes: randomBuffer
        }
        ethWallet.overrideCrypto(cryptoObj)

        let wallet = ethWallet.generate(false)
        const ethereumKey = wallet.getPrivateKeyString().replace('0x', '')
        return { ethereumKey }
      } else {
        throw new Error('InvalidWalletType')
      }
    },

    derivePublicKey: (walletInfo: EsWalletInfo) => {
      const type = walletInfo.type.replace('wallet:', '')
      if (type === 'ethereum') {
        const privKey = hexToBuf(walletInfo.keys.ethereumKey)
        const wallet = ethWallet.fromPrivateKey(privKey)

        const ethereumAddress = wallet.getAddressString()
        // const ethereumKey = '0x389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'
        // const ethereumPublicAddress = '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'
        return { ethereumAddress }
      } else {
        throw new Error('InvalidWalletType')
      }
    },

    // XXX Deprecated. To be removed once Core supports createPrivateKey and derivePublicKey -paulvp
    createMasterKeys: (walletType: string) => {
      if (walletType === 'ethereum') {
        const cryptoObj = {
          randomBytes: randomBuffer
        }
        ethWallet.overrideCrypto(cryptoObj)

        let wallet = ethWallet.generate(false)
        const ethereumKey = wallet.getPrivateKeyString().replace('0x', '')
        const ethereumPublicAddress = wallet.getAddressString()
        // const ethereumKey = '0x389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'
        // const ethereumPublicAddress = '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'
        return {ethereumKey, ethereumPublicAddress}
      } else {
        return null
      }
    },

    makeEngine: (keyInfo: any, opts: any = {}) => {
      return new EthereumEngine(io, keyInfo, opts)
    },

    parseUri: (uri: string) => {
      const parsedUri = parse(uri)
      let address: string
      let amount: number = 0
      let nativeAmount: string | null = null
      let currencyCode: string | null = null
      let label
      let message

      if (
        typeof parsedUri.scheme !== 'undefined' &&
        parsedUri.scheme !== 'ethereum'
      ) {
        throw new Error('InvalidUriError')
      }
      if (typeof parsedUri.host !== 'undefined') {
        address = parsedUri.host
      } else if (typeof parsedUri.path !== 'undefined') {
        address = parsedUri.path
      } else {
        throw new Error('InvalidUriError')
      }
      address = address.replace('/', '') // Remove any slashes
      const valid: boolean = EthereumUtil.isValidAddress(address)
      if (!valid) {
        throw new Error('InvalidPublicAddressError')
      }
      const amountStr = getParameterByName('amount', uri)
      if (amountStr && typeof amountStr === 'string') {
        amount = parseFloat(amountStr)
        const denom = getDenomInfo('ETH')
        if (!denom) {
          throw new Error('InternalErrorInvalidCurrencyCode')
        }
        nativeAmount = bns.mulf(amount, denom.multiplier)
        currencyCode = 'ETH'
      }
      label = getParameterByName('label', uri)
      message = getParameterByName('message', uri)

      const esParsedUri:EsParsedUri = {
        publicAddress: address
      }
      if (nativeAmount) {
        esParsedUri.nativeAmount = nativeAmount
      }
      if (currencyCode) {
        esParsedUri.currencyCode = currencyCode
      }
      if (label) {
        esParsedUri.label = label
      }
      if (message) {
        esParsedUri.message = message
      }

      return esParsedUri
    },

    encodeUri: (obj: EsEncodeUri) => {
      if (!obj.publicAddress) {
        throw new Error('InvalidPublicAddressError')
      }
      const valid: boolean = EthereumUtil.isValidAddress(obj.publicAddress)
      if (!valid) {
        throw new Error('InvalidPublicAddressError')
      }
      if (!obj.nativeAmount && !obj.label && !obj.message) {
        return obj.publicAddress
      } else {
        let queryString: string = ''

        if (typeof obj.nativeAmount === 'string') {
          let currencyCode: string = 'ETH'
          let nativeAmount:string = obj.nativeAmount
          if (typeof obj.currencyCode === 'string') {
            currencyCode = obj.currencyCode
          }
          const denom = getDenomInfo(currencyCode)
          if (!denom) {
            throw new Error('InternalErrorInvalidCurrencyCode')
          }
          let amount = bns.divf(nativeAmount, denom.multiplier)

          queryString += 'amount=' + amount.toString() + '&'
        }
        if (typeof obj.label === 'string') {
          queryString += 'label=' + obj.label + '&'
        }
        if (typeof obj.message === 'string') {
          queryString += 'message=' + obj.message + '&'
        }
        queryString = queryString.substr(0, queryString.length - 1)

        const serializeObj = {
          scheme: 'ethereum',
          path: obj.publicAddress,
          query: queryString
        }
        const url = serialize(serializeObj)
        return url
      }
    }
  }
  async function helperfunc (opts:any) {
    return plugin
  }
  return helperfunc(opts)
}
