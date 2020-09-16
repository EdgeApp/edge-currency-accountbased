/**
 * Created by Austin Bonander <austin@launchbadge.com> on 9/30/19.
 */
// @flow

import * as hedera from '@hashgraph/sdk'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyPlugin,
  type EdgeEncodeUri,
  type EdgeIo,
  type EdgeParsedUri,
  type EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyPlugin } from '../common/plugin.js'
import { HederaEngine } from './hederaEngine.js'
import { currencyInfo } from './hederaInfo.js'

// if users want to import their mnemonic phrase in e.g. MyHbarWallet.com
// they can just leave the passphrase field blank
const mnemonicPassphrase = ''

export class HederaPlugin extends CurrencyPlugin {
  constructor(io: EdgeIo) {
    super(io, 'hedera', currencyInfo)
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type === 'hedera') {
      const mnemonic = hedera.Mnemonic.generate()
      const privateKey = await mnemonic.toPrivateKey(mnemonicPassphrase)

      return {
        hederaMnemonic: mnemonic.toString(),
        hederaPrivateKey: privateKey.toString()
      }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async importPrivateKey(
    keyString: string
  ): Promise<{
    hederaPrivateKey: string
  }> {
    try {
      if ([64, 88].includes(keyString.length)) {
        // try to decode the private key in order to validate and normalize it
        return {
          hederaPrivateKey: hedera.Ed25519PrivateKey.fromString(
            keyString
          ).toString()
        }
      }

      const mnemonic = hedera.Mnemonic.fromString(keyString)

      // mnemonic validation is not part of `fromString()`
      // this checks that the mnemonic is 24 words, that the words are in the BIP-39 English list
      // (without normalization) and that the mnemonic checksum is valid
      mnemonic.validate()

      const privateKey = await mnemonic.toPrivateKey(mnemonicPassphrase)

      return {
        // normalize the mnemonic string
        hederaMnemonic: keyString.toString(),
        hederaPrivateKey: privateKey.toString()
      }
    } catch (e) {
      console.log(
        'hederaPlugin/importPrivateKey failed to import private key',
        e
      )
      throw new Error('InvalidPrivateKey')
    }
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<Object> {
    const type = walletInfo.type.replace('wallet:', '')
    if (type === 'hedera') {
      const privateKey = hedera.Ed25519PrivateKey.fromString(
        walletInfo.keys.hederaPrivateKey
      )

      return {
        publicKey: privateKey.publicKey.toString()
      }
    } else {
      throw new Error('InvalidWalletType')
    }
  }

  async parseUri(uri: string): Promise<EdgeParsedUri> {
    // tests `#` and `#.#.#`
    if (/^\d+(\.\d+\.\d+)?$/.test(uri.trim())) {
      return {
        publicAddress: uri
      }
    }

    return this.parseUriCommon(currencyInfo, uri, { hedera: true }, 'tHBAR')
      .edgeParsedUri
  }

  async encodeUri(obj: EdgeEncodeUri): Promise<string> {
    if (!obj.nativeAmount) {
      // don't encode as a URI, just return the public address
      return obj.publicAddress
    }

    return this.encodeUriCommon(obj, 'hedera', obj.nativeAmount)
  }
}

export function makeHederaPlugin(
  opts: EdgeCorePluginOptions
): EdgeCurrencyPlugin {
  console.log('makeHederaPlugin')

  const { io } = opts

  let toolsPromise: Promise<HederaPlugin>

  function makeCurrencyTools(): Promise<HederaPlugin> {
    if (toolsPromise != null) return toolsPromise
    toolsPromise = Promise.resolve(new HederaPlugin(io))
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()

    const currencyEngine = new HederaEngine(tools, walletInfo, opts, io)

    await currencyEngine.loadEngine(tools, walletInfo, opts)

    // This is just to make sure otherData is Flow type checked
    currencyEngine.otherData = currencyEngine.walletLocalData.otherData
    if (!currencyEngine.otherData.accountSequence) {
      currencyEngine.otherData.accountSequence = 0
    }
    if (!currencyEngine.otherData.lastPagingToken) {
      currencyEngine.otherData.lastPagingToken = '0'
    }

    const out: EdgeCurrencyEngine = currencyEngine
    return out
  }

  const otherMethods = {
    getActivationSupportedCurrencies: () => ({ ETH: true }),
    getActivationCost: async () => {
      const creatorApiServer =
        currencyInfo.defaultSettings.otherSettings.creatorApiServers[0]

      try {
        const response = await io.fetch(`${creatorApiServer}/account/cost`)
        return (await response.json()).hbar
      } catch (e) {
        console.log('hederaPlugin: unable to get account activation cost', e)
        throw new Error('ErrorUnableToGetCost')
      }
    },
    validateAccount: () => Promise.resolve({ result: 'AccountAvailable' })
  }

  return {
    currencyInfo,
    makeCurrencyEngine,
    makeCurrencyTools,
    otherMethods
  }
}
