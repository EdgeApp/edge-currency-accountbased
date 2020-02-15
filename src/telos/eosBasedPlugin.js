/**
 * Created by paul on 8/8/17.
 */
/* global */
// @flow

import { bns } from 'biggystring'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'
import eosjs from 'eosjs'

import { CurrencyPlugin } from '../common/plugin.js'
import { getDenomInfo, getEdgeInfoServer } from '../common/utils.js'
import { getFetchCors, getFetchJson } from '../react-native-io.js'
import { EosEngine } from './eosEngine'

const { ecc } = eosjs.modules

const validCharacters = '12345abcdefghijklmnopqrstuvwxyz'

export function checkAddress(address: string): boolean {
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

// when EosPlugin is created, need to grab right currencyInfo
export class EosPlugin extends CurrencyPlugin {
  otherMethods: Object
  eosServer: Object

  constructor(io: EdgeIo, fetchCors: Function, currencyInfo: EdgeCurrencyInfo) {
    // what about the hard-coded 'eos'?
    // second parameter was 'eos', technically that *is* plugin name...
    super(io, currencyInfo.pluginName, currencyInfo)
    const eosJsConfig = currencyInfo.defaultSettings.otherSettings.eosJsConfig
    eosJsConfig.httpEndpoint = this.currencyInfo.defaultSettings.otherSettings.eosNodes[0]
    eosJsConfig.fetch = fetchCors

    this.eosServer = eosjs(eosJsConfig)
  }

  async importPrivateKey(privateKey: string): Promise<Object> {
    const strippedPrivateKey = privateKey.replace(/ /g, '') // should be in WIF format
    if (strippedPrivateKey.length !== 51) {
      throw new Error('Private key wrong length')
    }
    return {
      eosOwnerKey: strippedPrivateKey,
      eosKey: strippedPrivateKey
    }
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    const currencyInfoType = this.currencyInfo.walletType.replace('wallet:', '')
    if (type === currencyInfoType) {
      // TODO: User currency library to create private key as a string
      // Use io.random() for random number generation
      // Multiple keys can be created and stored here. ie. If there is both a mnemonic and key format,
      // Generate and store them here by returning an arbitrary object with them.
      let entropy = Buffer.from(this.io.random(32)).toString('hex')
      const eosOwnerKey = ecc.seedPrivate(entropy) // returns WIF format
      entropy = Buffer.from(this.io.random(32)).toString('hex')
      const eosKey = ecc.seedPrivate(entropy)
      return { eosOwnerKey, eosKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    const currencyInfoType = this.currencyInfo.walletType.replace('wallet:', '')

    if (type === currencyInfoType) {
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
      console.log('privateKey: ', walletInfo.keys.eosKey)
      console.log('publicKey: ', publicKey)
      return { publicKey, ownerPublicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  // will need to check URI
  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const { edgeParsedUri } = this.parseUriCommon(this.currencyInfo, uri, {
      // network
      [this.currencyInfo.pluginName]: true
    })

    const valid = checkAddress(edgeParsedUri.publicAddress || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    return edgeParsedUri
  }

  async encodeUri(obj: EdgeEncodeUri): Promise<string> {
    const valid = checkAddress(obj.publicAddress)
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof obj.nativeAmount === 'string') {
      const currencyCode: string = this.currencyInfo.currencyCode
      const nativeAmount: string = obj.nativeAmount
      const denom = getDenomInfo(this.currencyInfo, currencyCode)
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 4)
    }
    // change this "eos"?
    // 2nd paramter used for "network" / "scheme"
    const encodedUri = this.encodeUriCommon(
      obj,
      this.currencyInfo.pluginName,
      amount
    )
    return encodedUri
  }

  async getAccSystemStats(account: string) {
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

export function makeEosBasedPluginInner(
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo
): EdgeCurrencyPlugin {
  const { io } = opts
  const fetchJson = getFetchJson(opts)

  let toolsPromise: Promise<EosPlugin>
  function makeCurrencyTools(): Promise<EosPlugin> {
    if (toolsPromise != null) return toolsPromise
    const fetch = getFetchCors(opts)
    toolsPromise = Promise.resolve(new EosPlugin(io, fetch, currencyInfo))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new EosEngine(tools, walletInfo, opts, fetchJson)
    await currencyEngine.loadEngine(tools, walletInfo, opts)

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

  const otherMethods = {
    getActivationSupportedCurrencies: async (): Promise<Object> => {
      const eosPaymentServer =
        currencyInfo.defaultSettings.otherSettings.eosActivationServers[0]
      return fetchJson(`${eosPaymentServer}/api/v1/getSupportedCurrencies`)
    },
    getActivationCost: async (): Promise<string> => {
      try {
        const infoServer = getEdgeInfoServer()
        const lowerCaseCurrencyCode = this.currencyInfo.currencyCode.toLowerCase()
        const prices = await fetchJson(
          `${infoServer}/v1/${lowerCaseCurrencyCode}Prices`
        )
        const totalEos =
          Number(prices.ram) * 8 +
          Number(prices.net) * 2 +
          Number(prices.cpu) * 10
        let out = totalEos.toString()
        out = bns.toFixed(out, 0, 4)
        return out
      } catch (e) {
        throw new Error('ErrorUnableToGetCost')
      }
    },
    validateAccount: async (account: string): Promise<boolean> => {
      const valid = checkAddress(account)
      const out = { result: '' }
      if (!valid) {
        const e = new Error('ErrorInvalidAccountName')
        e.name = 'ErrorInvalidAccountName'
        throw e
      }
      try {
        const tools = await makeCurrencyTools()
        const result = await tools.getAccSystemStats(account)
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

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools,
    otherMethods
  }
}
