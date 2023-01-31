import { byteArray2hexStr } from '@tronscan/client/src/utils/bytes'
import { contractJsonToProtobuf } from '@tronscan/client/src/utils/tronWeb'
import { add, div, eq, gt, lt, lte, mul, sub } from 'biggystring'
import { asMaybe, Cleaner } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeLog,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  asyncWaterfall,
  getDenomInfo,
  getFetchCors,
  getOtherParams,
  hexToDecimal,
  makeMutex,
  padHex,
  shuffleArray
} from '../common/utils'
import { TronTools } from './tronPlugin'
import {
  asAccountResources,
  asBroadcastResponse,
  asChainParams,
  asEstimateEnergy,
  asTransaction,
  asTRC20Balance,
  asTRC20Transaction,
  asTRC20TransactionInfo,
  asTriggerSmartContract,
  asTronBlockHeight,
  asTronKeys,
  asTronQuery,
  asTRXBalance,
  asTRXTransferContract,
  CalcTxFeeOpts,
  ReferenceBlock,
  TronAccountResources,
  TronNetworkFees,
  TronNetworkInfo,
  TronOtherdata,
  TronTxParams,
  TxQueryCache
} from './tronTypes'
import {
  base58ToHexAddress,
  encodeTRC20Transfer,
  hexToBase58Address,
  TronScan
} from './tronUtils'

const queryTxMutex = makeMutex()

const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000
const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000

type TronFunction =
  | 'trx_blockNumber'
  | 'trx_broadcastTx'
  | 'trx_chainParams'
  | 'trx_estimateEnergy'
  | 'trx_getAccountResource'
  | 'trx_getBalance'
  | 'trx_getTransactionInfo'
  | 'trx_getTransactions'

export class TronEngine extends CurrencyEngine<TronTools> {
  fetchCors: EdgeFetchFunction
  log: EdgeLog
  readonly recentBlock: ReferenceBlock
  accountResources: TronAccountResources
  networkFees: TronNetworkFees
  networkInfo: TronNetworkInfo
  accountExistsCache: { [address: string]: boolean }
  energyEstimateCache: { [addressAndContract: string]: number }
  tronscan: TronScan

  constructor(
    currencyPlugin: TronTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchCors: EdgeFetchFunction,
    networkInfo: TronNetworkInfo
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.fetchCors = fetchCors
    this.log = opts.log
    this.networkInfo = networkInfo
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
      // network defaults
      getCreateAccountFee: 100000,
      getTransactionFee: 1000,
      getEnergyFee: 280,
      getMemoFee: 1000000
    }
    this.tronscan = new TronScan(this.recentBlock)
    this.accountExistsCache = {} // Minimize calls to check recipient account resources (existence)
    this.energyEstimateCache = {} // Minimize calls to check energy estimate
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
        bandwidth: resources.freeNetLimit - resources.freeNetUsed,
        energy: resources.EnergyLimit - resources.EnergyUsed
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
          signedTx: '',
          walletId: this.walletId
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
          signedTx: '',
          walletId: this.walletId
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
      signedTx: '',
      walletId: this.walletId
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
      for (const feeName of Object.keys(this.networkFees)) {
        const feeObj = json.find(param => param.key === feeName)
        if (feeObj != null) {
          this.networkFees = { ...this.networkFees, [feeName]: feeObj.value }
        }
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
        funcs = this.networkInfo.tronNodeServers.map(
          (server: string) => async () => {
            return await this.fetch(server, path)
          }
        )
        break

      case 'trx_blockNumber':
      case 'trx_broadcastTx':
      case 'trx_estimateEnergy':
      case 'trx_getAccountResource':
      case 'trx_getBalance':
      case 'trx_getTransactionInfo':
        funcs = this.networkInfo.tronNodeServers.map(
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
        funcs = this.networkInfo.tronApiServers.map(
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

  // Determines how much TRX the tx will cost after accounting for bandwidth and energy
  // TRX transfers to new accounts will consume TRX and bandwidth (or equivalent TRX)
  // TRX transfers to existing accounts will bandwidth or TRX
  // TRC20 transfers to new (unknown to contract) will consume energy (consuming TRX to make up any free energy shortfall) and bandwidth (or equivalent TRX)
  // TRC20 transfers to existing (known to contract) accounts will consume same bandwidth but less energy than above
  async calcTxFee(opts: CalcTxFeeOpts): Promise<string> {
    const { note, receiverAddress, tokenOpts, unsignedTxHex } = opts

    const denom = getDenomInfo(
      this.currencyInfo,
      this.currencyInfo.currencyCode
    )
    if (denom == null) throw new Error('calcTxFee unknown denom')

    /// /////////
    // Energy //
    /// /////////

    // Energy is only needed for smart contract calls

    let energyNeeded = 0

    if (tokenOpts != null) {
      const { contractAddress, data } = tokenOpts

      if (
        this.energyEstimateCache[`${receiverAddress}:${contractAddress}`] ==
        null
      ) {
        // If we don't have this address/contract address combo in the cache, go query it
        const body = {
          owner_address: base58ToHexAddress(this.walletLocalData.publicKey),
          contract_address: base58ToHexAddress(contractAddress),
          function_selector: 'transfer(address,uint256)',
          parameter: data.slice(8) // Remove function id bytes
        }

        try {
          const res = await this.multicastServers(
            'trx_estimateEnergy',
            '/wallet/triggerconstantcontract',
            body
          )
          const json = asEstimateEnergy(res)
          const status = json.transaction.ret[0]?.ret

          // In practice, ret is an empty object if successful. Other methods return SUCCESS in this field so we're looking for either option.
          if (status != null && status !== 'SUCCESS') {
            throw new Error('calcTxFee Failed to estimate fee')
          }

          this.energyEstimateCache[`${receiverAddress}:${contractAddress}`] =
            json.energy_used
        } catch (e) {
          this.log.warn('trx_estimateEnergy error. Using a high default.', e)
        }
      }

      energyNeeded = Math.max(
        (this.energyEstimateCache[`${receiverAddress}:${contractAddress}`] ??
          100000) - this.accountResources.energy,
        0
      )
    }
    this.log('Account energy: ', this.accountResources.energy)
    this.log('Energy needed: ', energyNeeded)

    /// ////////////
    // Bandwidth //
    /// ////////////

    // Bandwidth is dependent on size of final transaction unless a TRX transaction creates a new account and then it's 100

    let bandwidthNeeded =
      unsignedTxHex.length / 2 + // hex2bytes
      65 + // signature bytes
      64 + // MAX_RESULT_SIZE_IN_TX
      5 // protobuf overhead

    if (this.accountExistsCache[receiverAddress] === undefined) {
      try {
        // Determine if recipient exists
        const res = await this.multicastServers(
          'trx_getAccountResource',
          '/wallet/getaccountresource',
          { address: base58ToHexAddress(receiverAddress) }
        )

        this.accountExistsCache[receiverAddress] =
          asMaybe(asAccountResources)(res) != null
      } catch (e: any) {
        this.log.error(
          'calcTxFee error: Failed to call trx_getAccountResource. Allowing the user to proceed assuming high fee.',
          e
        )
      }
    }

    // The default bandwidth value is appropriate for all cases except for a TRX transaction that creates a new account
    if (tokenOpts == null && !this.accountExistsCache[receiverAddress]) {
      bandwidthNeeded = 100
    }

    // Bandwidth is paid with bandwidth or TRX (unlike energy)
    if (bandwidthNeeded < this.accountResources.bandwidth) {
      bandwidthNeeded = 0
    }

    this.log('Account bandwidth: ', this.accountResources.bandwidth)
    this.log('Bandwidth needed: ', bandwidthNeeded)

    /// /////////////
    // New Account //
    /// /////////////

    let createNewAccountFee = 0

    if (tokenOpts == null && !this.accountExistsCache[receiverAddress]) {
      // Fee is the variable create account fee plus 1 TRX
      createNewAccountFee =
        this.networkFees.getCreateAccountFee + parseInt(denom.multiplier)
    }

    this.log('Create account fee: ', createNewAccountFee)

    /// /////////////
    // Note /////////
    /// /////////////

    // Transaction notes always burn 1 TRX if it exists. In addition, it also contributes to the bandwidth cost but is already accounted for in unsignedTxHex
    const transactionNoteFee = note != null ? this.networkFees.getMemoFee : 0

    this.log('Transaction note fee: ', transactionNoteFee)

    // The fee isn't a transaction parameter so these calculations are to show the user ahead of time
    // what the fee will be. Using a fallback value doesn't affect the actual transaction sent out.

    const totalSUN =
      energyNeeded * this.networkFees.getEnergyFee +
      bandwidthNeeded * this.networkFees.getTransactionFee +
      createNewAccountFee +
      transactionNoteFee

    this.log('Total fee in SUN: ', totalSUN)

    return totalSUN.toString()
  }

  // Returns unsigned transaction as object and hex string. Function is actually synchronous because of the overloaded troncan client.
  async txBuilder(
    params: TronTxParams
  ): Promise<{ transaction: any; transactionHex: string }> {
    const { currencyCode, toAddress, nativeAmount, data, note } = params

    let feeLimit: number | undefined
    let contractJson: any

    if (currencyCode === this.currencyInfo.currencyCode) {
      contractJson = {
        parameter: {
          value: {
            to_address: base58ToHexAddress(toAddress),
            owner_address: base58ToHexAddress(this.walletLocalData.publicKey),
            amount: parseInt(nativeAmount)
          }
        },
        type: 'TransferContract'
      }
    } else {
      const metaToken = this.allTokens.find(
        token => token.currencyCode === currencyCode
      )
      if (metaToken?.contractAddress == null) {
        throw new Error(`txBuilder unknown currency code ${currencyCode}`)
      }

      contractJson = {
        parameter: {
          value: {
            owner_address: base58ToHexAddress(this.walletLocalData.publicKey),
            contract_address: base58ToHexAddress(metaToken.contractAddress),
            data,
            call_value: 0
          }
        },
        type: 'TriggerSmartContract'
      }
      feeLimit = this.networkInfo.defaultFeeLimit
    }
    const transaction = contractJsonToProtobuf(contractJson)
    await this.tronscan.addRef(transaction, feeLimit)
    if (note != null) {
      await this.tronscan.addData(transaction, note)
    }
    const transactionHex = byteArray2hexStr(
      transaction.getRawData().serializeBinary()
    )

    return { transaction, transactionHex }
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
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const balance = this.getBalance({
      currencyCode: spendInfo.currencyCode
    })

    if (spendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { publicAddress, memo } = spendInfo.spendTargets[0]
    const note = memo === '' ? undefined : memo

    if (publicAddress == null || spendInfo.currencyCode == null) {
      throw new Error('Error: need recipient address and/or currencyCode')
    }

    if (spendInfo.currencyCode === this.currencyInfo.currencyCode) {
      // For mainnet currency, the fee can scale with the amount sent so we should find the
      // appropriate amount by recursively calling calcMiningFee. This is adapted from the
      // same function in edge-core-js.

      const getMax = async (min: string, max: string): Promise<string> => {
        const diff = sub(max, min)
        if (lte(diff, '1')) {
          return min
        }
        const mid = add(min, div(diff, '2'))

        const txParams = {
          toAddress: publicAddress,
          currencyCode: this.currencyInfo.currencyCode,
          nativeAmount: mid
        }
        const { transactionHex } = await this.txBuilder(txParams)

        // Try the average:
        spendInfo.spendTargets[0].nativeAmount = mid
        const fee = await this.calcTxFee({
          receiverAddress: publicAddress,
          unsignedTxHex: transactionHex,
          note
        })

        const totalAmount = add(mid, fee)
        if (gt(totalAmount, balance)) {
          return await getMax(min, mid)
        } else {
          return await getMax(mid, max)
        }
      }

      return await getMax('0', add(balance, '1'))
    } else {
      // For tokens, the max amount is the balance but we should call makeSpend to make sure there's
      // enough mainnet currency to pay the fee
      spendInfo.spendTargets[0].nativeAmount = balance
      await this.makeSpend(spendInfo)
      return balance
    }
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = super.makeSpendCheck(
      edgeSpendInfoIn
    )

    const isTokenTransfer = currencyCode !== this.currencyInfo.currencyCode

    // Tron can only have one output
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { nativeAmount, publicAddress, otherParams, memo } =
      edgeSpendInfo.spendTargets[0]
    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')

    if (nativeAmount == null) throw new NoAmountSpecifiedError()
    const data: string | undefined =
      otherParams?.data ??
      (currencyCode !== this.currencyInfo.currencyCode
        ? encodeTRC20Transfer(publicAddress, nativeAmount)
        : undefined)
    const metaToken = isTokenTransfer
      ? this.allTokens.find(token => token.currencyCode === currencyCode)
      : undefined

    const note = memo === '' ? undefined : memo

    const txOtherParams: TronTxParams = {
      currencyCode,
      toAddress: publicAddress,
      nativeAmount,
      contractAddress: metaToken?.contractAddress,
      data,
      note
    }
    const { transactionHex } = await this.txBuilder(txOtherParams)

    const tokenOpts =
      metaToken?.contractAddress != null && data != null
        ? { contractAddress: metaToken?.contractAddress, data }
        : undefined

    const totalFeeSUN = await this.calcTxFee({
      receiverAddress: publicAddress,
      unsignedTxHex: transactionHex,
      tokenOpts,
      note
    })

    let edgeNativeAmount: string
    let networkFee: string
    let parentNetworkFee: string | undefined
    let transactionCostSUN: string

    if (isTokenTransfer) {
      edgeNativeAmount = nativeAmount
      networkFee = '0'
      parentNetworkFee = totalFeeSUN
      transactionCostSUN = parentNetworkFee
    } else {
      edgeNativeAmount = add(nativeAmount, totalFeeSUN)
      networkFee = totalFeeSUN
      transactionCostSUN = edgeNativeAmount
    }

    const balanceSUN =
      this.walletLocalData.totalBalances[this.currencyInfo.currencyCode]
    if (gt(transactionCostSUN, balanceSUN)) {
      throw new InsufficientFundsError({
        currencyCode: this.currencyInfo.currencyCode,
        networkFee: totalFeeSUN
      })
    }

    // **********************************
    // Create the unsigned EdgeTransaction
    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount: mul(edgeNativeAmount, '-1'), // nativeAmount
      networkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams: txOtherParams, // otherParams
      walletId: this.walletId
    }

    if (parentNetworkFee != null) {
      edgeTransaction.parentNetworkFee = parentNetworkFee
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams: TronTxParams = getOtherParams(edgeTransaction)

    const transaction = await this.txBuilder(otherParams)
    const { tronKey } = asTronKeys(this.walletInfo.keys)
    const signer = this.tronscan.getSigner(tronKey)
    const { hex } = await signer.signTransaction(transaction.transaction)

    edgeTransaction.signedTx = hex
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const body = {
      transaction: edgeTransaction.signedTx
    }

    const res = await this.multicastServers(
      'trx_broadcastTx',
      '/wallet/broadcasthex',
      body
    )

    const json = asBroadcastResponse(res)
    if (!json.result) {
      throw new Error(json.message)
    }

    // Update local caches
    const { toAddress, contractAddress } =
      getOtherParams<TronTxParams>(edgeTransaction)
    if (
      edgeTransaction.currencyCode === this.currencyInfo.currencyCode &&
      edgeTransaction.otherParams?.toAddress != null
    ) {
      this.accountExistsCache[toAddress] = true
    }
    if (contractAddress != null) {
      // The cost to send a token is greater when the recipient receives a token for the first time. That's why we
      // need to query the node each time the user starts the transaction process and ensure we look again next time.
      // eslint-disable-next-line
      delete this.energyEstimateCache[`${toAddress}:${contractAddress}`]
    }

    edgeTransaction.txid = json.txid
    edgeTransaction.date = Date.now() / 1000
    return edgeTransaction
  }

  getDisplayPrivateSeed(): string {
    return this.walletInfo.keys?.tronMnemonic ?? this.walletInfo.keys?.tronKey
  }

  getDisplayPublicSeed(): string {
    return this.walletInfo.keys?.publicKey ?? ''
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<TronNetworkInfo>,
  tools: TronTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const engine = new TronEngine(
    tools,
    walletInfo,
    opts,
    getFetchCors(env),
    env.networkInfo
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine(tools, walletInfo, opts)

  // This is just to make sure otherData is type checked
  engine.otherData = engine.walletLocalData.otherData as TronOtherdata

  return engine
}
