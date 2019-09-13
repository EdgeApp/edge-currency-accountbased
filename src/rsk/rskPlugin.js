/**
 * Created by alepc253 on 6/19/19.
 */
// @flow

import { Buffer } from 'buffer'

import { bns } from 'biggystring'
import { generateMnemonic, mnemonicToSeedSync, validateMnemonic } from 'bip39'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeMetaToken,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'
import EthereumUtil from 'ethereumjs-util'
import hdKey from 'ethereumjs-wallet/hdkey'

import { CurrencyPlugin } from '../common/plugin.js'
import { getDenomInfo } from '../common/utils.js'
import { RskEngine } from './rskEngine.js'
import { currencyInfo } from './rskInfo.js'

export { calcMiningFee } from './rskMiningFees.js'

const defaultNetworkFees = {
  default: {
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '200000'
    },
    gasPrice: {
      lowFee: '59240000',
      standardFeeLow: '59240000', // TODO: check this values
      standardFeeHigh: '59240000',
      standardFeeLowAmount: '59240000',
      standardFeeHighAmount: '59240000',
      highFee: '59240000'
    }
  }
}

export class RskPlugin extends CurrencyPlugin {
  constructor (io: EdgeIo) {
    super(io, 'rsk', currencyInfo)
  }

  async importPrivateKey (userInput: string): Promise<Object> {
    if (/^(0x)?[0-9a-fA-F]{64}$/.test(userInput)) {
      const rskKeyBuffer = Buffer.from(userInput, 'hex')
      const isValid = EthereumUtil.isValidPrivate(rskKeyBuffer)
      if (!isValid) {
        throw new Error('Invalid private key')
      }
      // it looks like a private key!
      const strippedInput = userInput.replace('0x', '').replace(/ /g, '')
      const buffer = Buffer.from(strippedInput, 'hex')
      if (buffer.length !== 32) throw new Error('Private key wrong length')
      const rskKey = buffer.toString('hex').replace('0x', '')
      this.derivePublicKey({
        type: 'wallet:rsk',
        id: 'fake',
        keys: { rskKey }
      })
      return {
        rskKey
      }
    } else {
      // it looks like a mnemonic!
      if (!validateMnemonic(userInput)) {
        // "input" instead of "mnemonic" in case private key
        // was just the wrong length
        throw new Error('Invalid input')
      }
      const rskKey = await this.mnemonicToRskKey(userInput)
      const rskKeyCleaned = rskKey.replace('0x', '')
      return {
        rskMnemonic: userInput,
        rskKey: rskKeyCleaned
      }
    }
  }

  async createPrivateKey (walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')
    if (type === 'rsk') {
      const rskMnemonic = generateMnemonic(128)
        .split(',')
        .join(' ')
      const rskKey = await this.mnemonicToRskKey(rskMnemonic)
      const rskKeyCleaned = rskKey.replace('0x', '')
      return {
        rskMnemonic,
        rskKey: rskKeyCleaned
      }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async derivePublicKey (walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'rsk') {
      let address
      if (walletInfo.keys.rskMnemonic != null) {
        const rskSeedBuffer = mnemonicToSeedSync(walletInfo.keys.rskMnemonic)
        const hdwallet = hdKey.fromMasterSeed(rskSeedBuffer)
        const walletHdpath = "m/44'/137'/0'/0/"
        const walletPathDerivation = hdwallet.derivePath(walletHdpath + 0)
        const wallet = walletPathDerivation.getWallet()
        const publicKey = wallet.getPublicKey()
        address = `0x${EthereumUtil.pubToAddress(publicKey).toString('hex')}`
      } else {
        const rskKeyBuffer = Buffer.from(walletInfo.keys.rskKey, 'hex')
        const isValid = EthereumUtil.isValidPrivate(rskKeyBuffer)
        if (!isValid) {
          throw new Error('Invalid private key')
        }
        address = `0x${EthereumUtil.privateToAddress(rskKeyBuffer).toString(
          'hex'
        )}`
      }
      if (!EthereumUtil.isValidAddress(address)) {
        throw new Error('Invalid address')
      }
      return { publicKey: address }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async mnemonicToRskKey (mnemonic: string): Promise<string> {
    const hdwallet = hdKey.fromMasterSeed(mnemonicToSeedSync(mnemonic))
    const walletHdpath = "m/44'/137'/0'/0/"
    const walletPathDerivation = hdwallet.derivePath(walletHdpath + 0)
    const wallet = walletPathDerivation.getWallet()
    const rskKey = wallet.getPrivateKeyString()
    return rskKey
  }

  async parseUri (
    uri: string,
    currencyCode?: string,
    customTokens?: Array<EdgeMetaToken>
  ): Promise<EdgeParsedUri> {
    const networks = { rsk: true, rbtc: true }

    const { parsedUri, edgeParsedUri } = this.parseUriCommon(
      currencyInfo,
      uri,
      networks,
      currencyCode || 'RBTC',
      customTokens
    )
    let address = ''
    if (edgeParsedUri.publicAddress) {
      address = edgeParsedUri.publicAddress
    }

    // TODO: check this about prefix
    let [prefix, contractAddress] = address.split('-') // Split the address to get the prefix according to EIP-681
    // If contractAddress is null or undefined it means there is no prefix
    if (!contractAddress) {
      contractAddress = prefix // Set the contractAddress to be the prefix when the prefix is missing.
      prefix = 'pay' // The default prefix according to EIP-681 is "pay"
    }
    address = contractAddress
    // TODO: add chainId 30 to isValidAddress when included EIP-1191 and remove toLowerCase
    const valid = EthereumUtil.isValidAddress(address.toLowerCase() || '')
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }

    if (prefix === 'token' || prefix === 'token_info') {
      if (!parsedUri.query) throw new Error('InvalidUriError')

      const currencyCode = parsedUri.query.symbol || 'SYM'
      if (currencyCode.length < 2 || currencyCode.length > 5) {
        throw new Error('Wrong Token symbol')
      }
      const currencyName = parsedUri.query.name || currencyCode
      const decimalsInput = parsedUri.query.decimals || '18'
      let multiplier = '1000000000000000000'
      try {
        const decimals = parseInt(decimalsInput)
        if (decimals < 0 || decimals > 18) {
          throw new Error('Wrong number of decimals')
        }
        multiplier = '1' + '0'.repeat(decimals)
      } catch (e) {
        throw e
      }

      const type = parsedUri.query.type || 'RRC20'

      const edgeParsedUriToken: EdgeParsedUri = {
        token: {
          currencyCode,
          contractAddress,
          currencyName,
          multiplier,
          denominations: [{ name: currencyCode, multiplier }],
          type: type.toUpperCase()
        }
      }
      return edgeParsedUriToken
    }
    return edgeParsedUri
  }

  async encodeUri (
    obj: EdgeEncodeUri,
    customTokens?: Array<EdgeMetaToken>
  ): Promise<string> {
    const { publicAddress, nativeAmount, currencyCode } = obj
    // TODO: add chainId 30 to isValidAddress when included EIP-1191 and remove toLowerCase
    const valid = EthereumUtil.isValidAddress(publicAddress.toLowerCase())
    if (!valid) {
      throw new Error('InvalidPublicAddressError')
    }
    let amount
    if (typeof nativeAmount === 'string') {
      const denom = getDenomInfo(
        currencyInfo,
        currencyCode || 'RBTC',
        customTokens
      )
      if (!denom) {
        throw new Error('InternalErrorInvalidCurrencyCode')
      }
      amount = bns.div(nativeAmount, denom.multiplier, 18)
    }
    const encodedUri = this.encodeUriCommon(obj, 'rsk', amount)
    return encodedUri
  }
}

export function makeRskPlugin (opts: EdgeCorePluginOptions): EdgeCurrencyPlugin {
  const { io, initOptions } = opts

  let toolsPromise: Promise<RskPlugin>
  function makeCurrencyTools (): Promise<RskPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new RskPlugin(io))
    return toolsPromise
  }

  async function makeCurrencyEngine (
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new RskEngine(tools, walletInfo, initOptions, opts)

    // Do any async initialization necessary for the engine
    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData

    // Initialize otherData defaults if they weren't on disk
    if (!currencyEngine.otherData.nextNonce) {
      currencyEngine.otherData.nextNonce = '0'
    }
    if (!currencyEngine.otherData.unconfirmedNextNonce) {
      currencyEngine.otherData.unconfirmedNextNonce = '0'
    }
    if (!currencyEngine.otherData.networkFees) {
      currencyEngine.otherData.networkFees = defaultNetworkFees
    }

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools
  }
}
