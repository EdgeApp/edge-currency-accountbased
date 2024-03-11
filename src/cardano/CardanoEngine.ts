import { add, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeTokenId,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getFetchCors } from '../common/utils'
import { CardanoTools } from './CardanoTools'
import {
  asCardanoWalletOtherData,
  asKoiosAddressTransactions,
  asKoiosBalance,
  asKoiosBlockheight,
  asKoiosTransactionsRes,
  asSafeCardanoWalletInfo,
  CardanoNetworkInfo,
  CardanoWalletOtherData,
  KoiosNetworkTx,
  SafeCardanoWalletInfo
} from './cardanoTypes'

const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000

export class CardanoEngine extends CurrencyEngine<
  CardanoTools,
  SafeCardanoWalletInfo
> {
  fetchCors: EdgeFetchFunction
  networkInfo: CardanoNetworkInfo
  otherData!: CardanoWalletOtherData

  constructor(
    env: PluginEnvironment<CardanoNetworkInfo>,
    tools: CardanoTools,
    walletInfo: SafeCardanoWalletInfo,
    initOptions: any, // CardanoInitOptions,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.fetchCors = getFetchCors(env.io)
    this.networkInfo = env.networkInfo
  }

  setOtherData(_raw: any): void {
    this.otherData = asCardanoWalletOtherData(_raw)
  }

  async fetchGet(method: string): Promise<unknown> {
    const res = await this.fetchCors(
      `${this.networkInfo.rpcServer}/api/v1/${method}`
    )
    if (!res.ok) {
      const message = await res.text()
      throw new Error(`Koios error: ${message}`)
    }
    const json = await res.json()
    return json
  }

  async fetchPost(method: string, body: JsonObject): Promise<unknown> {
    const opts = {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }
    const res = await this.fetchCors(
      `${this.networkInfo.rpcServer}/api/v1/${method}`,
      opts
    )
    if (!res.ok) {
      const message = await res.text()
      throw new Error(`Koios error: ${message}`)
    }
    const json = await res.json()
    return json
  }

  async queryBlockheight(): Promise<void> {
    try {
      const raw = await this.fetchGet('tip')
      const clean = asKoiosBlockheight(raw)[0]
      const { block_no: blockHeight } = clean

      if (blockHeight > this.walletLocalData.blockHeight) {
        this.walletLocalData.blockHeight = blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e) {
      this.log.warn('queryBlockheight error: ', e)
    }
  }

  async queryBalance(): Promise<void> {
    try {
      const raw = await this.fetchPost('address_info', {
        _addresses: [this.walletInfo.keys.bech32Address]
      })
      const clean = asKoiosBalance(raw)
      const mainnetBal = clean[0]?.balance ?? '0'

      this.updateBalance(this.currencyInfo.currencyCode, mainnetBal)
    } catch (e) {
      this.log.warn('queryBalance error: ', e)
    }
  }

  async queryTransactions(): Promise<void> {
    const countPerPage = 1000 // default
    const latestQueryTransactionsBlockHeight =
      this.otherData.latestQueryTransactionsBlockHeight
    const latestQueryTransactionsTxid =
      this.otherData.latestQueryTransactionsTxid
    while (true) {
      const rawTxidList = await this.fetchPost('address_txs', {
        _addresses: [this.walletInfo.keys.bech32Address],
        _after_block_height: latestQueryTransactionsBlockHeight // return value includes block height
      })
      const cleanTxidList = asKoiosAddressTransactions(rawTxidList)

      const newestTxInList = cleanTxidList[0]
      if (
        newestTxInList == null ||
        newestTxInList.tx_hash === latestQueryTransactionsTxid
      ) {
        break
      }

      const txids = cleanTxidList
        .filter(tx => tx.block_height >= latestQueryTransactionsBlockHeight)
        .reverse()
        .map(tx => tx.tx_hash)

      if (txids.length === 0) {
        break
      }
      const rawTxInfos = await this.fetchPost(`tx_info`, {
        _tx_hashes: txids
      })
      const txs = asKoiosTransactionsRes(rawTxInfos)

      for (const tx of txs) {
        const edgeTx = processCardanoTransaction({
          currencyCode: this.currencyInfo.currencyCode,
          publicKey: this.walletInfo.keys.bech32Address,
          tokenId: null,
          tx,
          walletId: this.walletId
        })
        this.addTransaction(this.currencyInfo.currencyCode, edgeTx)
        this.otherData.latestQueryTransactionsBlockHeight = tx.block_height
        this.otherData.latestQueryTransactionsTxid = tx.tx_hash
      }
      if (cleanTxidList.length < countPerPage) break
    }

    this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] = 1
    this.updateOnAddressesChecked()

    if (this.transactionsChangedArray.length > 0) {
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS).catch(() => {})
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

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    throw new Error('unimplemented')
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    throw new Error('unimplemented')
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    throw new Error('unimplemented')
  }

  async getFreshAddress(_options: any): Promise<EdgeFreshAddress> {
    const { bech32Address } = asSafeCardanoWalletInfo(this.walletInfo).keys

    return {
      publicAddress: bech32Address
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<CardanoNetworkInfo>,
  tools: CardanoTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { initOptions } = env

  const safeWalletInfo = asSafeCardanoWalletInfo(walletInfo)
  const engine = new CardanoEngine(
    env,
    tools,
    safeWalletInfo,
    initOptions,
    opts
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}

export const processCardanoTransaction = (opts: {
  currencyCode: string
  publicKey: string
  tokenId: EdgeTokenId
  tx: KoiosNetworkTx
  walletId: string
}): EdgeTransaction => {
  const { currencyCode, publicKey, tokenId, tx, walletId } = opts
  const {
    tx_hash: txid,
    block_height: blockHeight,
    tx_timestamp: date,
    fee,
    inputs,
    outputs
  } = tx

  let netNativeAmount: string = '0'
  const ourReceiveAddressesSet = new Set<string>()
  for (const input of inputs) {
    if (input.payment_addr.bech32 === publicKey) {
      netNativeAmount = sub(netNativeAmount, input.value)
    }
  }
  for (const output of outputs) {
    if (output.payment_addr.bech32 === publicKey) {
      netNativeAmount = add(netNativeAmount, output.value)
      ourReceiveAddressesSet.add(publicKey)
    }
  }
  const isSend = netNativeAmount.startsWith('-')

  const edgeTransaction: EdgeTransaction = {
    blockHeight,
    currencyCode,
    date,
    isSend,
    memos: [],
    nativeAmount: netNativeAmount,
    networkFee: isSend ? fee : '0',
    ourReceiveAddresses: [...ourReceiveAddressesSet.values()], // blank if you sent money otherwise array of addresses that are yours in this transaction
    signedTx: '',
    tokenId,
    txid,
    walletId: walletId
  }

  return edgeTransaction
}
