import { BncClient } from '@binance-chain/javascript-sdk'
import { add, gt, mul, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine'
import { PluginEnvironment } from '../common/innerPlugin'
import { asErrorMessage } from '../common/types'
import {
  asyncWaterfall,
  cleanTxLogs,
  getDenomInfo,
  getOtherParams,
  promiseAny,
  shuffleArray
} from '../common/utils'
import { BinanceTools } from './bnbPlugin'
import {
  asBinanceApiAccountBalance,
  asBinanceApiGetTransactions,
  asBinanceApiNodeInfo,
  asBnbPrivateKey,
  asBroadcastTxResponse,
  asSafeBnbWalletInfo,
  BinanceApiTransaction,
  BinanceNetworkInfo,
  BinanceTxOtherParams,
  SafeBnbWalletInfo
} from './bnbTypes'

const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000
const ADDRESS_QUERY_LOOKBACK_TIME = 1000 * 60 * 60 * 24 // ~ one day
const TIMESTAMP_BEFORE_BNB_LAUNCH = 1555500000000 // 2019-04-17, BNB launched on 2019-04-18
const TRANSACTION_QUERY_TIME_WINDOW = 1000 * 60 * 60 * 24 * 5 // 5 days
const NETWORK_FEE_NATIVE_AMOUNT = '7500' // fixed amount for BNB

type BnbFunction =
  | 'bnb_broadcastTx'
  | 'bnb_blockNumber'
  | 'bnb_getBalance'
  | 'bnb_getTransactions'

export class BinanceEngine extends CurrencyEngine<
  BinanceTools,
  SafeBnbWalletInfo
> {
  networkInfo: BinanceNetworkInfo

  constructor(
    env: PluginEnvironment<BinanceNetworkInfo>,
    tools: BinanceTools,
    walletInfo: SafeBnbWalletInfo,
    initOptions: any, // BinanceInitOptions,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
  }

  setOtherData(_raw: any): void {
    this.otherData = {}
  }

  async fetchGet(url: string): Promise<Object> {
    const response = await this.io.fetch(url, {
      method: 'GET'
    })
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return await response.json()
  }

  async fetchCorsGet(url: string): Promise<Object> {
    const fetch = this.io.fetchCors ?? this.io.fetch
    const response = await fetch(url, {
      method: 'GET'
    })
    if (!response.ok) {
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    return await response.json()
  }

  async checkBlockchainInnerLoop(): Promise<void> {
    try {
      const response = await this.multicastServers(
        'bnb_blockNumber',
        `/api/v1/node-info`
      )
      const jsonObj = asBinanceApiNodeInfo(response)
      const blockHeight: number = jsonObj.sync_info.latest_block_height
      this.log(`Got block height ${blockHeight}`)
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight // Convert to decimal
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e: any) {
      this.error('Error fetching height: ', e.message)
    }
  }

  async checkAccountInnerLoop(): Promise<void> {
    const address = this.walletLocalData.publicKey

    try {
      const response = await this.multicastServers(
        'bnb_getBalance',
        `/api/v1/account/${address}`
      )
      const jsonObj = asBinanceApiAccountBalance(response)
      if (jsonObj.balances.length === 0) {
        this.updateBalance('BNB', '0')
      }
      for (const tk of this.enabledTokens) {
        for (const balance of jsonObj.balances) {
          if (balance.symbol === tk) {
            const denom = getDenomInfo(this.currencyInfo, tk)
            if (denom == null) {
              this.error(
                `checkAccountInnerLoop Received unsupported currencyCode: ${tk}`
              )
              break
            }
            const nativeAmount = mul(balance.free, denom.multiplier)
            this.updateBalance(tk, nativeAmount)
          }
        }
      }
    } catch (e: any) {
      // fetching of account balances for uninitiated accounts returns 404 (throws error)
      if (
        this.tokenCheckTransactionsStatus.BNB === 1 &&
        this.transactionList.BNB.length === 0
      ) {
        this.updateBalance('BNB', '0')
      }
      this.error(`Error checking BNB address balance`)
    }
  }

  processBinanceApiTransaction(
    tx: BinanceApiTransaction,
    currencyCode: string
  ): void {
    if (currencyCode !== tx.asset) return
    if (tx.type !== 'TRANSFER') return
    let netNativeAmount: string // Amount received into wallet
    const ourReceiveAddresses: string[] = []
    const nativeNetworkFee: string = String(tx.fee)
    const nativeValue = String(tx.amount)
    if (
      tx.fromAddr.toLowerCase() === this.walletLocalData.publicKey.toLowerCase()
    ) {
      // if it's a send to one's self
      if (tx.fromAddr.toLowerCase() === tx.toAddr.toLowerCase()) {
        // Spend to self. netNativeAmount is just the fee
        netNativeAmount = mul(nativeNetworkFee, '-1')
      } else {
        netNativeAmount = sub('0', nativeValue)

        // For spends, include the network fee in the transaction amount
        netNativeAmount = sub(netNativeAmount, nativeNetworkFee)
      }
    } else {
      // Receive transaction
      netNativeAmount = add('0', nativeValue)
      ourReceiveAddresses.push(this.walletLocalData.publicKey.toLowerCase())
    }

    let blockHeight = tx.blockHeight
    if (blockHeight < 0) blockHeight = 0
    const unixTimestamp = new Date(tx.blockTime)
    const edgeTransaction: EdgeTransaction = {
      txid: tx.hash,
      date: unixTimestamp.getTime(),
      currencyCode,
      blockHeight,
      nativeAmount: netNativeAmount,
      networkFee: nativeNetworkFee,
      ourReceiveAddresses, // blank if you sent money otherwise array of addresses that are yours in this transaction
      signedTx: '',
      metadata: {
        notes: tx.memo
      },
      walletId: this.walletId
    }

    this.addTransaction(currencyCode, edgeTransaction)
  }

  async checkTransactionsFetch(
    startTime: number,
    currencyCode: string
  ): Promise<boolean> {
    const address = this.walletLocalData.publicKey
    let start = startTime
    let end = 0
    const now = Date.now()
    try {
      while (end !== now) {
        end = start + TRANSACTION_QUERY_TIME_WINDOW
        if (end > now) end = now
        const baseUrl = `/bc/api/v1/txs?address=${address}`
        const finalUrl = baseUrl + `&startTime=${start}&endTime=${end}`
        const results = await this.multicastServers(
          'bnb_getTransactions',
          finalUrl
        )
        const transactionsResults = asBinanceApiGetTransactions(results)
        for (const transaction of transactionsResults.txs) {
          this.processBinanceApiTransaction(transaction, currencyCode)
        }
        start = end
      }
    } catch (e: any) {
      const err = asErrorMessage(e)
      if (!err.message.includes('404')) {
        this.error(
          `Error checkTransactionsFetch ${currencyCode}: ${this.walletLocalData.publicKey}`,
          e
        )
        return false
      }
    }

    this.tokenCheckTransactionsStatus[currencyCode] = 1
    this.updateOnAddressesChecked()
    return true
  }

  async checkTransactionsInnerLoop(): Promise<void> {
    const blockHeight = Date.now()
    let startTime: number = TIMESTAMP_BEFORE_BNB_LAUNCH
    const promiseArray = []

    if (
      this.walletLocalData.lastAddressQueryHeight > ADDRESS_QUERY_LOOKBACK_TIME
    ) {
      // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_TIME from the last time we queried transactions
      startTime =
        this.walletLocalData.lastAddressQueryHeight -
        ADDRESS_QUERY_LOOKBACK_TIME
    }

    for (const currencyCode of this.enabledTokens) {
      promiseArray.push(this.checkTransactionsFetch(startTime, currencyCode))
    }

    let resultArray: boolean[] = []
    try {
      resultArray = await Promise.all(promiseArray)
    } catch (e: any) {
      this.error('Failed to query transactions ', e)
    }
    let successCount = 0
    for (const r of resultArray) {
      if (r) successCount++
    }
    if (successCount === promiseArray.length) {
      // should be time
      this.walletLocalData.lastAddressQueryHeight = blockHeight
    }
    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async multicastServers(func: BnbFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs
    switch (func) {
      case 'bnb_broadcastTx': {
        const promises = []
        const broadcastServers = this.networkInfo.binanceApiServers
        for (const bnbServer of broadcastServers) {
          const endpoint = `${bnbServer}/api/v1/broadcast?sync=true`
          promises.push(
            this.io.fetch(endpoint, {
              method: 'POST',
              body: params[0],
              headers: {
                'content-type': 'text/plain'
              }
            })
          )
        }
        const response = await promiseAny(promises)
        const result = await response.json()
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
        if (result[0] && result[0].ok && result[0].code === 0) {
          this.log(`multicastServers ${func} ${JSON.stringify(out)} won`)
          return {
            result,
            server: 'irrelevant'
          }
        } else {
          throw new Error(`send fail with error: ${result.message}`)
        }
      }

      case 'bnb_blockNumber':
      case 'bnb_getBalance':
        funcs = this.networkInfo.binanceApiServers.map(
          (server: string) => async () => {
            const path: string = params[0]
            const result = await this.fetchGet(server + path)
            if (typeof result !== 'object') {
              const msg = `Invalid return value ${func} in ${server}`
              this.error(msg)
              throw new Error(msg)
            }
            return { server, result }
          }
        )
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break
      case 'bnb_getTransactions':
        funcs = this.networkInfo.beaconChainApiServers.map(
          (server: string) => async () => {
            const path: string = params[0]
            const result = await this.fetchCorsGet(server + path)
            if (typeof result !== 'object') {
              const msg = `Invalid return value ${func} in ${server}`
              this.error(msg)
              throw new Error(msg)
            }
            return { server, result }
          }
        )
        // Randomize array
        funcs = shuffleArray(funcs)
        out = await asyncWaterfall(funcs)
        break
    }
    this.log(`multicastServers ${func} ${out.server} won`)

    return out.result
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
    this.addToLoop(
      'checkTransactionsInnerLoop',
      TRANSACTION_POLL_MILLISECONDS
    ).catch(() => {})
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)

    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress } = spendTarget
    let { nativeAmount } = spendTarget

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    const data =
      spendTarget.otherParams != null ? spendTarget.otherParams.data : undefined

    const otherParams: BinanceTxOtherParams = {
      from: [this.walletLocalData.publicKey],
      to: [publicAddress],
      errorVal: 0,
      tokenRecipientAddress: null,
      data: data
    }

    if (currencyCode !== this.currencyInfo.currencyCode) {
      throw new Error('Binance Beacon Chain token transfers not supported')
    }

    if (edgeSpendInfo.spendTargets[0].otherParams?.uniqueIdentifier != null) {
      otherParams.memo =
        edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
    }

    const nativeNetworkFee = NETWORK_FEE_NATIVE_AMOUNT
    const ErrorInsufficientFundsMoreBnb = new Error(
      'Insufficient BNB for transaction fee'
    )
    ErrorInsufficientFundsMoreBnb.name = 'ErrorInsufficientFundsMoreBnb'

    const balanceBnb =
      this.walletLocalData.totalBalances[this.currencyInfo.currencyCode] ?? '0'

    let totalTxAmount = '0'
    totalTxAmount = add(nativeAmount, nativeNetworkFee)
    if (gt(totalTxAmount, balanceBnb)) {
      throw new InsufficientFundsError()
    }
    nativeAmount = mul(totalTxAmount, '-1')

    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee, supposedly fixed
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams, // otherParams
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const bnbPrivateKeys = asBnbPrivateKey(privateKeys)
    const otherParams = getOtherParams(edgeTransaction)

    const bnbClient = new BncClient(this.networkInfo.binanceApiServers[0])
    bnbClient.chooseNetwork('mainnet')
    const { binanceKey } = bnbPrivateKeys
    await bnbClient.setPrivateKey(binanceKey)
    await bnbClient.initChain()
    const currencyCode = edgeTransaction.currencyCode
    const spendAmount = add(
      edgeTransaction.nativeAmount,
      NETWORK_FEE_NATIVE_AMOUNT
    )
    const amount = spendAmount.replace('-', '')
    const denom = getDenomInfo(this.currencyInfo, currencyCode)
    if (denom == null) {
      this.error(`signTx Received unsupported currencyCode: ${currencyCode}`)
      throw new Error(`Received unsupported currencyCode: ${currencyCode}`)
    }
    const nativeAmount = parseInt(amount) / parseInt(denom.multiplier)

    // identity function, overriding library's version
    // @ts-expect-error
    bnbClient._broadcastDelegate = x => {
      return x
    }
    // WILL NOT ACTUALLY TRANSFER! That will be done in this.broadcastTx
    const signedTx = await bnbClient.transfer(
      otherParams.from[0],
      otherParams.to[0],
      nativeAmount,
      currencyCode,
      otherParams.memo
    )

    // @ts-expect-error
    otherParams.serializedTx = signedTx.serialize()
    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    const bnbSignedTransaction = otherParams.serializedTx
    const reply = await this.multicastServers(
      'bnb_broadcastTx',
      bnbSignedTransaction
    )
    const response = asBroadcastTxResponse(reply)
    if (response.result[0]?.ok) {
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
      edgeTransaction.txid = response.result[0].hash ?? '' // If ok === true, there should always be a `hash`
    }
    return edgeTransaction
  }

  getDisplayPrivateSeed(privateKeys: JsonObject): string {
    const bnbPrivateKey = asBnbPrivateKey(privateKeys)
    return bnbPrivateKey.binanceMnemonic
  }

  getDisplayPublicSeed(): string {
    const { keys } = this.walletInfo
    return keys.publicKey
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<BinanceNetworkInfo>,
  tools: BinanceTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { initOptions } = env

  const safeWalletInfo = asSafeBnbWalletInfo(walletInfo)
  const engine = new BinanceEngine(
    env,
    tools,
    safeWalletInfo,
    initOptions,
    opts
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine(tools, safeWalletInfo, opts)

  return engine
}
