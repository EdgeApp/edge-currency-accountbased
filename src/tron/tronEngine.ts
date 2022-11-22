import { add, eq, lt, mul } from 'biggystring'
import { asMaybe, Cleaner } from 'cleaners'
import {
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeLog,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine'
import {
  asyncWaterfall,
  hexToDecimal,
  makeMutex,
  padHex,
  shuffleArray
} from '../common/utils'
import { TronTools } from './tronPlugin'
import {
  asAccountResources,
  asChainParams,
  asTransaction,
  asTRC20Balance,
  asTRC20Transaction,
  asTRC20TransactionInfo,
  asTriggerSmartContract,
  asTronBlockHeight,
  asTronQuery,
  asTRXBalance,
  asTRXTransferContract,
  ReferenceBlock,
  TronAccountResources,
  TronNetworkFees,
  TxQueryCache
} from './tronTypes'
import { base58ToHexAddress, hexToBase58Address } from './tronUtils'

const queryTxMutex = makeMutex()

const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000
const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000

type TronFunction =
  | 'trx_blockNumber'
  | 'trx_chainParams'
  | 'trx_getAccountResource'
  | 'trx_getBalance'
  | 'trx_getTransactionInfo'
  | 'trx_getTransactions'

export class TronEngine extends CurrencyEngine<TronTools> {
  fetchCors: EdgeFetchFunction
  log: EdgeLog
  recentBlock: ReferenceBlock
  accountResources: TronAccountResources
  networkFees: TronNetworkFees

  constructor(
    currencyPlugin: TronTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchCors: EdgeFetchFunction
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.fetchCors = fetchCors
    this.log = opts.log
    this.recentBlock = {
      hash: '0',
      number: 0,
      timestamp: 0
    }
    this.accountResources = {
      bandwidth: 0,
      energy: 0
    }
    this.networkFees = {
      createAccountFeeSUN: 100000, // network default
      bandwidthFeeSUN: 1000, // network default
      energyFeeSUN: 280 // network default
    }
    this.processTRXTransaction = this.processTRXTransaction.bind(this)
    this.processTRC20Transaction = this.processTRC20Transaction.bind(this)
  }

  async fetch(
    server: string,
    path: string,
    opts: Object = {}
  ): Promise<{ server: string; result: Object }> {
    const url = server + path
    const response = await this.fetchCors(url, opts)
    if (!response.ok || response.status !== 200) {
      this.log(`The server returned error code ${response.status} for ${url}`)
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    const result = await response.json()
    if (typeof result !== 'object') {
      const msg = `Invalid return value ${path} in ${server}`
      this.log(msg)
      throw new Error(msg)
    }
    return { server, result }
  }

  initOtherData(): void {
    if (this.otherData.txQueryCache == null) {
      this.otherData.txQueryCache = {
        mainnet: {
          txid: '',
          timestamp: 0
        },
        trc20: {
          txid: '',
          timestamp: 0
        }
      }
    }
  }

  async checkBlockchainInnerLoop(): Promise<void> {
    try {
      const res = await this.multicastServers(
        'trx_blockNumber',
        '/wallet/getnowblock'
      )
      const json = asTronBlockHeight(res)

      const blockHeight: number = json.block_header.raw_data.number

      Object.assign(this.recentBlock, {
        hash: json.blockID,
        number: blockHeight,
        timestamp: json.block_header.raw_data.timestamp
      })

      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e: any) {
      this.log.error(`Error fetching height: `, e)
    }
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
    const address = base58ToHexAddress(this.walletLocalData.publicKey)

    for (const currencyCode of this.enabledTokens) {
      const metaToken = this.allTokens.find(
        token => token.currencyCode === currencyCode
      )
      if (metaToken?.contractAddress == null) continue
      const contractAddressHex = base58ToHexAddress(metaToken.contractAddress)
      const body = {
        contract_address: contractAddressHex,
        function_selector: 'balanceOf(address)',
        parameter: padHex(address, 32),
        owner_address: address
      }

      try {
        const res = await this.multicastServers(
          'trx_getBalance',
          '/wallet/triggerconstantcontract',
          body
        )

        const balance = asTRC20Balance(res)

        if (metaToken != null) {
          this.updateBalance(
            metaToken.currencyCode,
            hexToDecimal(balance.constant_result[0])
          )
        }
      } catch (e) {
        this.log.error(`Failed to get balance of ${currencyCode}`, e)
      }
    }
  }

  async checkAccountInnerLoop(): Promise<void> {
    const body = { address: base58ToHexAddress(this.walletLocalData.publicKey) }
    try {
      const res = await this.multicastServers(
        'trx_getBalance',
        '/wallet/getaccount',
        body
      )
      const balances = asMaybe(asTRXBalance)(res)

      if (balances != null) {
        this.updateBalance(
          this.currencyInfo.currencyCode,
          balances.balance.toString()
        )
      } else if (typeof res === 'object' && Object.keys(res).length === 0) {
        // New accounts return an empty {} response
        this.updateBalance(this.currencyInfo.currencyCode, '0')
      }
    } catch (e: any) {
      this.log.error('Error checking TRX address balance: ', e)
    }

    try {
      const res = await this.multicastServers(
        'trx_getAccountResource',
        '/wallet/getaccountresource',
        body
      )
      const resources = asAccountResources(res)

      this.accountResources = {
        bandwidth: resources.freeNetLimit,
        energy: resources.EnergyLimit
      }
    } catch (e: any) {
      this.log.error('Error checking TRX address resources: ', e)
    }
  }

  async queryTransactions(): Promise<void> {
    return await queryTxMutex(
      async () => await this.queryTransactionsInnerLoop()
    )
  }

  async queryTransactionsInnerLoop(): Promise<void> {
    try {
      await this.fetchTrxTransactions()
      await this.fetchTrc20Transactions()
    } catch (e: any) {
      this.log.error(`Error checkTransactionsFetch fetchTrxTransactions: `, e)
      throw e
    }

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }

    for (const token of this.enabledTokens) {
      this.tokenCheckTransactionsStatus[token] = 1
    }
    this.updateOnAddressesChecked()
  }

  async fetchTrxTransactions(): Promise<void> {
    let complete = false

    while (!complete) {
      complete = await this.fetchTransactions(
        'mainnet',
        asTransaction,
        this.processTRXTransaction
      )
    }
  }

  async fetchTrc20Transactions(): Promise<void> {
    let complete = false

    while (!complete) {
      complete = await this.fetchTransactions(
        'trc20',
        asTRC20Transaction,
        this.processTRC20Transaction
      )
    }
  }

  async fetchTransactions<T>(
    type: 'mainnet' | 'trc20',
    cleaner: Cleaner<T>,
    processor: (tx: T) => Promise<TxQueryCache> | TxQueryCache
  ): Promise<boolean> {
    const typePath = type === 'trc20' ? type : ''
    const timestamp = this.otherData.txQueryCache[type].timestamp

    const url = `/v1/accounts/${this.walletLocalData.publicKey}/transactions/${typePath}?limit=200&order_by=block_timestamp,asc&min_timestamp=${timestamp}`
    const res = await this.multicastServers('trx_getTransactions', url)

    const { data, meta, success } = asTronQuery(cleaner)(res)
    const isComplete = meta?.links?.next == null

    if (!success) {
      throw new Error('Failed to query TRX transactions')
    }

    for (const tx of data) {
      const { timestamp: newTimestamp, txid } = await processor(tx)
      this.otherData.txQueryCache[type].txid = txid
      this.otherData.txQueryCache[type].timestamp = newTimestamp
      this.walletLocalDataDirty = true
    }

    return isComplete
  }

  processTRXTransaction(tx: ReturnType<typeof asTransaction>): TxQueryCache {
    const {
      txID: txid,
      block_timestamp: timestamp,
      blockNumber,
      ret: retArray,
      raw_data: { contract: contractArray }
    } = tx

    const out = { txid, timestamp }

    // Already saw this one so we can exit early
    if (txid === this.otherData.txQueryCache.mainnet.txid) {
      return out
    }

    let transfer:
      | ReturnType<typeof asTRXTransferContract>
      | ReturnType<typeof asTriggerSmartContract>
      | undefined

    // Find the relevant item in the array
    for (const contract of contractArray) {
      transfer = asMaybe(asTRXTransferContract)(contract)
      if (transfer != null) {
        const {
          parameter: {
            value: { amount, owner_address: fromAddress, to_address: toAddress }
          }
        } = transfer

        if (retArray.length < 1) return out
        const { contractRet: status, fee } = retArray[0]

        let feeNativeAmount = fee.toString()

        const from = hexToBase58Address(fromAddress)
        const to = hexToBase58Address(toAddress)

        const ourReceiveAddresses: string[] = []

        let nativeAmount = amount.toString()

        if (from === this.walletLocalData.publicKey) {
          // Send
          if (from === to) {
            // Spend to self. nativeAmount is just the fee
            nativeAmount = mul(feeNativeAmount, '-1')
          } else {
            // set amount to spent amount
            nativeAmount = mul(add(nativeAmount, feeNativeAmount), '-1')
          }
          if (status !== 'SUCCESS') {
            // Failed tx. Still need to record fee.
            nativeAmount = '0'
          }
        } else {
          // Receive
          if (status !== 'SUCCESS') {
            // Failed receive. Nothing to record.
            return out
          }
          ourReceiveAddresses.push(this.walletLocalData.publicKey)
          feeNativeAmount = '0'
        }

        const currencyCode = this.currencyInfo.currencyCode

        const edgeTransaction: EdgeTransaction = {
          txid,
          date: Math.floor(timestamp / 1000),
          currencyCode,
          blockHeight: blockNumber,
          nativeAmount,
          networkFee: feeNativeAmount,
          ourReceiveAddresses: ourReceiveAddresses,
          signedTx: ''
        }

        this.addTransaction(currencyCode, edgeTransaction)
        return out
      }

      // Other types of transaction may incur a TRX fee the user paid. The code below only decodes 'triggersmartcontract' transactions (TRC20)
      // There are other types (ie. TRC10) that are ignored for now
      transfer = asMaybe(asTriggerSmartContract)(contract)
      if (transfer != null) {
        const {
          parameter: {
            value: { owner_address: fromAddress }
          }
        } = transfer

        if (
          hexToBase58Address(fromAddress) !== this.walletLocalData.publicKey
        ) {
          break
        }

        if (retArray.length < 1) return out

        const feeNativeAmount = retArray[0].fee.toString()

        const currencyCode = this.currencyInfo.currencyCode

        const edgeTransaction: EdgeTransaction = {
          txid,
          date: Math.floor(timestamp / 1000),
          currencyCode,
          blockHeight: blockNumber,
          nativeAmount: mul(feeNativeAmount, '-1'),
          networkFee: feeNativeAmount,
          ourReceiveAddresses: [],
          signedTx: ''
        }

        this.addTransaction(currencyCode, edgeTransaction)
        return out
      }
    }
    return out
  }

  // Parse the transfer and return the transaction txid and timestamp for caching
  async processTRC20Transaction(
    tx: ReturnType<typeof asTRC20Transaction>
  ): Promise<TxQueryCache> {
    const {
      transaction_id: txid,
      token_info: { address: contractAddress },
      block_timestamp: timestamp,
      from,
      to,
      type,
      value
    } = tx

    const out = { txid, timestamp }

    // Already saw this one so we can exit early
    if (txid === this.otherData.txQueryCache.trc20.txid) {
      return out
    }

    const res = await this.multicastServers(
      'trx_getTransactionInfo',
      '/wallet/gettransactioninfobyid',
      {
        value: txid
      }
    )

    const { blockNumber: blockHeight, fee } = asTRC20TransactionInfo(res)

    const metaToken = this.allTokens.find(
      token => token.contractAddress === contractAddress
    )
    if (type !== 'Transfer' || metaToken == null) return out

    const ourReceiveAddresses: string[] = []

    let nativeAmount = value
    const parentNetworkFee = fee

    if (from === this.walletLocalData.publicKey) {
      // Send
      nativeAmount = mul(value, '-1')
    } else if (to === this.walletLocalData.publicKey) {
      // Receive
      ourReceiveAddresses.push(this.walletLocalData.publicKey)
    } else {
      // Unknown
      return out
    }

    const edgeTransaction: EdgeTransaction = {
      txid,
      date: Math.floor(timestamp / 1000),
      currencyCode: metaToken.currencyCode,
      blockHeight,
      nativeAmount,
      networkFee: '0',
      ourReceiveAddresses,
      signedTx: ''
    }

    // Record the parentNetworkFee if it's a send
    if (lt(nativeAmount, '0')) {
      edgeTransaction.parentNetworkFee = parentNetworkFee.toString()
    }

    this.addTransaction(metaToken.currencyCode, edgeTransaction)
    return out
  }

  async checkUpdateNetworkFees(): Promise<void> {
    try {
      const res = await this.multicastServers(
        'trx_chainParams',
        '/wallet/getchainparameters'
      )
      const json = asChainParams(res).chainParameter

      // Network fees
      const createAccountFeeSUN = json.find(
        param => param.key === 'getCreateAccountFee'
      )
      const bandwidthFeeSUN = json.find(
        param => param.key === 'getTransactionFee'
      )
      const energyFeeSUN = json.find(param => param.key === 'getEnergyFee')

      if (
        createAccountFeeSUN?.value == null ||
        bandwidthFeeSUN?.value == null ||
        energyFeeSUN?.value == null
      )
        throw new Error('Error fetching networkFees')

      // 1 SUN = 0.000001 TRX utilizing fromSun()
      this.networkFees = {
        createAccountFeeSUN: createAccountFeeSUN.value,
        bandwidthFeeSUN: bandwidthFeeSUN.value,
        energyFeeSUN: energyFeeSUN.value
      }
    } catch (e: any) {
      this.log.error('checkUpdateNetworkFees error: ', e)
    }
  }

  async multicastServers(
    func: TronFunction,
    path: string,
    body: JsonObject = {}
  ): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs: Array<() => Promise<any>> = []

    switch (func) {
      case 'trx_chainParams':
        funcs =
          this.currencyInfo.defaultSettings.otherSettings.tronNodeServers.map(
            (server: string) => async () => {
              return await this.fetch(server, path)
            }
          )
        break

      case 'trx_blockNumber':
      case 'trx_getAccountResource':
      case 'trx_getBalance':
      case 'trx_getTransactionInfo':
        funcs =
          this.currencyInfo.defaultSettings.otherSettings.tronNodeServers.map(
            (server: string) => async () => {
              const opts = {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
              }
              return await this.fetch(server, path, opts)
            }
          )
        break
      case 'trx_getTransactions':
        funcs =
          this.currencyInfo.defaultSettings.otherSettings.tronApiServers.map(
            (server: string) => async () => {
              const opts = {
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json'
                }
              }
              return await this.fetch(server, path, opts)
            }
          )
        break
    }

    // Randomize array
    funcs = shuffleArray(funcs)
    out = await asyncWaterfall(funcs)
    this.log(`TRX multicastServers ${func} ${out.server} won`)
    return out.result
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.initOtherData()
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
