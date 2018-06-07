/**
 * Created by paul on 8/8/17.
 */
// @flow
import { currencyInfo } from './currencyInfoXRP.js'
import { RippleEngine } from './currencyEngineXRP.js'
import { DATA_STORE_FILE, DATA_STORE_FOLDER, WalletLocalData } from './xrpTypes.js'
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
import { RippleAPI } from 'edge-ripple-lib'
import keypairs from 'edge-ripple-keypairs'

// import { CurrencyInfoScheme } from './xrpSchema.js'

let io

function getDenomInfo (denom: string) {
  return currencyInfo.denominations.find(element => {
    return element.name === denom
  })
}

function getParameterByName (param, url) {
  const name = param.replace(/[[\]]/g, '\\$&')
  const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)')
  const results = regex.exec(url)
  if (!results) return null
  if (!results[2]) return ''
  return decodeURIComponent(results[2].replace(/\+/g, ' '))
}

function checkAddress (address: string) {
  // Ripple doesn't have a simple checkAddress routine so we'll validate by
  let valid: boolean
  if (address.slice(0, 1) !== 'r') {
    valid = false
  } else if (address.length !== 34) {
    valid = false
  } else {
    // Check that the address only contains characters in the ripple base58 alphabet
    valid = /^[rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz]+$/.test(address)
  }
  return valid
}

export const rippleCurrencyPluginFactory: EdgeCurrencyPluginFactory = {
  pluginType: 'currency',
  pluginName: currencyInfo.pluginName,

  async makePlugin (opts: any): Promise<EdgeCurrencyPlugin> {
    io = opts.io

    const rippleApi = new RippleAPI({
      server: currencyInfo.defaultSettings.otherSettings.rippledServers[0] // Public rippled server
    })

    console.log(`Creating Currency Plugin for ripple`)
    const ripplePlugin:EdgeCurrencyPlugin = {
      pluginName: 'ripple',
      currencyInfo,

      createPrivateKey: (walletType: string) => {
        const type = walletType.replace('wallet:', '')

        if (type === 'ripple' || type === 'ripple-secp256k1') {
          const algorithm = type === 'ripple-secp256k1' ? 'ecdsa-secp256k1' : 'ed25519'
          const entropy = Array.from(io.random(32))
          const address = rippleApi.generateAddress({
            algorithm,
            entropy
          })

          return { rippleKey: address.secret }
        } else {
          throw new Error('InvalidWalletType')
        }
      },

      derivePublicKey: (walletInfo: EdgeWalletInfo) => {
        const type = walletInfo.type.replace('wallet:', '')
        if (type === 'ripple' || type === 'ripple-secp256k1') {
          const keypair = keypairs.deriveKeypair(walletInfo.keys.rippleKey)
          const rippleAddress = keypairs.deriveAddress(keypair.publicKey)
          return { rippleAddress }
        } else {
          throw new Error('InvalidWalletType')
        }
      },

      async makeEngine (walletInfo: EdgeWalletInfo, opts: EdgeCurrencyEngineOptions): Promise<EdgeCurrencyEngine> {
        const rippleEngine = new RippleEngine(this, io, walletInfo, rippleApi, opts)
        try {
          const result =
            await rippleEngine.walletLocalFolder
              .folder(DATA_STORE_FOLDER)
              .file(DATA_STORE_FILE)
              .getText(DATA_STORE_FOLDER, 'walletLocalData')

          rippleEngine.walletLocalData = new WalletLocalData(result)
          rippleEngine.walletLocalData.rippleAddress = rippleEngine.walletInfo.keys.rippleAddress
        } catch (err) {
          try {
            console.log(err)
            console.log('No walletLocalData setup yet: Failure is ok')
            rippleEngine.walletLocalData = new WalletLocalData(null)
            rippleEngine.walletLocalData.rippleAddress = rippleEngine.walletInfo.keys.rippleAddress
            await rippleEngine.walletLocalFolder
              .folder(DATA_STORE_FOLDER)
              .file(DATA_STORE_FILE)
              .setText(JSON.stringify(rippleEngine.walletLocalData))
          } catch (e) {
            console.log('Error writing to localDataStore. Engine not started:' + err)
          }
        }
        for (const token of rippleEngine.walletLocalData.enabledTokens) {
          rippleEngine.tokenCheckStatus[token] = 0
        }
        return rippleEngine
      },

      parseUri: (uri: string) => {
        const parsedUri = parse(uri)
        let address: string
        let nativeAmount: string | null = null
        let currencyCode: string | null = null

        if (
          typeof parsedUri.scheme !== 'undefined' &&
          parsedUri.scheme !== 'ripple' &&
          parsedUri.scheme !== 'ether'
        ) {
          throw new Error('InvalidUriError') // possibly scanning wrong crypto type
        }
        if (typeof parsedUri.host !== 'undefined') {
          address = parsedUri.host
        } else if (typeof parsedUri.path !== 'undefined') {
          address = parsedUri.path
        } else {
          throw new Error('InvalidUriError')
        }
        address = address.replace('/', '') // Remove any slashes

        const valid = checkAddress(address)
        if (!valid) {
          throw new Error('InvalidPublicAddressError')
        }
        const amountStr = getParameterByName('amount', uri)
        if (amountStr && typeof amountStr === 'string') {
          const denom = getDenomInfo('XRP')
          if (!denom) {
            throw new Error('InternalErrorInvalidCurrencyCode')
          }
          nativeAmount = bns.mul(amountStr, denom.multiplier)
          nativeAmount = bns.toFixed(nativeAmount, 0, 0)
          currencyCode = 'XRP'
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
        // Todo: check if valid
        const valid: boolean = true
        if (!valid) {
          throw new Error('InvalidPublicAddressError')
        }
        if (!obj.nativeAmount && !obj.label && !obj.message) {
          return obj.publicAddress
        } else {
          let queryString: string = ''

          if (typeof obj.nativeAmount === 'string') {
            let currencyCode: string = 'XRP'
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
            scheme: 'ripple',
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
      for (const metaToken of ripplePlugin.currencyInfo.metaTokens) {
        const currencyCode = metaToken.currencyCode
        if (ripplePlugin.currencyInfo.defaultSettings.otherSettings.iosAllowedTokens[currencyCode] === true) {
          metaTokens.push(metaToken)
        }
      }
      ripplePlugin.currencyInfo.metaTokens = metaTokens
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
      //   this.walletLocalData.rippleAddress = this.walletInfo.keys.rippleAddress
      // }

      // Spin off network query to get updated currencyInfo and save that to disk for future bootups

      return ripplePlugin
    }
    return initPlugin(opts)
  }
}
