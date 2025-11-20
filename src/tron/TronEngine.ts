import { add, div, eq, gt, lt, lte, mul, sub } from 'biggystring'
import { asMaybe, Cleaner } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeStakingStatus,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'
import TronWeb from 'tronweb'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { asyncWaterfall } from '../common/promiseUtils'
import {
  getFetchCors,
  getOtherParams,
  hexToDecimal,
  makeMutex,
  shuffleArray
} from '../common/utils'
import { TronTools } from './TronTools'
import {
  asAccountResources,
  asBroadcastResponse,
  asChainParams,
  asEstimateEnergy,
  asFreezeBalanceContract,
  asFreezeV2BalanceContract,
  asSafeTronWalletInfo,
  asTransaction,
  asTRC20Balance,
  asTRC20Transaction,
  asTRC20TransactionInfo,
  asTriggerSmartContract,
  asTronBlockHeight,
  asTronFreezeV2Action,
  asTronPrivateKeys,
  asTronQuery,
  asTronUnfreezeAction,
  asTronUnfreezeV2Action,
  asTronWalletOtherData,
  asTronWithdrawExpireUnfreezeAction,
  asTRXBalance,
  asTRXTransferContract,
  asUnfreezeBalanceContract,
  asUnfreezeV2BalanceContract,
  asWithdrawExpireUnfreezeContract,
  CalcTxFeeOpts,
  ReferenceBlock,
  SafeTronWalletInfo,
  TronAccountResources,
  TronFreezeV2Action,
  TronNetworkFees,
  TronNetworkInfo,
  TronTransaction,
  TronTransferParams,
  TronUnfreezeAction,
  TronUnfreezeV2Action,
  TronWalletOtherData,
  TronWithdrawExpireUnfreezeAction,
  TxBuilderParams,
  TxQueryCache
} from './tronTypes'
import {
  base58ToHexAddress,
  encodeTRC20Transfer,
  hexToBase58Address
} from './tronUtils'

const {
  utils: {
    abi: { decodeParams, encodeParams },
    crypto: { signTransaction },
    transaction: { txJsonToPb, txPbToTxID }
  }
} = TronWeb

const queryTxMutex = makeMutex()

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)
const NETWORKFEES_POLL_MILLISECONDS = getRandomDelayMs(60 * 60 * 1000) // 1 hour
const DEFAULT_ENERGY_NO_BALANCE = 130000

type TronFunction =
  | 'trx_blockNumber'
  | 'trx_broadcastTx'
  | 'trx_chainParams'
  | 'trx_estimateEnergy'
  | 'trx_getAccountResource'
  | 'trx_getBalance'
  | 'trx_getTransactionInfo'
  | 'trx_getTransactions'

export class TronEngine extends CurrencyEngine<TronTools, SafeTronWalletInfo> {
  fetchCors: EdgeFetchFunction
  readonly recentBlock: ReferenceBlock
  accountResources: TronAccountResources
  networkFees: TronNetworkFees
  networkInfo: TronNetworkInfo
  accountExistsCache: { [address: string]: boolean }
  energyEstimateCache: { [addressAndContract: string]: number }
  otherData!: TronWalletOtherData
  stakingStatus: EdgeStakingStatus
  getUnfreezeDelayDays: number

  constructor(
    env: PluginEnvironment<TronNetworkInfo>,
    currencyPlugin: TronTools,
    walletInfo: SafeTronWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, currencyPlugin, walletInfo, opts)
    const { networkInfo } = env
    this.fetchCors = getFetchCors(env.io)
    this.networkInfo = networkInfo
    this.recentBlock = {
      hash: '0',
      number: 0,
      timestamp: 0
    }
    this.accountResources = {
      BANDWIDTH: 0,
      ENERGY: 0
    }
    this.networkFees = {
      // network defaults
      getCreateAccountFee: 100000,
      getTransactionFee: 1000,
      getEnergyFee: 280,
      getMemoFee: 1000000
    }
    this.getUnfreezeDelayDays = 14
    this.accountExistsCache = {} // Minimize calls to check recipient account resources (existence)
    this.energyEstimateCache = {} // Minimize calls to check energy estimate
    this.processTRXTransaction = this.processTRXTransaction.bind(this)
    this.processTRC20Transaction = this.processTRC20Transaction.bind(this)
    this.stakingStatus = {
      stakedAmounts: [
        {
          nativeAmount: '0',
          otherParams: { type: 'BANDWIDTH' }
        },
        {
          nativeAmount: '0',
          otherParams: { type: 'ENERGY' }
        }
      ]
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asTronWalletOtherData(raw)
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

  async checkTokenBalances(): Promise<void> {
    const address = base58ToHexAddress(this.walletLocalData.publicKey)
    const detectedTokenIds: string[] = []
    const tokenIds = Object.keys(this.allTokensMap)
    try {
      const encodedParams = encodeParams(
        ['address[]', 'address[]'],
        [
          [address.slice(2)],
          tokenIds.map(tokenAddress =>
            base58ToHexAddress(tokenAddress).slice(2)
          )
        ]
      )

      const body = {
        owner_address: address,
        contract_address: base58ToHexAddress(
          this.networkInfo.trc20BalCheckerContract
        ),
        function_selector: 'balances(address[],address[])',
        parameter: encodedParams.slice(2)
      }

      const res = await this.multicastServers(
        'trx_getBalance',
        '/wallet/triggerconstantcontract',
        body
      )

      const rawBalances = asTRC20Balance(res).constant_result[0]
      const decoded = decodeParams([], ['uint256[]'], `0x${rawBalances}`)

      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i]
        const balance = hexToDecimal(decoded[0][i]._hex)
        this.updateBalance(tokenId, balance)

        if (gt(balance, '0') && !this.enabledTokenIds.includes(tokenId)) {
          detectedTokenIds.push(tokenId)
        }
      }

      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }
    } catch (e) {
      this.log.error('checkTokenBalances error', e)
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

      if (balances == null) {
        // New accounts return an empty {} response
        this.updateBalance(null, '0')
        return
      }

      this.updateBalance(null, balances.balance.toString())

      const {
        frozen: frozenBalanceForBandwidth,
        account_resource: { frozen_balance_for_energy: frozenBalanceForEnergy }
      } = balances

      const stakedAmounts: EdgeStakingStatus['stakedAmounts'] = []

      // StakeV1
      if (frozenBalanceForBandwidth != null) {
        const nativeAmount =
          frozenBalanceForBandwidth[0].frozen_balance.toString()
        const unlockDate = new Date(frozenBalanceForBandwidth[0].expire_time)
        stakedAmounts.push({
          nativeAmount,
          unlockDate,
          otherParams: { type: 'BANDWIDTH' }
        })
      }

      if (frozenBalanceForEnergy != null) {
        const nativeAmount = frozenBalanceForEnergy.frozen_balance.toString()
        const unlockDate = new Date(frozenBalanceForEnergy.expire_time)
        stakedAmounts.push({
          nativeAmount,
          unlockDate,
          otherParams: { type: 'ENERGY' }
        })
      }

      // StakeV2
      const [stakedBandwidthV2, stakedEnergyV2] = balances.frozenV2
      if (stakedBandwidthV2.amount != null) {
        stakedAmounts.push({
          nativeAmount: stakedBandwidthV2.amount.toFixed(),
          otherParams: { type: 'BANDWIDTH_V2' }
        })
      }
      if (stakedEnergyV2.amount != null) {
        stakedAmounts.push({
          nativeAmount: stakedEnergyV2.amount.toFixed(),
          otherParams: { type: 'ENERGY_V2' }
        })
      }

      // StakeV2 unfrozen locked amounts
      const unfrozenAmounts = balances.unfrozenV2
      for (const unfrozenAmount of unfrozenAmounts) {
        if ('type' in unfrozenAmount && unfrozenAmount.type === 'ENERGY') {
          stakedAmounts.push({
            nativeAmount: unfrozenAmount.unfreeze_amount.toFixed(),
            unlockDate: new Date(unfrozenAmount.unfreeze_expire_time),
            otherParams: { type: 'WITHDRAWEXPIREUNFREEZE_ENERGY_V2' }
          })
        } else {
          stakedAmounts.push({
            nativeAmount: unfrozenAmount.unfreeze_amount.toFixed(),
            unlockDate: new Date(unfrozenAmount.unfreeze_expire_time),
            otherParams: { type: 'WITHDRAWEXPIREUNFREEZE_BANDWIDTH_V2' }
          })
        }
      }

      this.stakingStatus = { stakedAmounts }
      this.currencyEngineCallbacks.onStakingStatusChanged({
        ...this.stakingStatus
      })
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
        BANDWIDTH: resources.freeNetLimit - resources.freeNetUsed,
        ENERGY: resources.EnergyLimit - resources.EnergyUsed
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
      // See if we need to add new data to the existing EdgeTransactions on disk
      if (this.otherData.txListReset) {
        // Clear out otherData.txQueryCache one time so we can re-process the
        // transactions and populate the txInfo
        this.otherData.txQueryCache.mainnet = asTronWalletOtherData(
          {}
        ).txQueryCache.mainnet
        this.otherData.txListReset = false
        this.walletLocalDataDirty = true
      }
      await this.fetchTrxTransactions()
      this.tokenCheckTransactionsStatus.set(null, 1)
      this.updateOnAddressesChecked()

      await this.fetchTrc20Transactions()
      for (const tokenId of this.enabledTokenIds) {
        this.tokenCheckTransactionsStatus.set(tokenId, 1)
      }
      this.updateOnAddressesChecked()

      this.sendTransactionEvents()
    } catch (e: any) {
      this.log.error(`Error checkTransactionsFetch fetchTrxTransactions: `, e)
      throw e
    }
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

    const { data, meta, success } = asTronQuery(asMaybe(cleaner))(res)
    const isComplete = meta?.links?.next == null

    if (!success) {
      throw new Error('Failed to query TRX transactions')
    }

    for (const tx of data) {
      if (tx == null) continue
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
      unfreeze_amount: unfreezeAmount,
      raw_data: { contract: contractArray, data }
    } = tx

    const out = { txid, timestamp }

    // Already saw this one so we can exit early
    if (txid === this.otherData.txQueryCache.mainnet.txid) {
      return out
    }

    if (retArray.length < 1) return out

    const { contractRet: status, fee } = retArray[0]

    const success = status === 'SUCCESS'
    const feeNativeAmount = fee.toString()
    const date = Math.floor(timestamp / 1000)

    const ourReceiveAddresses: string[] = []

    const memos: EdgeMemo[] = []
    if (data != null) {
      memos.push({
        type: 'text',
        value: TronWeb.toUtf8(data),
        memoName: 'note'
      })
    }

    // Find the relevant item in the array
    const { currencyCode } = this.currencyInfo
    for (const contract of contractArray) {
      const trxTransfer = asMaybe(asTRXTransferContract)(contract)
      if (trxTransfer != null) {
        const {
          parameter: {
            value: { amount, owner_address: fromAddress, to_address: toAddress }
          }
        } = trxTransfer

        let feeNativeAmount = fee.toString()

        const from = hexToBase58Address(fromAddress)
        const to = hexToBase58Address(toAddress)

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
          if (!success) {
            // Failed tx. Still need to record fee.
            nativeAmount = '0'
          }
        } else {
          // Receive
          if (!success) {
            // Failed receive. Nothing to record.
            return out
          }
          ourReceiveAddresses.push(this.walletLocalData.publicKey)
          feeNativeAmount = '0'
        }

        const edgeTransaction: EdgeTransaction = {
          blockHeight: blockNumber,
          currencyCode,
          date,
          isSend: nativeAmount.startsWith('-'),
          memos,
          nativeAmount,
          networkFee: feeNativeAmount,
          networkFees: [],
          ourReceiveAddresses,
          signedTx: '',
          tokenId: null,
          txid,
          walletId: this.walletId
        }

        this.addTransaction(null, edgeTransaction)
        return out
      }

      // Other types of transaction may incur a TRX fee the user paid. The code below only decodes 'triggersmartcontract' transactions (TRC20)
      // There are other types (ie. TRC10) that are ignored for now
      const smartContractTransaction = asMaybe(asTriggerSmartContract)(contract)
      if (smartContractTransaction != null) {
        const {
          parameter: {
            value: { owner_address: fromAddress }
          }
        } = smartContractTransaction

        if (
          hexToBase58Address(fromAddress) !== this.walletLocalData.publicKey
        ) {
          break
        }

        const feeNativeAmount = retArray[0].fee.toString()

        // Don't create edgeTransaction for TRX if fee is zero
        if (feeNativeAmount === '0') break

        const edgeTransaction: EdgeTransaction = {
          blockHeight: blockNumber,
          currencyCode,
          date,
          isSend: true,
          memos,
          nativeAmount: mul(feeNativeAmount, '-1'),
          networkFee: feeNativeAmount,
          networkFees: [],
          ourReceiveAddresses,
          signedTx: '',
          tokenId: null,
          txid,
          walletId: this.walletId
        }

        this.addTransaction(null, edgeTransaction)
        return out
      }

      // Parse freeze transactions
      const freezeTransaction = asMaybe(asFreezeBalanceContract)(contract)
      if (freezeTransaction != null) {
        const {
          parameter: {
            value: { owner_address: fromAddress, frozen_balance: frozenAmount }
          }
        } = freezeTransaction

        if (
          hexToBase58Address(fromAddress) !== this.walletLocalData.publicKey
        ) {
          break
        }

        const nativeAmount = add(frozenAmount.toString(), feeNativeAmount)

        const edgeTransaction: EdgeTransaction = {
          assetAction: {
            assetActionType: 'stake'
          },
          blockHeight: blockNumber,
          currencyCode,
          date,
          isSend: true,
          memos,
          nativeAmount: mul(nativeAmount, '-1'),
          networkFee: feeNativeAmount,
          networkFees: [],
          ourReceiveAddresses,
          signedTx: '',
          tokenId: null,
          txid,
          walletId: this.walletId
        }

        this.addTransaction(null, edgeTransaction)
        return out
      }

      // Parse unfreeze transactions
      const unfreezeTransaction = asMaybe(asUnfreezeBalanceContract)(contract)
      if (unfreezeTransaction != null) {
        if (unfreezeAmount == null) return out
        const {
          parameter: {
            value: { owner_address: fromAddress }
          }
        } = unfreezeTransaction

        if (
          hexToBase58Address(fromAddress) !== this.walletLocalData.publicKey
        ) {
          break
        }

        const nativeAmount = sub(unfreezeAmount.toString(), feeNativeAmount)

        const edgeTransaction: EdgeTransaction = {
          assetAction: {
            assetActionType: 'unstake'
          },
          blockHeight: blockNumber,
          currencyCode,
          date,
          isSend: nativeAmount.startsWith('-'),
          memos,
          nativeAmount,
          networkFee: feeNativeAmount,
          networkFees: [],
          ourReceiveAddresses,
          signedTx: '',
          tokenId: null,
          txid,
          walletId: this.walletId
        }

        this.addTransaction(null, edgeTransaction)
        return out
      }

      // Parse freeze V2 transactions
      const freezeV2Transaction = asMaybe(asFreezeV2BalanceContract)(contract)
      if (freezeV2Transaction != null) {
        const {
          parameter: {
            value: { owner_address: fromAddress }
          }
        } = freezeV2Transaction

        if (
          hexToBase58Address(fromAddress) !== this.walletLocalData.publicKey
        ) {
          break
        }

        const edgeTransaction: EdgeTransaction = {
          assetAction: {
            assetActionType: 'stake'
          },
          blockHeight: blockNumber,
          currencyCode,
          date,
          memos,
          isSend: true,
          nativeAmount: mul(feeNativeAmount, '-1'),
          networkFee: feeNativeAmount,
          networkFees: [],
          ourReceiveAddresses,
          signedTx: '',
          tokenId: null,
          txid,
          walletId: this.walletId
        }

        this.addTransaction(null, edgeTransaction)
        return out
      }

      // Parse unfreeze transactions
      const unfreezeV2Transaction = asMaybe(asUnfreezeV2BalanceContract)(
        contract
      )
      if (unfreezeV2Transaction != null) {
        const {
          parameter: {
            value: {
              unfreeze_balance: unfreezeBalance,
              owner_address: fromAddress
            }
          }
        } = unfreezeV2Transaction

        if (
          hexToBase58Address(fromAddress) !== this.walletLocalData.publicKey
        ) {
          break
        }

        const nativeAmount = sub(unfreezeBalance.toString(), feeNativeAmount)

        const edgeTransaction: EdgeTransaction = {
          assetAction: {
            assetActionType: 'unstakeOrder'
          },
          blockHeight: blockNumber,
          currencyCode,
          date,
          isSend: nativeAmount.startsWith('-'),
          memos,
          nativeAmount: `-${feeNativeAmount}`,
          networkFee: feeNativeAmount,
          networkFees: [],
          ourReceiveAddresses,
          signedTx: '',
          tokenId: null,
          txid,
          walletId: this.walletId
        }

        this.addTransaction(null, edgeTransaction)
        return out
      }

      // Parse WithdrawExpireUnfreeze transactions
      const withdrawExpireUnfreezeTransaction = asMaybe(
        asWithdrawExpireUnfreezeContract
      )(contract)
      if (withdrawExpireUnfreezeTransaction != null) {
        const {
          parameter: {
            value: { owner_address: fromAddress }
          }
        } = withdrawExpireUnfreezeTransaction

        if (
          hexToBase58Address(fromAddress) !== this.walletLocalData.publicKey
        ) {
          break
        }

        const edgeTransaction: EdgeTransaction = {
          assetAction: {
            assetActionType: 'unstake'
          },
          txid,
          date,
          currencyCode,
          blockHeight: blockNumber,
          nativeAmount: `-${feeNativeAmount}`,
          isSend: false,
          memos,
          networkFee: feeNativeAmount,
          networkFees: [],
          ourReceiveAddresses,
          tokenId: null,
          signedTx: '',
          walletId: this.walletId
        }

        this.addTransaction(null, edgeTransaction)
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

    const {
      blockNumber: blockHeight,
      energy_penalty_total: energyPenaltyTotal,
      fee
    } = asTRC20TransactionInfo(res)

    const token = this.allTokensMap[contractAddress]
    if (type !== 'Transfer' || token == null) return out

    const ourReceiveAddresses: string[] = []

    let nativeAmount = value
    const parentNetworkFee = (fee + energyPenaltyTotal).toString()

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
      blockHeight,
      currencyCode: token.currencyCode,
      date: Math.floor(timestamp / 1000),
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount,
      networkFee: '0',
      networkFees: [],
      ourReceiveAddresses,
      signedTx: '',
      tokenId: contractAddress,
      txid,
      walletId: this.walletId
    }

    // Record the parentNetworkFee if it's a send and the fee isn't zero
    if (lt(nativeAmount, '0') && !eq(parentNetworkFee, '0')) {
      edgeTransaction.parentNetworkFee = parentNetworkFee
    }

    this.addTransaction(contractAddress, edgeTransaction)
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

      // withdrawExpireUnfreeze time
      const getUnfreezeDelayDays = json.find(
        param => param.key === 'getUnfreezeDelayDays'
      )
      if (getUnfreezeDelayDays?.value != null) {
        this.getUnfreezeDelayDays = getUnfreezeDelayDays.value
      }

      // Clear energy estimate cache periodically to ensure we get fresh estimates
      this.energyEstimateCache = {}
      this.log('Cleared energy estimate cache during network fee update')
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
    let timeout = 2000

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
        timeout = 5000
        break
    }

    // Randomize array
    funcs = shuffleArray(funcs)
    out = await asyncWaterfall(funcs, timeout)
    this.log(`TRX multicastServers ${func} ${out.server} won`)
    return out.result
  }

  /**
   * Determines how much TRX the tx will cost after accounting for bandwidth and energy
   *
   * TRX transfers to new accounts will consume TRX and bandwidth (or equivalent TRX)
   * TRX transfers to existing accounts will bandwidth or TRX
   * TRC20 transfers to new (unknown to contract) will consume energy (consuming TRX to make up any free energy shortfall) and bandwidth (or equivalent TRX)
   * TRC20 transfers to existing (known to contract) accounts will consume same bandwidth but less energy than above
   */
  async calcTxFee(opts: CalcTxFeeOpts): Promise<string> {
    const { note, receiverAddress, tokenOpts, unsignedTxHex } = opts

    const denom = this.getDenomination(null)
    if (denom == null) throw new Error('calcTxFee unknown denom')

    // #region ========== Energy Estimation ==========

    let energyNeeded = 0

    if (tokenOpts != null && receiverAddress != null) {
      const { contractAddress } = tokenOpts

      const cacheKey = `${receiverAddress}:${contractAddress}`

      let adjustedEnergy = DEFAULT_ENERGY_NO_BALANCE
      if (this.energyEstimateCache[cacheKey] == null) {
        const dryRunBody = {
          owner_address: base58ToHexAddress(this.walletLocalData.publicKey),
          contract_address: base58ToHexAddress(contractAddress),
          function_selector: 'transfer(address,uint256)',
          parameter: encodeParams(
            ['address', 'uint256'],
            [base58ToHexAddress(receiverAddress), '1']
          ).slice(2)
        }

        try {
          const res = await this.multicastServers(
            'trx_estimateEnergy',
            '/wallet/triggerconstantcontract',
            dryRunBody
          )
          const json = asEstimateEnergy(res)
          const status = json.transaction.ret[0]?.ret

          // In practice, ret is an empty object if successful. Other methods
          // return SUCCESS in this field so we're looking for either option.
          if (status != null && status !== 'SUCCESS') {
            throw new Error('calcTxFee Failed to estimate fee')
          }

          // Use the API's energy_used value directly - this is the accurate estimate
          adjustedEnergy = json.energy_used

          // Update the cache with the energy value for this recipient
          this.energyEstimateCache[cacheKey] = adjustedEnergy

          this.log(`Energy estimate: ${adjustedEnergy}`)
        } catch (e) {
          this.log.warn('trx_estimateEnergy error. Using a default.', e)
        }
      } else {
        adjustedEnergy = this.energyEstimateCache[cacheKey]
      }

      energyNeeded = Math.max(
        Math.ceil(adjustedEnergy - this.accountResources.ENERGY),
        0
      )
    }

    // #endregion

    // #region ========== Bandwidth ==========

    // Bandwidth is dependent on size of final transaction unless a TRX
    // transaction creates a new account and then it's 100

    let bandwidthNeeded =
      unsignedTxHex.length / 2 + // hex2bytes
      65 + // signature bytes
      64 + // MAX_RESULT_SIZE_IN_TX
      5 // protobuf overhead

    if (unsignedTxHex.length / 2 < 128) {
      // short transactions save a byte in len-prefix
      bandwidthNeeded--
    }

    if (
      receiverAddress != null &&
      this.accountExistsCache[receiverAddress] === undefined
    ) {
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
    if (
      tokenOpts == null &&
      receiverAddress != null &&
      !this.accountExistsCache[receiverAddress]
    ) {
      bandwidthNeeded = 100
    }

    // Bandwidth is paid with bandwidth or TRX (unlike energy)
    if (bandwidthNeeded < this.accountResources.BANDWIDTH) {
      bandwidthNeeded = 0
    }

    // #endregion

    // #region ========== Create new account ==========

    let createNewAccountFee = 0
    if (
      tokenOpts == null &&
      receiverAddress != null &&
      !this.accountExistsCache[receiverAddress]
    ) {
      createNewAccountFee =
        this.networkFees.getCreateAccountFee + parseInt(denom.multiplier)
    }

    // #endregion

    // #region ========== Transaction note ==========

    const transactionNoteFee = note != null ? this.networkFees.getMemoFee : 0

    const totalSUN =
      energyNeeded * this.networkFees.getEnergyFee +
      bandwidthNeeded * this.networkFees.getTransactionFee +
      createNewAccountFee +
      transactionNoteFee

    // #endregion

    this.log('Account energy: ', this.accountResources.ENERGY)
    this.log('Energy needed: ', energyNeeded)
    this.log('Account bandwidth: ', this.accountResources.BANDWIDTH)
    this.log('Bandwidth needed: ', bandwidthNeeded)
    this.log('Create account fee: ', createNewAccountFee)
    this.log('Transaction note fee: ', transactionNoteFee)
    this.log('Total fee in SUN: ', totalSUN)
    this.log('Total fee in TRX: ', div(totalSUN, denom.multiplier))

    return totalSUN.toString()
  }

  // Returns unsigned transaction as object and hex string. Function is actually synchronous because of the overloaded troncan client.
  async txBuilder(params: TxBuilderParams): Promise<TronTransaction> {
    const { contractJson, feeLimit, note } = params

    const refBlockBytes = this.recentBlock.number
      .toString(16)
      .padStart(8, '0')
      .slice(4, 8)
    const refBlockHash = this.recentBlock.hash.slice(16, 32)
    const expiration = this.recentBlock.timestamp + 60 * 5 * 1000 // five minutes
    const data =
      note == null ? undefined : base16.stringify(Buffer.from(note, 'ascii'))

    const transaction = txJsonToPb({
      raw_data: {
        contract: [contractJson],
        ref_block_bytes: refBlockBytes,
        ref_block_hash: refBlockHash,
        expiration,
        timestamp: this.recentBlock.timestamp,
        data,
        fee_limit: feeLimit
      }
    })

    const transactionHex = base16.stringify(
      transaction.getRawData().serializeBinary()
    )

    return { transaction, transactionHex }
  }

  async makeTransferJson(params: TronTransferParams): Promise<TxBuilderParams> {
    const { tokenId, toAddress, nativeAmount, data, note } = params

    let feeLimit: number | undefined
    let contractJson: any

    if (tokenId == null) {
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
      contractJson = {
        parameter: {
          value: {
            owner_address: base58ToHexAddress(this.walletLocalData.publicKey),
            contract_address: base58ToHexAddress(tokenId),
            data,
            call_value: 0
          }
        },
        type: 'TriggerSmartContract'
      }
      feeLimit = this.networkInfo.defaultFeeLimit
    }

    return { contractJson, feeLimit, note }
  }

  async makeUnfreezeTransaction(
    action: TronUnfreezeAction
  ): Promise<EdgeTransaction> {
    const {
      params: { resource }
    } = action

    const stakedAmount = this.stakingStatus.stakedAmounts.find(
      amount => amount.otherParams?.type === resource
    )
    if (stakedAmount == null) throw new Error('Nothing to unfreeze')

    const contractJson = {
      parameter: {
        value: {
          owner_address: base58ToHexAddress(this.walletLocalData.publicKey),
          resource: resource
        }
      },
      type: 'UnfreezeBalanceContract'
    }

    const txOtherParams: TxBuilderParams = { contractJson }
    const { transactionHex } = await this.txBuilder(txOtherParams)
    const networkFee = await this.calcTxFee({ unsignedTxHex: transactionHex })

    const edgeTransaction: EdgeTransaction = {
      assetAction: {
        assetActionType: 'unstake'
      },
      blockHeight: 0,
      currencyCode: this.currencyInfo.currencyCode,
      date: 0,
      isSend: stakedAmount.nativeAmount.startsWith('-'),
      memos: [],
      metadata: {
        notes: resource
      },
      nativeAmount: stakedAmount.nativeAmount,
      networkFee,
      networkFees: [],
      otherParams: txOtherParams,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async makeFreezeV2Transaction(
    action: TronFreezeV2Action
  ): Promise<EdgeTransaction> {
    const {
      params: { nativeAmount, resource }
    } = action

    const contractJson = {
      parameter: {
        value: {
          owner_address: base58ToHexAddress(this.walletLocalData.publicKey),
          frozen_balance: parseInt(nativeAmount),
          resource: resource === 'ENERGY_V2' ? 'ENERGY' : 'BANDWIDTH'
        }
      },
      type: 'FreezeBalanceV2Contract'
    }

    const txOtherParams: TxBuilderParams = { contractJson }
    const { transactionHex } = await this.txBuilder(txOtherParams)
    const networkFee = await this.calcTxFee({ unsignedTxHex: transactionHex })

    const edgeTransaction: EdgeTransaction = {
      assetAction: {
        assetActionType: 'stake'
      },
      blockHeight: 0,
      currencyCode: this.currencyInfo.currencyCode,
      date: 0,
      isSend: true,
      memos: [],
      metadata: {
        notes: resource
      },
      nativeAmount: mul(nativeAmount, '-1'),
      networkFee,
      networkFees: [],
      otherParams: txOtherParams,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '',

      walletId: this.walletId
    }

    return edgeTransaction
  }

  async makeUnfreezeV2Transaction(
    action: TronUnfreezeV2Action
  ): Promise<EdgeTransaction> {
    const {
      params: { nativeAmount, resource }
    } = action

    const stakedAmount = this.stakingStatus.stakedAmounts.find(
      amount => amount.otherParams?.type === resource
    )
    if (stakedAmount == null) throw new Error('Nothing to unfreeze')

    const contractJson = {
      parameter: {
        value: {
          owner_address: base58ToHexAddress(this.walletLocalData.publicKey),
          unfreeze_balance: parseInt(nativeAmount),
          resource: resource === 'ENERGY_V2' ? 'ENERGY' : 'BANDWIDTH'
        }
      },
      type: 'UnfreezeBalanceV2Contract'
    }

    const txOtherParams: TxBuilderParams = { contractJson }
    const { transactionHex } = await this.txBuilder(txOtherParams)
    const networkFee = await this.calcTxFee({ unsignedTxHex: transactionHex })

    const edgeTransaction: EdgeTransaction = {
      assetAction: {
        assetActionType: 'unstakeOrder'
      },
      blockHeight: 0,
      currencyCode: this.currencyInfo.currencyCode,
      date: 0,
      isSend: true,
      memos: [],
      nativeAmount: '0',
      networkFee,
      networkFees: [],
      otherParams: txOtherParams,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async makeWithdrawExpireUnfreezeTransaction(): Promise<EdgeTransaction> {
    const contractJson = {
      parameter: {
        value: {
          owner_address: base58ToHexAddress(this.walletLocalData.publicKey)
        }
      },
      type: 'WithdrawExpireUnfreezeContract'
    }

    const txOtherParams: TxBuilderParams = { contractJson }
    const { transactionHex } = await this.txBuilder(txOtherParams)
    const networkFee = await this.calcTxFee({ unsignedTxHex: transactionHex })

    const claimedAmount = this.stakingStatus.stakedAmounts.reduce(
      (sum, stakedAmount) => {
        const { nativeAmount, otherParams, unlockDate } = stakedAmount
        if (
          unlockDate != null &&
          new Date(unlockDate) > new Date() &&
          otherParams?.type === 'WITHDRAWEXPIREUNFREEZE'
        ) {
          return add(sum, nativeAmount)
        }
        return sum
      },
      '0'
    )

    const unstakeNativeAmount = sub(claimedAmount, networkFee)
    const edgeTransaction: EdgeTransaction = {
      assetAction: {
        assetActionType: 'unstake'
      },
      txid: '',
      date: 0,
      currencyCode: this.currencyInfo.currencyCode,
      blockHeight: 0,
      nativeAmount: unstakeNativeAmount,
      isSend: false,
      memos: [],
      networkFee,
      networkFees: [],
      ourReceiveAddresses: [],
      signedTx: '',
      otherParams: txOtherParams,
      tokenId: null,
      walletId: this.walletId,
      metadata: {
        notes: 'WithdrawExpireUnfreeze'
      }
    }

    return edgeTransaction
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('checkTokenBalances', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('checkUpdateNetworkFees', NETWORKFEES_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async getStakingStatus(): Promise<EdgeStakingStatus> {
    return { ...this.stakingStatus }
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const { memos = [], tokenId } = spendInfo
    const balance = this.getBalance({
      tokenId
    })

    if (spendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { publicAddress } = spendInfo.spendTargets[0]
    const note = memos[0]?.type === 'text' ? memos[0].value : undefined

    if (publicAddress == null) {
      throw new Error('Error: need recipient address and/or currencyCode')
    }

    if (tokenId == null) {
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
          tokenId: null,
          nativeAmount: mid
        }
        const { contractJson } = await this.makeTransferJson(txParams)
        const { transactionHex } = await this.txBuilder({
          contractJson,
          note
        })

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
    // Check for other transaction types first
    if (edgeSpendInfoIn.otherParams != null) {
      let action:
        | TronUnfreezeAction
        | TronFreezeV2Action
        | TronUnfreezeV2Action
        | TronWithdrawExpireUnfreezeAction
        | undefined

      action = asMaybe(asTronUnfreezeAction)(edgeSpendInfoIn.otherParams)
      if (action != null) return await this.makeUnfreezeTransaction(action)

      action = asMaybe(asTronFreezeV2Action)(edgeSpendInfoIn.otherParams)
      if (action != null) return await this.makeFreezeV2Transaction(action)

      action = asMaybe(asTronUnfreezeV2Action)(edgeSpendInfoIn.otherParams)
      if (action != null) return await this.makeUnfreezeV2Transaction(action)

      action = asMaybe(asTronWithdrawExpireUnfreezeAction)(
        edgeSpendInfoIn.otherParams
      )
      if (action != null)
        return await this.makeWithdrawExpireUnfreezeTransaction()
    }

    const { edgeSpendInfo, currencyCode } = super.makeSpendCheck(
      edgeSpendInfoIn
    )
    const { memos = [], tokenId } = edgeSpendInfo

    const isTokenTransfer = currencyCode !== this.currencyInfo.currencyCode

    // Tron can only have one output
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { nativeAmount, publicAddress, otherParams } =
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

    const note = memos[0]?.type === 'text' ? memos[0].value : undefined

    const txTransferParams: TronTransferParams = {
      tokenId,
      toAddress: publicAddress,
      nativeAmount,
      data,
      note
    }
    const { contractJson, feeLimit } = await this.makeTransferJson(
      txTransferParams
    )
    const { transactionHex } = await this.txBuilder({
      contractJson,
      feeLimit,
      note
    })

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

    const balanceSUN = this.getBalance({ tokenId: null })
    if (gt(transactionCostSUN, balanceSUN)) {
      throw new InsufficientFundsError({
        networkFee: totalFeeSUN,
        tokenId: null
      })
    }

    const txOtherParams: TxBuilderParams = { contractJson, feeLimit, note }

    // **********************************
    // Create the unsigned EdgeTransaction
    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0, // blockHeight
      currencyCode, // currencyCode
      date: 0, // date
      isSend: true,
      memos,
      nativeAmount: mul(edgeNativeAmount, '-1'), // nativeAmount
      networkFee, // networkFee
      networkFees: [],
      otherParams: txOtherParams, // otherParams
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      tokenId,
      txid: '', // txid
      walletId: this.walletId
    }

    if (parentNetworkFee != null) {
      edgeTransaction.parentNetworkFee = parentNetworkFee
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const otherParams: TxBuilderParams = getOtherParams(edgeTransaction)

    const transaction = await this.txBuilder(otherParams)
    const { tronKey } = asTronPrivateKeys(privateKeys)
    const txid = txPbToTxID(transaction.transaction)
    transaction.transaction.txID = txid.replace('0x', '')
    const tx = await signTransaction(tronKey, transaction.transaction)
    tx.addSignature(base16.parse(tx.signature[0]))
    const hex = base16.stringify(tx.serializeBinary())

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
      getOtherParams<TxBuilderParams>(edgeTransaction)
    if (edgeTransaction.tokenId == null && toAddress != null) {
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

    // Clear the cache, recent recipients with no storage would cost less now
    this.energyEstimateCache = {}

    return edgeTransaction
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<TronNetworkInfo>,
  tools: TronTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeTronWalletInfo(walletInfo)
  const engine = new TronEngine(env, tools, safeWalletInfo, opts)

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}
