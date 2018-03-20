/**
 * Created by paul on 8/8/17.
 */
// @flow
import { currencyInfo } from './currencyInfoETH.js'
import { EthereumEngine } from './currencyEngineETH.js'
import { DATA_STORE_FILE, DATA_STORE_FOLDER, WalletLocalData } from './ethTypes.js'
import type {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeParsedUri,
  EdgeEncodeUri,
  EdgeCurrencyPlugin,
  EdgeCurrencyPluginFactory,
  EdgeWalletInfo
} from 'edge-core-js'
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

function getDenomInfo (denom: string) {
  return currencyInfo.denominations.find(element => {
    return element.name === denom
  })
}

function hexToBuf (hex: string) {
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
//         console.log('Fetched valid currencyInfo')
//         console.log(jsonObj)
//       } else {
//         console.log('Error: Fetched invalid currencyInfo')
//       }
//     } catch (err) {
//       console.log('Error fetching currencyInfo: ' + err)
//     }
//     try {
//       await snooze(BLOCKHEIGHT_POLL_MILLISECONDS)
//     } catch (err) {
//       console.log(err)
//     }
//   }
// }

export const ethereumCurrencyPluginFactory: EdgeCurrencyPluginFactory = {
  pluginType: 'currency',
  pluginName: currencyInfo.pluginName,

  async makePlugin (opts: any): Promise<EdgeCurrencyPlugin> {
    io = opts.io

    console.log(`Creating Currency Plugin for ethereum`)
    const ethereumPlugin:EdgeCurrencyPlugin = {
      pluginName: 'ethereum',
      currencyInfo,

      createPrivateKey: (walletType: string) => {
        const type = walletType.replace('wallet:', '')

        if (type === 'ethereum') {
          const cryptoObj = {
            randomBytes: randomBuffer
          }
          ethWallet.overrideCrypto(cryptoObj)

          const wallet = ethWallet.generate(false)
          const ethereumKey = wallet.getPrivateKeyString().replace('0x', '')
          return { ethereumKey }
        } else {
          throw new Error('InvalidWalletType')
        }
      },

      derivePublicKey: (walletInfo: EdgeWalletInfo) => {
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

          const wallet = ethWallet.generate(false)
          const ethereumKey = wallet.getPrivateKeyString().replace('0x', '')
          const ethereumPublicAddress = wallet.getAddressString()
          // const ethereumKey = '0x389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'
          // const ethereumPublicAddress = '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'
          return {ethereumKey, ethereumPublicAddress}
        } else {
          return null
        }
      },

      async makeEngine (walletInfo: EdgeWalletInfo, opts: EdgeCurrencyEngineOptions): Promise<EdgeCurrencyEngine> {
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
            console.log(err)
            console.log('No walletLocalData setup yet: Failure is ok')
            ethereumEngine.walletLocalData = new WalletLocalData(null)
            ethereumEngine.walletLocalData.ethereumAddress = ethereumEngine.walletInfo.keys.ethereumAddress
            await ethereumEngine.walletLocalFolder
              .folder(DATA_STORE_FOLDER)
              .file(DATA_STORE_FILE)
              .setText(JSON.stringify(ethereumEngine.walletLocalData))
          } catch (e) {
            console.log('Error writing to localDataStore. Engine not started:' + err)
          }
        }
        for (const token of ethereumEngine.walletLocalData.enabledTokens) {
          ethereumEngine.tokenCheckStatus[token] = 0
        }
        return ethereumEngine
      },

      parseUri: (uri: string) => {
        const parsedUri = parse(uri)
        let address: string
        let nativeAmount: string | null = null
        let currencyCode: string | null = null

        if (
          typeof parsedUri.scheme !== 'undefined' &&
          parsedUri.scheme !== 'ethereum' &&
          parsedUri.scheme !== 'ether'
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
        let [prefix, contractAddress] = address.split('-') // Split the address to get the prefix according to EIP-681
        // If contractAddress is null or undefined it means there is no prefix
        if (!contractAddress) {
          contractAddress = prefix // Set the contractAddress to be the prefix when the prefix is missing.
          prefix = 'pay' // The default prefix according to EIP-681 is "pay"
        }
        address = contractAddress
        const valid: boolean = EthereumUtil.isValidAddress(address)
        if (!valid) {
          throw new Error('InvalidPublicAddressError')
        }
        // If the address has a "token-" prefix, it means it's an "Add Token" URI and not a payment one.
        if (prefix === 'token') {
          const currencyCode = getParameterByName('symbol', uri) || 'SYM'
          if (currencyCode.length < 2 || currencyCode.length > 5) {
            throw new Error('Wrong Token symbol')
          }
          const currencyName = getParameterByName('name', uri) || currencyCode
          const multiplier = getParameterByName('decimals', uri) || '18'
          try {
            const decimals = parseInt(multiplier)
            if (decimals < 0 || decimals > 18) {
              throw new Error('Wrong number of decimals')
            }
          } catch (e) {
            throw e
          }

          const type = getParameterByName('type', uri) || 'ERC20'

          const edgeParsedUri: EdgeParsedUri = {
            token: {
              currencyCode,
              contractAddress,
              currencyName,
              multiplier,
              type: type.toUpperCase()
            }
          }
          return edgeParsedUri
        }
        const amountStr = getParameterByName('amount', uri)
        if (amountStr && typeof amountStr === 'string') {
          const denom = getDenomInfo('ETH')
          if (!denom) {
            throw new Error('InternalErrorInvalidCurrencyCode')
          }
          nativeAmount = bns.mul(amountStr, denom.multiplier)
          nativeAmount = bns.toFixed(nativeAmount, 0, 0)
          currencyCode = 'ETH'
        }
        const label = getParameterByName('label', uri)
        const message = getParameterByName('message', uri)

        const edgeParsedUri:EdgeParsedUri = {
          publicAddress: address
        }
        if (nativeAmount) {
          edgeParsedUri.nativeAmount = nativeAmount
        }
        if (currencyCode) {
          edgeParsedUri.currencyCode = currencyCode
        }
        if (label || message) {
          edgeParsedUri.metadata = {}
          if (label) {
            edgeParsedUri.metadata.name = label
          }
          if (message) {
            edgeParsedUri.metadata.message = message
          }
        }

        return edgeParsedUri
      },

      encodeUri: (obj: EdgeEncodeUri) => {
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
            const nativeAmount:string = obj.nativeAmount
            if (typeof obj.currencyCode === 'string') {
              currencyCode = obj.currencyCode
            }
            const denom = getDenomInfo(currencyCode)
            if (!denom) {
              throw new Error('InternalErrorInvalidCurrencyCode')
            }
            const amount = bns.div(nativeAmount, denom.multiplier, 18)

            queryString += 'amount=' + amount + '&'
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

    if (global.OS && global.OS === 'ios') {
      const metaTokens = []
      for (const metaToken of ethereumPlugin.currencyInfo.metaTokens) {
        const currencyCode = metaToken.currencyCode
        if (ethereumPlugin.currencyInfo.defaultSettings.otherSettings.iosAllowedTokens[currencyCode] === true) {
          metaTokens.push(metaToken)
        }
      }
      ethereumPlugin.currencyInfo.metaTokens = metaTokens
    }

    async function initPlugin (opts: any) {
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

// Capitalizing the name was a mistake, but we keep it around for now:
export { ethereumCurrencyPluginFactory as EthereumCurrencyPluginFactory }
