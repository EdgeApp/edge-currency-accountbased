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
  type EdgeFetchFunction,
  type EdgeIo,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'
import EosApi from 'eosjs-api'
import ecc from 'eosjs-ecc'

import { CurrencyPlugin } from '../common/plugin.js'
import { asyncWaterfall, getDenomInfo } from '../common/utils.js'
import { getFetchCors } from '../react-native-io.js'
import { EosEngine } from './eosEngine'
import {
  asGetActivationCost,
  asGetActivationSupportedCurrencies
} from './eosSchema.js'
import { type EosJsConfig } from './eosTypes'

const validCharacters = '12345abcdefghijklmnopqrstuvwxyz.'

export function checkAddress(address: string): boolean {
  // TODO: Check for a valid address format. The passed in
  // address would be a use visible displayed address such as what would
  // go into a QR code

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

  constructor(
    io: EdgeIo,
    fetchCors: EdgeFetchFunction,
    currencyInfo: EdgeCurrencyInfo,
    eosJsConfig: EosJsConfig
  ) {
    super(io, currencyInfo.pluginId, currencyInfo)

    eosJsConfig.httpEndpoint = this.currencyInfo.defaultSettings.otherSettings.eosNodes[0]
    eosJsConfig.fetch = fetchCors
    this.eosServer = EosApi(eosJsConfig)
  }

  async importPrivateKey(privateKey: string): Promise<Object> {
    const strippedPrivateKey = privateKey.replace(/ /g, '') // should be in WIF format
    if (strippedPrivateKey.length !== 51) {
      throw new Error('Private key wrong length')
    }
    if (!ecc.isValidPrivate(strippedPrivateKey)) {
      throw new Error('Invalid private key')
    }
    return {
      // best practice not to import owner key, only active
      // note that signing is done by active key (eosKey, not eosOwnerKey)
      eosKey: strippedPrivateKey // active private key
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
      // usage of eosOwnerKey must be protected by conditional
      // checking for its existence
      if (walletInfo.keys.eosOwnerKey) {
        ownerPublicKey = ecc.privateToPublic(walletInfo.keys.eosOwnerKey)
      }
      return { publicKey, ownerPublicKey }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    const { edgeParsedUri } = this.parseUriCommon(this.currencyInfo, uri, {
      [this.currencyInfo.defaultSettings.otherSettings.uriProtocol]: true
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
      const currencyCode = this.currencyInfo.currencyCode
      const nativeAmount = obj.nativeAmount
      const denom = getDenomInfo(this.currencyInfo, currencyCode)
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 4)
    }
    const encodedUri = this.encodeUriCommon(
      obj,
      this.currencyInfo.defaultSettings.otherSettings.uriProtocol,
      amount
    )
    return encodedUri
  }

  // change to fetch call in the future
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
  currencyInfo: EdgeCurrencyInfo,
  eosJsConfig: EosJsConfig
): EdgeCurrencyPlugin {
  const { io, log } = opts
  const fetch = getFetchCors(opts)

  let toolsPromise: Promise<EosPlugin>
  function makeCurrencyTools(): Promise<EosPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(
      new EosPlugin(io, fetch, currencyInfo, eosJsConfig)
    )
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new EosEngine(
      tools,
      walletInfo,
      opts,
      fetch,
      eosJsConfig
    )
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
      currencyEngine.otherData.lastQueryActionSeq = {}
    }
    if (!currencyEngine.otherData.highestTxHeight) {
      currencyEngine.otherData.highestTxHeight = {}
    }

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  const otherMethods = {
    getActivationSupportedCurrencies: async (): Object => {
      try {
        const out = await asyncWaterfall(
          currencyInfo.defaultSettings.otherSettings.eosActivationServers.map(
            server => async () => {
              const uri = `${server}/api/v1/getSupportedCurrencies`
              const response = await fetch(uri)
              const result = await response.json()
              return {
                result
              }
            }
          )
        )
        return asGetActivationSupportedCurrencies(out)
      } catch (e) {
        log.error('UnableToGetSupportedCurrencies error: ', e)
        throw new Error('UnableToGetSupportedCurrencies')
      }
    },
    getActivationCost: async (currencyCode: string): Promise<string> | void => {
      try {
        const out = await asyncWaterfall(
          currencyInfo.defaultSettings.otherSettings.eosActivationServers.map(
            server => async () => {
              const uri = `${server}/api/v1/eosPrices/${currencyCode}`
              const response = await fetch(uri)
              const prices = asGetActivationCost(await response.json())
              const startingResourcesUri = `${server}/api/v1/startingResources/${currencyCode}`
              const startingResourcesResponse = await fetch(
                startingResourcesUri
              )
              const startingResources = asGetActivationCost(
                await startingResourcesResponse.json()
              )
              const totalEos =
                Number(prices.ram) * startingResources.ram +
                Number(prices.net) * startingResources.net +
                Number(prices.cpu) * startingResources.cpu
              const totalEosString = totalEos.toString()
              const price = bns.toFixed(totalEosString, 0, 4)
              return price
            }
          )
        )
        return out
      } catch (e) {
        log.error('ErrorUnableToGetCost: ', e)
        throw new Error('ErrorUnableToGetCost')
      }
    },
    validateAccount: async (account: string): Promise<boolean> => {
      const valid = checkAddress(account) && account.length === 12
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
      log.warn(`validateAccount: result=${out.result}`)
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
