/* eslint-disable no-unused-vars */
/**
 * Created by paul on 7/7/17.
 */
// @flow

import { FIOSDK } from '@dapix/react-native-fio'
import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyTools,
  type EdgeFreshAddress,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { SymbolDisplayPartKind } from 'typescript'

import { CurrencyEngine } from '../common/engine.js'
import {
  asyncWaterfall,
  getDenomInfo,
  promiseAny,
  validateObject
} from '../common/utils.js'
import { FioPlugin, checkAddress } from './fioPlugin.js'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 3000

export class FioEngine extends CurrencyEngine {
  fioPlugin: FioPlugin
  activatedAccountsCache: { [publicAddress: string]: boolean }
  otherData: any
  otherMethods: Object
  fioSDK: FIOSDK
  fetchJson: Function

  constructor (
    currencyPlugin: FioPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchJson: Function
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.fetchJson = fetchJson
    this.fioPlugin = currencyPlugin
    this.activatedAccountsCache = {}
    this.otherMethods = {}
  }

  async loadEngine (
    plugin: EdgeCurrencyTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<void> {
    await super.loadEngine(plugin, walletInfo, opts)
    if (typeof this.walletInfo.keys.ownerPublicKey !== 'string') {
      if (walletInfo.keys.ownerPublicKey) {
        this.walletInfo.keys.ownerPublicKey = walletInfo.keys.ownerPublicKey
      } else {
        const pubKeys = await plugin.derivePublicKey(this.walletInfo)
        this.walletInfo.keys.ownerPublicKey = pubKeys.ownerPublicKey
      }
    }
  }
  // Poll on the blockheight
  async checkBlockchainInnerLoop () {
    const blockHeight = 1578128
    if (this.walletLocalData.blockHeight !== blockHeight) {
      this.walletLocalData.blockHeight = blockHeight
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onBlockHeightChanged(
        this.walletLocalData.blockHeight
      )
    }
  }

  getBalance (options: any): string {
    const bla = super.getBalance(options)
    return super.getBalance(options)
  }

  updateBalance (tk: string, balance: string) {}

  async checkTransactionsInnerLoop () {}

  // Check all account balance and other relevant info
  async checkAccountInnerLoop () {}

  async clearBlockchainCache (): Promise<void> {
    this.activatedAccountsCache = {}
    await super.clearBlockchainCache()
    this.walletLocalData.otherData.lastQueryActionSeq = 0
    this.walletLocalData.otherData.highestTxHeight = 0
    this.walletLocalData.otherData.accountName = ''
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // This routine is called once a wallet needs to start querying the network
  async startEngine () {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    super.startEngine()
  }

  async resyncBlockchain (): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  getFreshAddress (options: any): EdgeFreshAddress {
    if (this.walletLocalData.otherData.accountName) {
      return { publicAddress: this.walletLocalData.otherData.accountName }
    } else {
      // Account is not yet active. Return the publicKeys so the user can activate the account
      return {
        publicAddress: this.walletInfo.keys.publicKey,
        publicKey: this.walletInfo.keys.publicKey,
        ownerPublicKey: this.walletInfo.keys.ownerPublicKey
      }
    }
  }

  async makeSpend (edgeSpendInfoIn: EdgeSpendInfo) {
    const {
      edgeSpendInfo,
      currencyCode,
      nativeBalance,
      denom
    } = super.makeSpend(edgeSpendInfoIn)

    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress
    const quantity = edgeSpendInfo.spendTargets[0].nativeAmount
    const memo = ''

    const transactionJson = {
      actions: [
        {
          account: 'fio.token',
          name: 'trnsfiopubky',
          authorization: [
            {
              actor: 'actor',
              permission: 'active'
            }
          ],
          data: {
            from: this.walletInfo.keys.publicKey, // this.walletLocalData.otherData.accountName,
            to: publicAddress,
            quantity,
            memo
          }
        }
      ]
    }

    const nativeAmount = quantity
    const networkFee = '0'
    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams: {
        transactionJson
      }
    }
    return edgeTransaction
  }

  async signTx (edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Do nothing
    return edgeTransaction
  }

  async broadcastTx (
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    return edgeTransaction
  }

  getDisplayPrivateSeed () {
    let out = ''
    if (this.walletInfo.keys && this.walletInfo.keys.fioKey) {
      out +=
        'active key\n' +
        this.walletInfo.keys.fioKey +
        '\n\n' +
        this.walletInfo.keys.mnemonics
    }
    return out
  }

  getDisplayPublicSeed () {
    let out = ''
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      out += 'active publicKey\n' + this.walletInfo.keys.publicKey + '\n\n'
    }
    return out
  }
}

export { CurrencyEngine }
