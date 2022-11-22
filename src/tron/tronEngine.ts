import { eq } from 'biggystring'
import {
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeLog,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine'
import { TronTools } from './tronPlugin'

const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000
const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000

export class TronEngine extends CurrencyEngine<TronTools> {
  fetchCors: EdgeFetchFunction
  log: EdgeLog

  constructor(
    currencyPlugin: TronTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchCors: EdgeFetchFunction
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.fetchCors = fetchCors
    this.log = opts.log
  }

  async checkBlockchainInnerLoop(): Promise<void> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  updateBalance(tk: string, balance: string): void {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.log(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  async checkTokenBalances(): Promise<void> {
    throw new Error('Must implement checkTokenBalances')
  }

  async checkAccountInnerLoop(): Promise<void> {
    throw new Error('Must implement checkAccountInnerLoop')
  }

  async queryTransactions(): Promise<void> {
    throw new Error('Must implement queryTransactions')
  }

  async checkUpdateNetworkFees(): Promise<void> {
    throw new Error('Must implement checkUpdateNetworkFees')
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.addToLoop(
      'checkBlockchainInnerLoop',
      BLOCKCHAIN_POLL_MILLISECONDS
    ).catch(() => {})
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('checkTokenBalances', ACCOUNT_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop(
      'checkUpdateNetworkFees',
      NETWORKFEES_POLL_MILLISECONDS
    ).catch(() => {})
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS).catch(
      () => {}
    )
    super.startEngine().catch(() => {})
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  getDisplayPrivateSeed(): string {
    return this.walletInfo.keys?.tronMnemonic ?? this.walletInfo.keys?.tronKey
  }

  getDisplayPublicSeed(): string {
    return this.walletInfo.keys?.publicKey ?? ''
  }
}

export { CurrencyEngine }
