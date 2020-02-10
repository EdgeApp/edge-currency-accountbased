// @flow

import { FIOSDK } from '@fioprotocol/fiosdk'
import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyTools,
  type EdgeFetchFunction,
  type EdgeFreshAddress,
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { FioPlugin } from './fioPlugin.js'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const FIO_DOMAIN_DEFAULT = 'fiotestnet'

export class FioEngine extends CurrencyEngine {
  fioPlugin: FioPlugin
  otherData: any
  otherMethods: Object
  fioSDK: FIOSDK
  fetchCors: EdgeFetchFunction
  localDataDirty() {
    this.walletLocalDataDirty = true
  }

  dirtyData: Function

  constructor(
    currencyPlugin: FioPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchCors: Function
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.fetchCors = fetchCors
    this.fioPlugin = currencyPlugin
    this.fioSDK = new FIOSDK(
      walletInfo.keys.fioKey,
      walletInfo.keys.publicKey,
      this.currencyInfo.defaultSettings.apiUrl,
      this.fetchCors
    )
    this.dirtyData = this.localDataDirty.bind(this)
    this.otherMethods = {
      fioSDK: this.fioSDK,
      fioAction(actionName: string, parameters: any): Promise<any> {
        return this.fioSDK.genericAction(actionName, parameters)
      },
      registerFioAddress: async (
        fioAddressName: string,
        maxFee: number
      ): Promise<any> => {
        await this.fioSDK.registerFioAddress(fioAddressName, maxFee)
        this.walletLocalData.otherData.fioNames.push(fioAddressName)
        this.dirtyData()
      },
      getFioAddress(): [] {
        return this.walletLocalData.otherData.fioNames
      },
      validateFioAddress(fioAddress: string): boolean {
        return new RegExp(
          `^(([a-z0-9]+)(-?[a-z0-9]+)*@{1}${FIO_DOMAIN_DEFAULT}{1})$`,
          'gim'
        ).test(fioAddress)
      }
    }
  }

  async loadEngine(
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
    this.walletLocalData.otherData.fioNames = []
    try {
      const result = await this.fioSDK.getFioNames(walletInfo.keys.publicKey)

      for (const fioAddress of result.fio_addresses) {
        this.walletLocalData.otherData.fioNames.push(fioAddress.fio_address)
      }
      this.localDataDirty()
    } catch (error) {
      console.log(error)
    }
    this.otherMethods.walletLocalData = this.walletLocalData
  }

  // Poll on the blockheight
  async checkBlockchainInnerLoop() {
    try {
      const info = await this.fioSDK.transactions.getChainInfo()
      const blockHeight = info.head_block_num
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e) {
      this.log(`Error fetching height: ${JSON.stringify(e)}`)
      this.log(`e.code: ${JSON.stringify(e.code)}`)
      this.log(`e.message: ${JSON.stringify(e.message)}`)
      console.error('checkBlockchainInnerLoop error: ' + JSON.stringify(e))
    }
  }

  getBalance(options: any): string {
    return super.getBalance(options)
  }

  updateBalance(tk: string, balance: string) {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.walletLocalDataDirty = true
      this.log(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  async checkTransactionsInnerLoop() {
    // todo: waiting on FIO History API/Node
  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop() {
    const currencyCode = this.currencyInfo.currencyCode
    let nativeAmount = '0'
    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined'
    ) {
      this.walletLocalData.totalBalances[currencyCode] = '0'
    }

    this.fioSDK
      .getFioBalance()
      .then(value => {
        nativeAmount = value.balance
        nativeAmount = nativeAmount + ''
        this.updateBalance(currencyCode, nativeAmount)
      })
      .catch(e => {
        console.error('checkAccountInnerLoop error: ' + JSON.stringify(e))
        nativeAmount = '0'
        this.updateBalance(currencyCode, nativeAmount)
      })
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // This routine is called once a wallet needs to start querying the network
  async startEngine() {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode } = super.makeSpend(edgeSpendInfoIn)

    const feeResponse = await this.fioSDK.getFee('transfer_tokens_pub_key')
    const fee = feeResponse.fee
    const publicAddress = edgeSpendInfo.spendTargets[0].publicAddress
    const quantity = edgeSpendInfo.spendTargets[0].nativeAmount
    const memo = ''
    const actor = ''
    const transactionJson = {
      actions: [
        {
          account: 'fio.token',
          name: 'trnsfiopubky',
          authorization: [
            {
              actor: actor,
              permission: 'active'
            }
          ],
          data: {
            from: this.walletInfo.keys.publicKey,
            to: publicAddress,
            quantity,
            memo
          }
        }
      ]
    }

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount: quantity, // nativeAmount
      networkFee: `${fee}`, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '0', // signedTx
      otherParams: {
        transactionJson
      }
    }
    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // Do nothing
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    if (
      !edgeTransaction.otherParams ||
      !edgeTransaction.otherParams.transactionJson
    )
      throw new Error(
        'transactionJson not set. FIO transferTokens requires publicAddress'
      )
    const publicAddress =
      edgeTransaction.otherParams.transactionJson.actions[0].data.to
    const quantity = edgeTransaction.nativeAmount
    const fee = edgeTransaction.networkFee
    const transfer = await this.fioSDK.transferTokens(
      publicAddress,
      quantity,
      fee
    )

    edgeTransaction.nativeAmount = `-${quantity}`
    edgeTransaction.txid = transfer.transaction_id
    edgeTransaction.date = Date.now() / 1000
    edgeTransaction.networkFee = `-${fee}`
    edgeTransaction.blockHeight = transfer.block_num
    return edgeTransaction
  }

  getFreshAddress(options: any): EdgeFreshAddress {
    return { publicAddress: this.walletInfo.keys.publicKey }
  }

  getDisplayPrivateSeed() {
    let out = ''
    if (this.walletInfo.keys && this.walletInfo.keys.fioKey) {
      out += this.walletInfo.keys.fioKey
    }
    return out
  }

  getDisplayPublicSeed() {
    let out = ''
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      out += this.walletInfo.keys.publicKey
    }
    return out
  }
}

export { CurrencyEngine }
