import { localForger } from '@taquito/local-forging'
import { BalanceResponse, BlockHeaderResponse, RpcClient } from '@taquito/rpc'
import { InMemorySigner } from '@taquito/signer'
import { Signer, TezosToolkit } from '@taquito/taquito'
import { add, eq, gt } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import {
  asyncStaggeredRace,
  asyncWaterfall,
  promiseAny
} from '../common/promiseUtils'
import {
  cleanTxLogs,
  getFetchCors,
  makeMutex,
  shuffleArray
} from '../common/utils'
import { EdgeFetchHttpBackend } from './tezosHttp'
import { TezosTools } from './TezosTools'
import {
  asSafeTezosWalletInfo,
  asTezosPrivateKeys,
  asTezosTxOtherParams,
  asTezosWalletOtherData,
  asXtzGetTransaction,
  SafeTezosWalletInfo,
  TezosNetworkInfo,
  TezosOperation,
  TezosWalletOtherData,
  XtzGetTransaction
} from './tezosTypes'

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

const makeSpendMutex = makeMutex()

type TezosFunction = 'getNumberOfOperations' | 'getTransactions'

export class TezosEngine extends CurrencyEngine<
  TezosTools,
  SafeTezosWalletInfo
> {
  networkInfo: TezosNetworkInfo
  fetchCors: EdgeFetchFunction
  otherData!: TezosWalletOtherData
  walletInfo: SafeTezosWalletInfo

  constructor(
    env: PluginEnvironment<TezosNetworkInfo>,
    tools: TezosTools,
    walletInfo: SafeTezosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.walletInfo = asSafeTezosWalletInfo(walletInfo)
    this.networkInfo = env.networkInfo
    this.fetchCors = getFetchCors(env.io)
  }

  getRpcToolkits(): TezosToolkit[] {
    return shuffleArray(this.networkInfo.tezosRpcNodes).map(node => {
      const rpcClient = new RpcClient(
        node,
        'main',
        new EdgeFetchHttpBackend(this.tools.io.fetch)
      )
      const toolkit = new TezosToolkit(rpcClient)

      const fakeSigner: Signer = {
        sign: async () => {
          throw new Error('sign method is not implemented')
        },
        publicKey: async (): Promise<string> => {
          return this.walletInfo.keys.publicKeyEd
        },
        publicKeyHash: async (): Promise<string> => {
          return this.walletInfo.keys.publicKey
        },
        secretKey: async (): Promise<string | undefined> => {
          throw new Error('secretKey method is not implemented')
        }
      }
      toolkit.setSignerProvider(fakeSigner)

      return toolkit
    })
  }

  setOtherData(raw: any): void {
    this.otherData = asTezosWalletOtherData(raw)
  }

  async multicastServers(func: TezosFunction, ...params: any): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs
    switch (func) {
      // Functions that should waterfall from top to low priority servers
      case 'getNumberOfOperations':
        funcs = this.tools.tezosApiServers.map(server => async () => {
          const result = await this.fetchCors(
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            `${server}/v1/accounts/${params[0]}`
          )
            .then(async function (response) {
              return await response.json()
            })
            .then(function (json) {
              return json.numTransactions
            })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break

      case 'getTransactions':
        funcs = this.tools.tezosApiServers.map(server => async () => {
          const pagination = server.includes('tzkt')
            ? ''
            : `&p='${params[1]}&number=50`
          const result: XtzGetTransaction = await this.fetchCors(
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            `${server}/v1/accounts/${params[0]}/operations?type=transaction` +
              pagination
          ).then(async function (response) {
            return await response.json()
          })
          return { server, result }
        })
        out = await asyncWaterfall(funcs)
        break
    }
    this.log(
      `XTZ multicastServers ${func} ${out.server} won with result ${out.result}`
    )
    return out.result
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  processTezosTransaction(tx: XtzGetTransaction) {
    const transaction = asXtzGetTransaction(tx)
    const pkh = this.walletLocalData.publicKey
    const ourReceiveAddresses: string[] = []
    const currencyCode = this.currencyInfo.currencyCode
    const date = new Date(transaction.timestamp).getTime() / 1000
    const blockHeight = transaction.level
    let nativeAmount = transaction.amount.toString()
    const networkFee = (
      transaction.bakerFee + transaction.allocationFee
    ).toString()
    const failedOperation = transaction.status === 'failed'
    if (pkh === transaction.target.address) {
      ourReceiveAddresses.push(pkh)
      if (transaction.sender.address === pkh) {
        nativeAmount = '-' + networkFee
      }
    } else {
      nativeAmount = '-' + add(nativeAmount, networkFee)
    }
    const edgeTransaction: EdgeTransaction = {
      blockHeight,
      currencyCode,
      date,
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount,
      networkFee,
      networkFees: [],
      otherParams: {},
      ourReceiveAddresses,
      signedTx: '',
      tokenId: null,
      txid: tx.hash,
      walletId: this.walletId
    }
    if (!failedOperation) {
      this.addTransaction(currencyCode, edgeTransaction)
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkTransactionsInnerLoop() {
    const pkh = this.walletLocalData.publicKey
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.otherData.numberTransactions) {
      this.otherData.numberTransactions = 0
    }
    const num = await this.multicastServers('getNumberOfOperations', pkh)
    if (num !== this.otherData.numberTransactions) {
      let txs: XtzGetTransaction[] = []
      let page = 0
      let transactions
      this.tokenCheckTransactionsStatus.XTZ = 0.5
      do {
        transactions = await this.multicastServers(
          'getTransactions',
          pkh,
          page++
        )
        txs = txs.concat(transactions)
      } while (transactions.length > 0 && page < 10)
      for (const tx of txs) {
        this.processTezosTransaction(tx)
      }
      this.sendTransactionEvents()
      this.otherData.numberTransactions = num
      this.walletLocalDataDirty = true
    }
    this.tokenCheckTransactionsStatus.XTZ = 1
    this.updateOnAddressesChecked()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkUnconfirmedTransactionsFetch() {}

  // Check all account balance and other relevant info
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkAccountInnerLoop() {
    const currencyCode = this.currencyInfo.currencyCode
    if (
      typeof this.walletLocalData.totalBalances[currencyCode] === 'undefined'
    ) {
      this.walletLocalData.totalBalances[currencyCode] = '0'
    }
    const funcs = this.getRpcToolkits().map(toolkit => async () => {
      return await toolkit.rpc.getBalance(this.walletLocalData.publicKey)
    })
    const balance: BalanceResponse = await asyncWaterfall(funcs)
    this.updateBalance(currencyCode, balance.toString())
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkBlockchainInnerLoop() {
    const funcs = this.getRpcToolkits().map(toolkit => async () => {
      return await toolkit.rpc.getBlockHeader()
    })
    const head: BlockHeaderResponse = await asyncWaterfall(funcs)
    const blockHeight = head.level
    if (this.walletLocalData.blockHeight !== blockHeight) {
      this.walletLocalData.blockHeight = blockHeight
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onBlockHeightChanged(
        this.walletLocalData.blockHeight
      )
    }
  }

  async clearBlockchainCache(): Promise<void> {
    await super.clearBlockchainCache()
  }

  async isBurn(op: TezosOperation): Promise<boolean> {
    if (op.kind === 'origination') {
      return true
    }
    if (op.kind === 'transaction' && op.destination.slice(0, 2) === 'tz') {
      const funcs = this.getRpcToolkits().map(toolkit => async () => {
        return await toolkit.rpc.getBalance(op.destination)
      })
      const balance: BalanceResponse = await asyncWaterfall(funcs)
      if (balance.toString() === '0') {
        return true
      }
    }
    return false
  }
  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async startEngine() {
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    return await makeSpendMutex(
      async () => await this.makeSpendInner(edgeSpendInfoIn)
    )
  }

  async makeSpendInner(
    edgeSpendInfoIn: EdgeSpendInfo
  ): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode, nativeBalance } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { publicAddress } = edgeSpendInfo.spendTargets[0]
    let { nativeAmount } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }

    const transferAmount = parseInt(nativeAmount)

    const toolkits = this.getRpcToolkits()

    const prepareFuncs = toolkits.map(toolkit => async () => {
      return await toolkit.prepare.transaction({
        to: publicAddress,
        source: this.walletInfo.keys.publicKey,
        amount: transferAmount,
        fee: parseInt(this.networkInfo.fee.transaction),
        gasLimit: parseInt(this.networkInfo.limit.gas),
        storageLimit: parseInt(this.networkInfo.limit.storage),
        mutez: true
      })
    })
    const preparedTx = await asyncStaggeredRace(prepareFuncs, 1000)

    // Calculate total fee from prepared operation
    let networkFee = '0'
    for (const content of preparedTx.opOb.contents) {
      if ('fee' in content && content.fee != null) {
        networkFee = add(networkFee, content.fee.toString())
      }
      // Add burn fee if this is an origination
      if (content.kind === 'origination') {
        networkFee = add(networkFee, this.networkInfo.fee.burn)
      }
    }

    const totalAmount = add(nativeAmount, networkFee)
    if (gt(totalAmount, nativeBalance)) {
      throw new InsufficientFundsError({ tokenId })
    }

    const forgedParams = toolkits[0].prepare.toForge(preparedTx)
    const unsignedTx = await localForger.forge(forgedParams)

    nativeAmount = '-' + totalAmount

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: nativeAmount.startsWith('-'),
      memos,
      nativeAmount,
      networkFee,
      networkFees: [],
      otherParams: { unsignedTx },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }
    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const tezosPrivateKeys = asTezosPrivateKeys(privateKeys)
    const otherParams = asTezosTxOtherParams(edgeTransaction.otherParams)

    const signer = InMemorySigner.fromFundraiser(
      '',
      '',
      tezosPrivateKeys.mnemonic
    )
    const signResult = await signer.sign(
      otherParams.unsignedTx,
      new Uint8Array([3])
    )

    edgeTransaction.signedTx = signResult.sbytes
    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const funcs = this.getRpcToolkits().map(async toolkit => {
      return await toolkit.rpc.injectOperation(edgeTransaction.signedTx)
    })

    const result = await promiseAny<string>(funcs)
    edgeTransaction.txid = result
    edgeTransaction.date = Date.now() / 1000
    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<TezosNetworkInfo>,
  tools: TezosTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeTezosWalletInfo(walletInfo)
  const engine = new TezosEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
