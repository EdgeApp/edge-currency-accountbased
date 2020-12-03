// @flow

import { generateMnemonic, mnemonicToSeedSync } from 'bip39'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyEngine,
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
  type EdgeCurrencyPlugin,
  type EdgeFetchFunction,
  type EdgeIo,
  type EdgeWalletInfo
} from 'edge-core-js/types'
import hdKey from 'ethereumjs-wallet/hdkey'

import { CurrencyPlugin } from '../common/plugin.js'
import { ZcashEngine } from './zcashEngine.js'

export class ZcashPlugin extends CurrencyPlugin {
  KeyTool: any
  AddressTool: any
  makeSynchronizer: any

  constructor(
    io: EdgeIo,
    currencyInfo: EdgeCurrencyInfo,
    fetchCors: EdgeFetchFunction,
    methods: any
  ) {
    super(io, currencyInfo.pluginId, currencyInfo)
    this.KeyTool = methods.KeyTool
    this.AddressTool = methods.AddressTool
    this.makeSynchronizer = methods.makeSynchronizer
  }

  async createPrivateKey(walletType: string): Promise<Object> {
    const type = walletType.replace('wallet:', '')

    if (type !== this.currencyInfo.pluginId) {
      throw new Error('InvalidWalletType')
    }
    const zcashMnemonic = generateMnemonic(128).split(',').join(' ')
    const zcashHexKey = await this._mnemonicToHex(zcashMnemonic)
    const zcashKey = this.KeyTool.deriveSpendingKey(zcashHexKey)

    return { zcashMnemonic, zcashKey }
  }

  async _mnemonicToHex(mnemonic: string): Promise<string> {
    const { defaultSettings } = this.currencyInfo
    const { hdPathCoinType } = defaultSettings.otherSettings
    const hdwallet = hdKey.fromMasterSeed(mnemonicToSeedSync(mnemonic))
    const walletHdpath = `m/44'/${hdPathCoinType}'/0'/0/`
    const walletPathDerivation = hdwallet.derivePath(walletHdpath + 0)
    const wallet = walletPathDerivation.getWallet()
    const privKey = wallet.getPrivateKeyString().replace(/^0x/, '')
    return privKey
  }
}

export function makeZcashPlugin(
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo
): EdgeCurrencyPlugin {
  const { io, nativeIo, initOptions, log } = opts
  log('zcash1')
  const fetchCors = io.fetchCors || io.fetch
  log('zcash2')

  if (nativeIo['edge-currency-accountbased'] == null) {
    log('zcash3')
    throw new Error('React Native Accountbased IO object not loaded')
  }
  log('zcash4')
  const methods = nativeIo['edge-currency-accountbased']
  log('zcash5')
  let toolsPromise: Promise<ZcashPlugin>
  log('zcash6')
  function makeCurrencyTools(): Promise<ZcashPlugin> {
    log('zcash7')
    if (toolsPromise != null) return toolsPromise
    log('zcash8')
    toolsPromise = Promise.resolve(
      new ZcashPlugin(io, currencyInfo, fetchCors, methods)
    )
    log('zcash9')
    return toolsPromise
  }

  async function makeCurrencyEngine(
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<EdgeCurrencyEngine> {
    const tools = await makeCurrencyTools()
    const currencyEngine = new ZcashEngine(
      tools,
      walletInfo,
      initOptions,
      opts,
      currencyInfo,
      fetchCors
    )

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
      currencyEngine.otherData.networkFees =
        currencyInfo.defaultSettings.otherSettings.defaultNetworkFees
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
