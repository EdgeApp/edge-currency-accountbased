// @flow
import { api, tx, wallet } from '@cityofzion/neon-js'
import { bns } from 'biggystring'
import {
  type EdgeSpendInfo,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine.js'
import { getDenomInfo, getOtherParams, promiseAny } from '../common/utils.js'
import { currencyInfo } from './neoInfo.js'
import { NeoPlugin } from './neoPlugin.js'
import { type NeoTxOtherParams } from './neoTypes.js'
const { Account } = wallet
const ApiProvider = api.neoscan.instance

const PRIMARY_CURRENCY = currencyInfo.currencyCode
// const ADDRESS_POLL_MILLISECONDS = 10000
const ACCOUNT_POLL_MILLISECONDS = 15000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 10000

type NeoFunction =
  | 'neo_sendTx'
  | 'neo_getBalance'
  | 'neo_getTx'
  | 'neo_getblockcount'
  | 'neo_broadcastTx'

export class NeoEngine extends CurrencyEngine {
  neoPlugin: NeoPlugin

  constructor(
    currencyPlugin: NeoPlugin,
    walletInfo: EdgeWalletInfo,
    initOptions: any, // BinanceInitOptions,
    opts: any // EdgeCurrencyEngineOptions
  ) {
    super(currencyPlugin, walletInfo, opts)
  }

  async fetchGet(url: string) {
    const response = await this.io.fetch(url, {
      method: 'GET'
    })
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return response.json()
  }

  async checkBlockchainInnerLoop() {
    try {
      const blockHeight = await this.multicastServers('neo_getblockcount')
      this.log(`Got block height ${blockHeight}`)
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight // Convert to decimal
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (err) {
      this.log('Error fetching height: ' + err)
    }
  }

  updateBalance(tk: string, balance: string) {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.log(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  async checkAccountInnerLoop() {
    const address = wallet.getAddressFromScriptHash(
      wallet.getScriptHashFromPublicKey(this.walletLocalData.publicKey)
    )

    try {
      const balances = await this.multicastServers('neo_getBalance', address)
      if (balances.length === 0) {
        this.updateBalance('NEO', '0')
      }
      for (const tk of this.walletLocalData.enabledTokens) {
        for (const balance of balances) {
          if (balance.asset === this.currencyInfo.defaultSettings.assets[tk]) {
            const denom = getDenomInfo(this.currencyInfo, tk)
            if (!denom) {
              this.log(`Received unsupported currencyCode: ${tk}`)
              break
            }
            const nativeAmount = bns.mul(balance.value, denom.multiplier)
            this.updateBalance(tk, nativeAmount)
          }
        }
      }
    } catch (e) {
      this.updateBalance('NEO', '0')
      this.log(`Error checking NEO address balance`)
    }
  }

  // TODO:
  async checkTransactionsInnerLoop() {
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async multicastServers(func: NeoFunction, ...params: any): Promise<any> {
    const out = { result: '', server: 'no server' }
    switch (func) {
      case 'neo_getBalance': {
        const promises = []
        const rpcNodes = this.currencyInfo.defaultSettings.neoRpcNodes
        for (const node of rpcNodes) {
          const endpoint: string = node
          promises.push(
            this.io.fetch(endpoint, {
              method: 'POST',
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'getaccountstate',
                params: params,
                id: 1
              }),
              headers: {
                'content-type': 'text/plain'
              }
            })
          )
        }
        const response = (await promiseAny(promises)).json()
        if (response && response.result) {
          return {
            result: response.result.balances,
            server: 'irrelevant'
          }
        } else {
          throw new Error('NEO send fail with error: ' + response.error)
        }
      }
    }
    this.log(`NEO multicastServers ${func} ${out.server} won`)

    return out.result
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS)
    // this.addToLoop('checkUpdateNetworkFees', NETWORKFEES_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    // this.addToLoop(
    //   'checkUnconfirmedTransactionsInnerLoop',
    //   UNCONFIRMED_TRANSACTION_POLL_MILLISECONDS
    // )
    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode, nativeBalance } = super.makeSpend(
      edgeSpendInfoIn
    )

    /* Just consider only one target */
    const networkFee = 0 // neo has 10 gas free.
    const spendTarget = edgeSpendInfo.spendTargets[0]
    const publicAddress = spendTarget.publicAddress
    const nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount
    const data =
      spendTarget.otherParams != null ? spendTarget.otherParams.data : undefined

    if (bns.gt(nativeAmount, nativeBalance)) {
      throw new InsufficientFundsError()
    }

    let otherParams: Object = {}

    if (currencyCode === PRIMARY_CURRENCY) {
      const neoParams: NeoTxOtherParams = {
        from: this.walletLocalData.publicKey,
        to: [publicAddress],
        networkFee,
        isNative: true,
        data
      }
      otherParams = neoParams
    } else {
      const tokenInfo = this.getTokenInfo(currencyCode)
      if (!tokenInfo || typeof tokenInfo.contractAddress !== 'string') {
        throw new Error(
          'Error: Token not supported or invalid contract address'
        )
      }
      const contractAddress = tokenInfo.contractAddress

      const neoParams: NeoTxOtherParams = {
        from: this.walletLocalData.publicKey,
        to: [publicAddress],
        networkFee,
        isNative: false,
        data,
        asset: contractAddress
      }
      otherParams = neoParams
    }

    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: '' + networkFee, // networkFee, supposedly fixed
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams // otherParams
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)
    const neoApiProvider = new ApiProvider(
      this.currencyInfo.defaultSettings.neoScanUrl.MainNet
    )
    const privateKey = this.walletInfo.keys.neoKey
    const currencyCode = edgeTransaction.currencyCode
    const amount = edgeTransaction.nativeAmount
    const account = new Account(privateKey)

    const denom = getDenomInfo(this.currencyInfo, currencyCode)
    if (!denom) {
      this.log(`Received unsupported currencyCode: ${currencyCode}`)
      throw new Error(`Received unsupported currencyCode: ${currencyCode}`)
    }

    const nativeAmount = parseInt(amount) / parseInt(denom.multiplier)

    const balance = await neoApiProvider.getBalance(account.address)
    const signedTx = new tx.ContractTransaction()
    signedTx
      .addIntent('NEO', nativeAmount, otherParams.to[0])
      .calculate(balance)
      .sign(privateKey)

    this.log(`SUCCESS NEO broadcastTx\n${JSON.stringify(signedTx)}`)
    otherParams.serializedTx = signedTx.serialize(true)
    edgeTransaction.txid = signedTx.hash
    edgeTransaction.otherParams = otherParams
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)
    const neoSignedTransaction = otherParams.serializedTx
    const response = await this.multicastServers(
      'neo_broadcastTx',
      neoSignedTransaction
    )
    if (response.result) {
      this.log(`SUCCESS broadcastTx\n${JSON.stringify(edgeTransaction.txid)}`)
    }
    this.log('edgeTransaction = ', edgeTransaction)
    return edgeTransaction
  }

  getDisplayPrivateSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.neoKey) {
      return this.walletInfo.keys.neoKey
    }
    return ''
  }

  getDisplayPublicSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }
}
