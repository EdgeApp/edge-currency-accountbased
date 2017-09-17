/**
 * Created by paul on 8/8/17.
 */
// @flow
import { txLibInfo } from './currencyInfoETH.js'
import { EthereumEngine } from './currencyEngineETH.js'
import { DATA_STORE_FILE, DATA_STORE_FOLDER, WalletLocalData } from './ethTypes.js'
import type {
  AbcParsedUri,
  AbcEncodeUri,
  AbcCurrencyPlugin,
  AbcCurrencyPluginFactory,
  AbcWalletInfo
} from 'airbitz-core-types'
import { parse, serialize } from 'uri-js'
import { bns } from 'biggystring'
import { BN } from 'bn.js'
// import { CurrencyInfoScheme } from './ethSchema.js'

export { calcMiningFee } from './miningFees.js'

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

// async function checkUpdateCurrencyInfo () {
//   while (this.engineOn) {
//     try {
//       const url = sprintf('%s/v1/currencyInfo/ETH', INFO_SERVERS[0])
//       const jsonObj = await this.fetchGet(url)
//       const valid = validateObject(jsonObj, CurrencyInfoScheme)
//
//       if (valid) {
//         io.console.info('Fetched valid currencyInfo')
//         io.console.info(jsonObj)
//       } else {
//         io.console.info('Error: Fetched invalid currencyInfo')
//       }
//     } catch (err) {
//       io.console.info('Error fetching currencyInfo: ' + err)
//     }
//     try {
//       await snooze(BLOCKHEIGHT_POLL_MILLISECONDS)
//     } catch (err) {
//       io.console.error(err)
//     }
//   }
// }

export const EthereumCurrencyPluginFactory: AbcCurrencyPluginFactory = {
  pluginType: 'currency',

  async makePlugin (opts:any):Promise<AbcCurrencyPlugin> {
    io = opts.io

    const ethereumPlugin:AbcCurrencyPlugin = {
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

      derivePublicKey: (walletInfo: AbcWalletInfo) => {
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

      async makeEngine (walletInfo: AbcWalletInfo, opts: any = {}):any {
        const ethereumEngine = new EthereumEngine(io, walletInfo, opts)
        try {
          const result =
            await ethereumEngine.walletLocalFolder
              .folder(DATA_STORE_FOLDER)
              .file(DATA_STORE_FILE)
              .getText(DATA_STORE_FOLDER, 'walletLocalData')

          ethereumEngine.walletLocalData = new WalletLocalData(result)
          ethereumEngine.walletLocalData.ethereumAddress = ethereumEngine.walletInfo.keys.ethereumAddress
        } catch (err) {
          try {
            io.console.info(err)
            io.console.info('No walletLocalData setup yet: Failure is ok')
            ethereumEngine.walletLocalData = new WalletLocalData(null)
            ethereumEngine.walletLocalData.ethereumAddress = ethereumEngine.walletInfo.keys.ethereumAddress
            await ethereumEngine.walletLocalFolder
              .folder(DATA_STORE_FOLDER)
              .file(DATA_STORE_FILE)
              .setText(JSON.stringify(this.walletLocalData))
          } catch (e) {
            io.console.error('Error writing to localDataStore. Engine not started:' + err)
          }
        }
        return ethereumEngine
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

        const abcParsedUri:AbcParsedUri = {
          publicAddress: address
        }
        if (nativeAmount) {
          abcParsedUri.nativeAmount = nativeAmount
        }
        if (currencyCode) {
          abcParsedUri.currencyCode = currencyCode
        }
        if (label || message) {
          abcParsedUri.metadata = {}
          if (label) {
            abcParsedUri.metadata.name = label
          }
          if (message) {
            abcParsedUri.metadata.message = message
          }
        }

        return abcParsedUri
      },

      encodeUri: (obj: AbcEncodeUri) => {
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
          if (obj.metadata && (obj.metadata.name || obj.metadata.message)) {
            if (typeof obj.metadata.name === 'string') {
              queryString += 'label=' + obj.metadata.name + '&'
            }
            if (typeof obj.metadata.message === 'string') {
              queryString += 'message=' + obj.metadata.message + '&'
            }
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
    async function initPlugin (opts:any) {
      // Try to grab currencyInfo from disk. If that fails, use defaults

      // try {
      //   const result =
      //     await this.walletLocalFolder
      //       .folder(DATA_STORE_FOLDER)
      //       .file(DATA_STORE_FILE)
      //       .getText(DATA_STORE_FOLDER, 'walletLocalData')
      //
      //   this.walletLocalData = new WalletLocalData(result)
      //   this.walletLocalData.ethereumAddress = this.walletInfo.keys.ethereumAddress
      // }

      // Spin off network query to get updated currencyInfo and save that to disk for future bootups

      return ethereumPlugin
    }
    return initPlugin(opts)
  }
}
