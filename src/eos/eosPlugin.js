/**
 * Created by paul on 8/8/17.
 */
// @flow
import { currencyInfo } from './eosInfo.js'
import { CurrencyPlugin } from '../common/plugin.js'
import type {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEncodeUri,
  EdgeCurrencyPlugin,
  EdgeCurrencyPluginFactory,
  EdgeWalletInfo
} from 'edge-core-js'
import { getDenomInfo } from '../common/utils.js'
import { EosEngine } from './eosEngine'
import { bns } from 'biggystring'
import eosjs from 'eosjs'

const { ecc } = eosjs.modules

// ----MAIN NET----
export const eosConfig = {
  chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', // main net
  keyProvider: [],
  httpEndpoint: '', // main net
  expireInSeconds: 60,
  sign: false, // sign the transaction with a private key. Leaving a transaction unsigned avoids the need to provide a private key
  broadcast: false, // post the transaction to the blockchain. Use false to obtain a fully signed transaction
  verbose: false // verbose logging such as API activity
}

let io

const validCharacters = '12345abcdefghijklmnopqrstuvwxyz'

function checkAddress (address: string): boolean {
  // TODO: Check for a valid address format. The passed in
  // address would be a use visible displayed address such as what would
  // go into a QR code

  if (address.length !== 12) return false

  for (let i = 0; i < address.length; i++) {
    const c = address.charAt(i)
    if (!validCharacters.includes(c)) {
      return false
    }
  }
  return true
}

export class EosPlugin extends CurrencyPlugin {
  otherMethods: Object
  eosServer: Object

  constructor () {
    super('eos', currencyInfo)

    eosConfig.httpEndpoint = this.currencyInfo.defaultSettings.otherSettings.eosNodes[0]
    this.eosServer = eosjs(eosConfig)
    this.otherMethods = {
      getActivationSupportedCurrencies: async (): Promise<Object> => {
        return {
          'BTC': true,
          'BCH': true,
          'DASH': true,
          'LTC': true
        }
      },
      getActivationCost: async (): Promise<string> => {
        return '0.1000' // this is an exchangeAmount in units of full EOS
      },
      validateAccount: async (account: string): Promise<Object> => {
        const valid = checkAddress(account)
        const out = { result: '' }
        if (!valid) {
          out.result = 'ErrorInvalidAccountName'
        }
        try {
          const result = await this.getAccSystemStats(account)
          if (result) {
            out.result = 'ErrorAccountUnavailable'
          }
          out.result = 'ErrorUnknownError'
        } catch (e) {
          if (e.code === 'ErrorUnknownAccount') {
            out.result = 'AccountAvailable'
          } else {
            out.result = 'ErrorUnknownError'
            out.err_msg = e.message
          }
        }
        this.log(`validateAccount: result=${out.result}`)
        return out
      }
    }
  }
  createPrivateKey (walletType: string) {
    const type = walletType.replace('wallet:', '')

    if (type === 'eos') {
      // TODO: User currency library to create private key as a string
      // Use io.random() for random number generation
      // Multiple keys can be created and stored here. ie. If there is both a mnemonic and key format,
      // Generate and store them here by returning an arbitrary object with them.
      let entropy = Buffer.from(io.random(32)).toString('hex')
      const eosOwnerKey = ecc.seedPrivate(entropy)
      entropy = Buffer.from(io.random(32)).toString('hex')
      const eosKey = ecc.seedPrivate(entropy)
      return { eosOwnerKey, eosKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  derivePublicKey (walletInfo: EdgeWalletInfo) {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'eos') {
      // TODO: User currency library to derive the public keys/addresses from the private key.
      // Multiple keys can be generated and stored if needed. Do not store an HD chain
      // but rather just different versions of the master public key
      // const publicKey = derivePubkey(walletInfo.keys.eosKey)
      // const publicKey = deriveAddress(walletInfo.keys.eosKey)
      const publicKey = ecc.privateToPublic(walletInfo.keys.eosKey)
      let ownerPublicKey
      if (walletInfo.keys.eosOwnerKey) {
        ownerPublicKey = ecc.privateToPublic(walletInfo.keys.eosOwnerKey)
      }
      return { publicKey, ownerPublicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async makeEngine (
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const currencyEngine = new EosEngine(this, io, walletInfo, opts)
    await currencyEngine.loadEngine(this, io, walletInfo, opts)

    currencyEngine.otherData = currencyEngine.walletLocalData.otherData
    // currencyEngine.otherData is an opaque utility object for use for currency
    // specific data that will be persisted to disk on this one device.
    // Commonly stored data would be last queried block height or nonce values for accounts
    // Edit the flow type EosWalletOtherData and initialize those values here if they are
    // undefined
    // TODO: Initialize anything specific to this currency
    // if (!currencyEngine.otherData.nonce) currencyEngine.otherData.nonce = 0
    if (!currencyEngine.otherData.accountName) {
      currencyEngine.otherData.accountName = ''
    }

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  parseUri (uri: string) {
    const { edgeParsedUri } = this.parseUriCommon(currencyInfo, uri, {
      eos: true
    })

    const valid = checkAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    return edgeParsedUri
  }

  encodeUri (obj: EdgeEncodeUri) {
    const valid = checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      let currencyCode: string = 'EOS'
      const nativeAmount: string = obj.nativeAmount
      if (typeof obj.currencyCode === 'string') {
        currencyCode = obj.currencyCode
      }
      const denom = getDenomInfo(currencyInfo, currencyCode)
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 4)
    }
    const encodedUri = this.encodeUriCommon(obj, 'eos', amount)
    return encodedUri
  }

  async getAccSystemStats (account: string) {
    return new Promise((resolve, reject) => {
      this.eosServer.getAccount(account, (error, result) => {
        if (error) {
          if (error.message.includes('unknown key')) {
            error.code = 'ErrorUnknownAccount'
          }
          reject(error)
        }
        resolve(result)
      })
    })
  }
}

export const eosCurrencyPluginFactory: EdgeCurrencyPluginFactory = {
  pluginType: 'currency',
  pluginName: currencyInfo.pluginName,

  async makePlugin (opts: any): Promise<EdgeCurrencyPlugin> {
    io = opts.io

    // TODO: Initialize currency library if needed
    // Add any parameters to the Plugin object which would be global for all wallets (engines).
    // Common parameters would be an SDK/API object for this currency from an external library

    const plugin: CurrencyPlugin = new EosPlugin()
    return plugin
  }
}
