// @flow

import { FIOSDK } from '@fioprotocol/fiosdk'
import { EndPoint } from '@fioprotocol/fiosdk/lib/entities/EndPoint'
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
import { asyncWaterfall } from '../common/utils'
import { FioPlugin } from './fioPlugin.js'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000

export class FioEngine extends CurrencyEngine {
  fioPlugin: FioPlugin
  otherData: any
  otherMethods: Object
  fetchCors: EdgeFetchFunction
  localDataDirty() {
    this.walletLocalDataDirty = true
  }

  constructor(
    currencyPlugin: FioPlugin,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchCors: Function
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.fetchCors = fetchCors
    this.fioPlugin = currencyPlugin
    this.otherMethods = {
      fioAction: async (actionName: string, params: any): Promise<any> => {
        const feeActionMap = {
          addPublicAddress: {
            action: 'getFeeForPublicAddress',
            propName: 'fioAddress'
          },
          addPublicAddresses: {
            action: 'getFeeForPublicAddress',
            propName: 'fioAddress'
          },
          rejectFundsRequest: {
            action: 'getFeeForRejectFundsRequest',
            propName: 'payeeFioAddress'
          },
          requestFunds: {
            action: 'getFeeForNewFundsRequest',
            propName: 'payeeFioAddress'
          },
          recordObtData: {
            action: 'getFeeForRecordObtData',
            propName: 'payerFioAddress'
          }
        }
        switch (actionName) {
          case 'addPublicAddresses':
          case 'addPublicAddress':
          case 'requestFunds':
          case 'rejectFundsRequest':
          case 'recordObtData': {
            const { fee } = await this.multicastServers(
              feeActionMap[actionName].action,
              {
                [feeActionMap[actionName].propName]:
                  params[feeActionMap[actionName].propName]
              }
            )
            params.maxFee = fee
            break
          }
          case 'registerFioAddress':
          case 'renewFioAddress': {
            const { fee } = await this.multicastServers('getFee', {
              endPoint: EndPoint[actionName]
            })
            params.maxFee = fee
            if (actionName === 'registerFioAddress') {
              const res = await this.multicastServers(actionName, params)
              this.walletLocalData.otherData.fioAddresses.push({
                name: params.fioAddress,
                expiration: res.expiration
              })
              return {
                expiration: res.expiration,
                feeCollected: res.fee_collected
              }
            }
          }
        }

        return this.multicastServers(actionName, params)
      },
      getFee: async (
        actionName: string,
        fioAddress: string = ''
      ): Promise<number> => {
        const { fee } = await this.multicastServers('getFee', {
          endPoint: EndPoint[actionName],
          fioAddress
        })
        return fee
      },
      getFioAddresses: (): { name: string, expiration: string }[] => {
        return this.walletLocalData.otherData.fioAddresses
      },
      getFioAddressNames: (): string[] => {
        return this.walletLocalData.otherData.fioAddresses.map(
          fioAddress => fioAddress.name
        )
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
    this.walletLocalData.otherData.fioAddresses = []
    try {
      const result = await this.multicastServers('getFioNames', {
        fioPublicKey: walletInfo.keys.publicKey
      })

      for (const fioAddress of result.fio_addresses) {
        this.walletLocalData.otherData.fioAddresses.push({
          name: fioAddress.fio_address,
          expiration: fioAddress.expiration
        })
      }
      this.localDataDirty()
    } catch (error) {
      console.log(error)
    }
  }

  // Poll on the blockheight
  async checkBlockchainInnerLoop() {
    try {
      const info = await this.multicastServers('getChainInfo')
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

  async multicastServers(actionName: string, params?: any): Promise<any> {
    return asyncWaterfall(
      this.currencyInfo.defaultSettings.apiUrls.map(apiUrl => async () => {
        const fioSDK = new FIOSDK(
          this.walletInfo.keys.fioKey,
          this.walletInfo.keys.publicKey,
          apiUrl,
          this.fetchCors
        )

        switch (actionName) {
          case 'getChainInfo':
            return fioSDK.transactions.getChainInfo()
          default:
            return fioSDK.genericAction(actionName, params)
        }
      })
    )
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

    try {
      const { balance } = await this.multicastServers('getFioBalance')
      nativeAmount = balance + ''
    } catch (e) {
      this.log('checkAccountInnerLoop error: ' + JSON.stringify(e))
      nativeAmount = '0'
    }
    this.updateBalance(currencyCode, nativeAmount)

    try {
      const result = await this.multicastServers('getFioNames', {
        fioPublicKey: this.walletInfo.keys.publicKey
      })

      this.walletLocalData.otherData.fioAddresses = []
      for (const fioAddress of result.fio_addresses) {
        this.walletLocalData.otherData.fioAddresses.push({
          name: fioAddress.fio_address,
          expiration: fioAddress.expiration
        })
      }
      this.localDataDirty()
    } catch (e) {
      this.log('checkAccountInnerLoop getFioNames error: ' + JSON.stringify(e))
    }
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

    const feeResponse = await this.multicastServers('getFee', {
      endPoint: EndPoint.transferTokens
    })
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
    const transfer = await this.multicastServers('transferTokens', {
      payeeFioPublicKey: publicAddress,
      amount: quantity,
      maxFee: fee
    })

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
