/**
 * Created by paul on 8/8/17.
 */
// @flow
import { currencyInfo } from './currencyInfoETH.js'
import { EthereumEngine } from './currencyEngineETH.js'
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
  return currencyInfo.getInfo.denominations.find(element => {
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

class ABCParsedURI {
  publicAddress:string
  nativeAmount:string|null
  currencyCode:string|null
  label:string|null
  message:string|null

  constructor (
    publicAddress:string,
    nativeAmount:string|null,
    currencyCode:string|null,
    label:string|null,
    message:string|null
  ) {
    this.publicAddress = publicAddress
    this.nativeAmount = nativeAmount
    this.currencyCode = currencyCode
    this.label = label
    this.message = message
  }
}

class EthereumPlugin {
  static async makePlugin (opts: any) {
    io = opts.io

    return {
      pluginName: 'ethereum',
      currencyInfo: currencyInfo.getInfo,

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

      derivePublicKey: (walletInfo: any) => {
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

        return new ABCParsedURI(address, nativeAmount, currencyCode, label, message)
      },

      encodeUri: (obj: any) => {
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

          if (obj.nativeAmount) {
            let currencyCode: string = 'ETH'
            if (typeof obj.currencyCode === 'string') {
              currencyCode = obj.currencyCode
            }
            const denom = getDenomInfo(currencyCode)
            if (!denom) {
              throw new Error('InternalErrorInvalidCurrencyCode')
            }
            let amount = bns.divf(obj.nativeAmount, denom.multiplier)

            queryString += 'amount=' + amount.toString() + '&'
          }
          if (obj.label) {
            queryString += 'label=' + obj.label + '&'
          }
          if (obj.message) {
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
  }
}

export { EthereumPlugin }
