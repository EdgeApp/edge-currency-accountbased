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
  EdgeParsedUri,
  EdgeCurrencyPlugin,
  EdgeCurrencyPluginFactory,
  EdgeWalletInfo
} from 'edge-core-js'
import { getDenomInfo, getEdgeInfoServer } from '../common/utils.js'
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

export function checkAddress (address: string): boolean {
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
        const eosPaymentServer = this.currencyInfo.defaultSettings.otherSettings.eosActivationServers[0]
        const response = await io.fetch(`${eosPaymentServer}/api/v1/getSupportedCurrencies`)
        const out = await response.json()
        return out
      },
      getActivationCost: async (): Promise<string> => {
        try {
          const infoServer = getEdgeInfoServer()
          const result = await io.fetch(`${infoServer}/v1/eosPrices`)
          const prices = await result.json()
          const totalEos = (Number(prices.ram) * 8) + (Number(prices.net) * 2) + (Number(prices.cpu) * 10)
          let out = totalEos.toString()
          out = bns.toFixed(out, 0, 4)
          return out
        } catch (e) {
          throw new Error('ErrorUnableToGetCost')
        }
      },
      validateAccount: async (account: string): Promise<boolean> => {
        const valid = checkAddress(account)
        const out = {result: ''}
        if (!valid) {
          const e = new Error('ErrorInvalidAccountName')
          e.name = 'ErrorInvalidAccountName'
          throw e
        }
        try {
          const result = await this.getAccSystemStats(account)
          if (result) {
            const e = new Error('ErrorAccountUnavailable')
            e.name = 'ErrorAccountUnavailable'
            throw e
          }
          throw new Error('ErrorUnknownError')
        } catch (e) {
          if (e.code === 'ErrorUnknownAccount') {
            out.result = 'AccountAvailable'
          } else {
            throw e
          }
        }
        console.log(`validateAccount: result=${out.result}`)
        return out
      }
    }
  }
  async createPrivateKey (walletType: string): Promise<Object> {
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

  async derivePublicKey (walletInfo: EdgeWalletInfo): Promise<Object> {
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
    if (!currencyEngine.otherData.lastQueryActionSeq) {
      currencyEngine.otherData.lastQueryActionSeq = 0
    }
    if (!currencyEngine.otherData.highestTxHeight) {
      currencyEngine.otherData.highestTxHeight = 0
    }

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  async parseUri (uri: string): Promise<EdgeParsedUri> {
    const { edgeParsedUri } = this.parseUriCommon(currencyInfo, uri, {
      eos: true
    })

    const valid = checkAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    return edgeParsedUri
  }

  async encodeUri (obj: EdgeEncodeUri): Promise<string> {
    const valid = checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode: string = 'EOS'
      const nativeAmount: string = obj.nativeAmount
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
