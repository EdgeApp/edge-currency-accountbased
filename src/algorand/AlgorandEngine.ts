import algosdk, {
  decodeUnsignedTransaction,
  encodeUnsignedTransaction,
  Transaction
} from 'algosdk'
import { abs, add, div, gt, lte, sub } from 'biggystring'
import { asMaybe } from 'cleaners'
import {
  EdgeActivationApproveOptions,
  EdgeActivationQuote,
  EdgeActivationResult,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEngineActivationOptions,
  EdgeEngineGetActivationAssetsOptions,
  EdgeGetActivationAssetsResults,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeToken,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { EdgeTokenId } from '../common/types'
import { utf8 } from '../common/utf8'
import {
  asyncWaterfall,
  cleanTxLogs,
  getOtherParams,
  makeMutex,
  matchJson,
  Mutex
} from '../common/utils'
import { AlgorandTools } from './AlgorandTools'
import {
  AccountInformation,
  AlgorandNetworkInfo,
  AlgorandOtherMethods,
  AlgorandWalletOtherData,
  AlgoWcRpcPayload,
  asAccountInformation,
  asAlgorandPrivateKeys,
  asAlgorandUnsignedTx,
  asAlgorandWalletConnectPayload,
  asAlgorandWalletOtherData,
  asApplTransaction,
  asAxferTransaction,
  asBaseTxOpts,
  asIndexerPayTransactionResponse,
  asMaybeContractAddressLocation,
  asMaybeCustomFee,
  asPayTransaction,
  asSafeAlgorandWalletInfo,
  asSuggestedTransactionParams,
  BaseTransaction,
  BaseTxOpts,
  IndexerPayTransactionResponse,
  SafeAlgorandWalletInfo,
  SuggestedTransactionParams
} from './algorandTypes'

const { Algodv2, Indexer } = algosdk

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class AlgorandEngine extends CurrencyEngine<
  AlgorandTools,
  SafeAlgorandWalletInfo
> {
  otherData!: AlgorandWalletOtherData
  networkInfo: AlgorandNetworkInfo

  queryTxMutex: Mutex
  suggestedTransactionParams: SuggestedTransactionParams
  minimumAddressBalance: string
  totalReserve: string
  otherMethods: AlgorandOtherMethods

  constructor(
    env: PluginEnvironment<AlgorandNetworkInfo>,
    tools: AlgorandTools,
    walletInfo: SafeAlgorandWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo

    this.queryTxMutex = makeMutex()
    this.suggestedTransactionParams = {
      flatFee: false,
      fee: 0,
      firstRound: 0,
      lastRound: 0,
      genesisID: this.networkInfo.genesisID,
      genesisHash: this.networkInfo.genesisHash
    }
    this.minimumAddressBalance = this.networkInfo.minimumAddressBalance
    this.totalReserve = this.minimumAddressBalance

    this.otherMethods = {
      parseWalletConnectV2Payload: async (payload: AlgoWcRpcPayload) => {
        try {
          const cleanPayload = asAlgorandWalletConnectPayload(payload)
          const params = cleanPayload.params[0][0]
          const algoTx = decodeUnsignedTransaction(base64.parse(params.txn))

          const nativeAmount =
            algoTx.amount != null ? algoTx.amount.toString() : '0'
          const networkFee = algoTx.fee.toFixed()
          let tokenId: EdgeTokenId = null

          if (algoTx.type === 'axfer') {
            const assetIndex = algoTx.assetIndex.toString()
            const token: EdgeToken | undefined = this.allTokensMap[assetIndex]
            if (token == null) throw new Error('Unrecognized token')
            tokenId = assetIndex
          }

          return {
            nativeAmount,
            networkFee,
            tokenId // optional
          }
        } catch (e: any) {
          this.warn(`Wallet connect call_request `, e)
          throw e
        }
      }
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asAlgorandWalletOtherData(raw)
  }

  async fetchAccountInfo(account: string): Promise<AccountInformation> {
    return await asyncWaterfall(
      this.networkInfo.algodServers.map(server => async () => {
        const client = new Algodv2('', server, '')
        const response = await client.accountInformation(account).do()
        const out = asAccountInformation(response)
        return out
      })
    )
  }

  getRecipientBalance = async (account: string): Promise<string> => {
    try {
      const accountInfo = await this.fetchAccountInfo(account)
      return accountInfo.amount.toString()
    } catch (e: any) {
      return this.minimumAddressBalance
    }
  }

  async queryBalance(): Promise<void> {
    try {
      const accountInfo: AccountInformation = await this.fetchAccountInfo(
        this.walletLocalData.publicKey
      )
      const { assets, amount, 'min-balance': minBalance, round } = accountInfo

      this.updateBalance(this.currencyInfo.currencyCode, amount.toString())

      this.totalReserve = minBalance.toString()

      const detectedTokenIds: string[] = []
      const newUnactivatedTokenIds: string[] = []
      for (const [tokenId, edgeToken] of Object.entries(this.allTokensMap)) {
        const asset = assets.find(
          asset => asset['asset-id'].toFixed() === tokenId
        )

        if (asset != null) {
          const balance = asset.amount.toString()
          this.updateBalance(edgeToken.currencyCode, balance)

          if (gt(balance, '0') && !this.enabledTokenIds.includes(tokenId)) {
            detectedTokenIds.push(tokenId)
          }
        } else {
          // Enabled tokens that don't have a balance are unactivated
          this.updateBalance(edgeToken.currencyCode, '0')
          if (this.enabledTokenIds.includes(tokenId)) {
            newUnactivatedTokenIds.push(tokenId)
          }
        }
      }

      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }

      if (round > this.walletLocalData.blockHeight) {
        this.walletLocalData.blockHeight = round
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }

      if (
        !matchJson(
          newUnactivatedTokenIds,
          this.walletLocalData.unactivatedTokenIds
        )
      ) {
        this.walletLocalData.unactivatedTokenIds = newUnactivatedTokenIds
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onUnactivatedTokenIdsChanged(
          this.walletLocalData.unactivatedTokenIds
        )
      }
    } catch (e: any) {
      this.log.warn(`queryBalance Error `, e)
    }
  }

  async queryTransactionParams(): Promise<void> {
    try {
      const params: SuggestedTransactionParams = await asyncWaterfall(
        this.networkInfo.algodServers.map(server => async () => {
          const client = new Algodv2('', server, '')
          const response = await client.getTransactionParams().do()
          const out = asSuggestedTransactionParams(response)

          if (out.genesisHash !== this.networkInfo.genesisHash) {
            throw new Error('Server genesisHash mismatch')
          }

          return out
        })
      )

      this.suggestedTransactionParams = params
    } catch (e: any) {
      this.log.warn('queryTransactionParams error:', e)
    }
  }

  processAlgorandTransaction(tx: BaseTransaction): void {
    const {
      'confirmed-round': confirmedRound,
      'round-time': roundTime,
      'tx-type': txType,
      fee,
      id,
      note,
      sender
    } = tx

    let currencyCode: string
    let tokenId: EdgeTokenId
    let nativeAmount: string
    let networkFee: string
    let parentNetworkFee: string | undefined
    let isSend = false
    const ourReceiveAddresses = []

    switch (txType) {
      case 'pay': {
        const { amount, receiver } = asPayTransaction(tx)['payment-transaction']

        nativeAmount = amount.toString()
        networkFee = fee.toString()

        if (sender === this.walletInfo.keys.publicKey) {
          nativeAmount = `-${add(nativeAmount, networkFee)}`
          isSend = true
        } else if (receiver === this.walletInfo.keys.publicKey) {
          networkFee = '0'
          ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
        } else {
          return
        }

        currencyCode = this.currencyInfo.currencyCode
        tokenId = null
        break
      }
      case 'axfer': {
        const {
          amount,
          'asset-id': assetId,
          receiver
        } = asAxferTransaction(tx)['asset-transfer-transaction']

        nativeAmount = amount.toString()
        networkFee = '0'

        if (sender === this.walletInfo.keys.publicKey) {
          nativeAmount = `-${nativeAmount}`
          parentNetworkFee = fee.toString()
          isSend = true
        } else if (receiver === this.walletInfo.keys.publicKey) {
          ourReceiveAddresses.push(this.walletInfo.keys.publicKey)
        } else {
          return
        }

        const edgeToken: EdgeToken | undefined = this.allTokensMap[assetId]
        if (edgeToken == null) return
        currencyCode = edgeToken.currencyCode
        tokenId = assetId.toString()

        break
      }
      case 'appl': {
        const { 'inner-txns': innerTxs = [] } = asApplTransaction(tx)
        innerTxs.forEach(innerTx =>
          this.processAlgorandTransaction({
            ...innerTx,
            id
          })
        )

        nativeAmount = '0'
        networkFee = fee.toString()

        if (sender === this.walletInfo.keys.publicKey) {
          nativeAmount = `-${add(nativeAmount, networkFee)}`
          isSend = true
        } else {
          return
        }

        currencyCode = this.currencyInfo.currencyCode
        tokenId = null
        break
      }
      default: {
        // Unrecognized tx type
        return
      }
    }

    const memos: EdgeMemo[] = []
    if (note != null) {
      const data = base64.parse(note)
      try {
        memos.push({
          memoName: 'note',
          type: 'text',
          value: utf8.stringify(data)
        })
      } catch (e) {
        memos.push({
          memoName: 'note',
          type: 'hex',
          value: base16.stringify(data).toLowerCase()
        })
      }
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: confirmedRound,
      currencyCode,
      date: roundTime,
      isSend,
      memos,
      nativeAmount,
      networkFee,
      ourReceiveAddresses,
      parentNetworkFee,
      signedTx: '',
      tokenId,
      txid: id,
      walletId: this.walletId
    }

    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  async queryTransactions(): Promise<void> {
    return await this.queryTxMutex(
      async () => await this.queryTransactionsInner()
    )
  }

  async queryTransactionsInner(): Promise<void> {
    const minRound = this.otherData.latestRound // init query

    let latestTxid: string | undefined // To store newest found txid
    let latestRound = this.otherData.latestRound // To store next loop query ending round

    let progressRound = 0 // for tracking progress
    let nextQueryToken: string | undefined // to continue where previous query left off. The first server to respond will be the only one that can serve requests with this token.
    let continueQuery = true
    do {
      const indexerTransactions: IndexerPayTransactionResponse =
        await asyncWaterfall(
          this.networkInfo.indexerServers.map(server => async () => {
            const client = new Indexer({}, server, '')
            const response = await client
              .lookupAccountTransactions(this.walletLocalData.publicKey)
              .minRound(minRound)
              .nextToken(nextQueryToken ?? '')
              // .limit(1000) // default response limit is 1000
              .do()
            const out = asIndexerPayTransactionResponse(response)
            return out
          })
        )
      const { 'next-token': nextToken, transactions } = indexerTransactions

      if (transactions.length === 0) break

      for (const tx of transactions) {
        if (latestTxid == null) {
          // the very first tx is the most recent
          latestTxid = tx.id
          latestRound = tx['confirmed-round']
        }
        progressRound = tx['confirmed-round']
        if (tx.id === this.otherData.latestTxid) {
          continueQuery = false
          break
        }
        try {
          this.processAlgorandTransaction(tx)
        } catch (e: any) {
          this.log.warn('processAlgorandTransaction error:', e)
        }
      }

      latestRound = latestRound ?? this.walletLocalData.blockHeight
      const progress = (latestRound - progressRound) / (latestRound - minRound)
      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        progress
      this.updateOnAddressesChecked()

      nextQueryToken = nextToken
    } while (nextQueryToken != null && continueQuery)

    if (latestTxid != null && this.otherData.latestTxid !== latestTxid) {
      this.otherData.latestTxid = latestTxid
      this.otherData.latestRound = latestRound
      this.walletLocalDataDirty = true
    }

    for (const cc of this.enabledTokens) {
      this.tokenCheckTransactionsStatus[cc] = 1
    }
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
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop('queryTransactionParams', ACCOUNT_POLL_MILLISECONDS).catch(
      () => {}
    )
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

  calcFee(rawTx: Transaction): string {
    const sizeBytes = rawTx.estimateSize()
    const fee = Math.max(
      this.suggestedTransactionParams.fee * sizeBytes,
      this.networkInfo.minimumTxFee
    )
    return fee.toString()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const { tokenId } = spendInfo
    let balance = this.getBalance({
      tokenId
    })
    if (tokenId == null) {
      balance = sub(balance, this.totalReserve)
    }

    const publicAddress = spendInfo.spendTargets[0].publicAddress
    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }

    const { customNetworkFee } = spendInfo
    const customFee = asMaybeCustomFee(customNetworkFee).fee

    let fee: string | undefined = customFee

    if (fee == null) {
      spendInfo.spendTargets[0].nativeAmount = '1'
      const edgeTx = await this.makeSpend(spendInfo)
      fee = edgeTx.networkFee
    }

    const getMax = async (min: string, max: string): Promise<string> => {
      const diff = sub(max, min)
      if (lte(diff, '1')) {
        return min
      }
      const mid = add(min, div(diff, '2'))

      // Try the average:
      spendInfo.spendTargets[0].nativeAmount = mid

      const totalAmount = add(
        mid,
        fee ?? this.networkInfo.minimumTxFee.toString()
      )
      if (gt(totalAmount, balance)) {
        return await getMax(min, mid)
      } else {
        return await getMax(mid, max)
      }
    }

    return await getMax('0', add(balance, '1'))
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode, nativeBalance } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { customNetworkFee, memos = [], tokenId } = edgeSpendInfo

    const spendableAlgoBalance = sub(
      this.getBalance({
        tokenId: null
      }),
      this.totalReserve
    )

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { nativeAmount: amount, publicAddress } =
      edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (amount == null) throw new NoAmountSpecifiedError()

    const { type }: BaseTxOpts = asMaybe(asBaseTxOpts)(
      edgeSpendInfo.otherParams
    ) ?? {
      type: currencyCode === this.currencyInfo.currencyCode ? 'pay' : 'axfer'
    }

    const note =
      memos[0]?.type === 'text' ? utf8.parse(memos[0].value) : undefined

    const customFee = asMaybeCustomFee(customNetworkFee).fee

    let rawTx: Transaction
    let nativeAmount = amount
    let networkFee = '0'
    let parentNetworkFee: string | undefined
    let fee: string
    let recipient: string | undefined
    switch (type) {
      case 'pay': {
        rawTx = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
          to: publicAddress,
          from: this.walletInfo.keys.publicKey,
          amount: BigInt(amount),
          note,
          suggestedParams: { ...this.suggestedTransactionParams }
        })
        fee = customFee ?? this.calcFee(rawTx)

        networkFee = fee
        nativeAmount = `-${add(nativeAmount, networkFee)}`
        recipient = publicAddress

        if (gt(abs(nativeAmount), spendableAlgoBalance)) {
          throw new InsufficientFundsError({ tokenId })
        }

        break
      }
      case 'axfer': {
        const edgeTokenId = Object.keys(this.allTokensMap).find(
          tokenId => this.allTokensMap[tokenId].currencyCode === currencyCode
        )
        if (edgeTokenId == null) throw new Error('Unrecognized asset')
        const networkLocation = asMaybeContractAddressLocation(
          this.allTokensMap?.[edgeTokenId]?.networkLocation
        )

        if (networkLocation == null) throw new Error('Unrecognized asset')

        rawTx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
          assetIndex: parseInt(networkLocation.contractAddress),
          to: publicAddress,
          from: this.walletInfo.keys.publicKey,
          amount: BigInt(amount),
          note,
          suggestedParams: { ...this.suggestedTransactionParams }
        })
        fee = customFee ?? this.calcFee(rawTx)

        nativeAmount = `-${nativeAmount}`
        parentNetworkFee = fee

        if (gt(parentNetworkFee, spendableAlgoBalance)) {
          throw new InsufficientFundsError({
            networkFee: fee,
            tokenId: null
          })
        }

        if (gt(abs(nativeAmount), nativeBalance)) {
          throw new InsufficientFundsError({ tokenId })
        }

        break
      }
      default:
        throw new Error('Unrecognized transaction type')
    }

    rawTx.flatFee = true
    rawTx.fee = parseInt(fee)

    const otherParams = {
      encodedTx: base16.stringify(encodeUnsignedTransaction(rawTx)),
      recipient
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount,
      networkFee,
      otherParams,
      ourReceiveAddresses: [],
      parentNetworkFee,
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signMessage(message: string, privateKeys: JsonObject): Promise<string> {
    const algorandPrivateKeys = asAlgorandPrivateKeys(
      this.currencyInfo.pluginId
    )(privateKeys)

    const rawTx = decodeUnsignedTransaction(base64.parse(message))
    const secretKey = algosdk.mnemonicToSecretKey(algorandPrivateKeys.mnemonic)
    const signedTxBytes = rawTx.signTxn(secretKey.sk)
    const signedTx = base64.stringify(signedTxBytes)

    return signedTx
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const { encodedTx, recipient } = asAlgorandUnsignedTx(
      getOtherParams(edgeTransaction)
    )

    const rawTx = decodeUnsignedTransaction(
      Uint8Array.from(base16.parse(encodedTx))
    )

    if (recipient != null) {
      await this.checkRecipientMinimumBalance(
        this.getRecipientBalance,
        rawTx.amount.toString(),
        recipient
      )
    }

    const keys = asAlgorandPrivateKeys(this.currencyInfo.pluginId)(privateKeys)
    const secretKey = algosdk.mnemonicToSecretKey(keys.mnemonic)
    const signedTxBytes = rawTx.signTxn(secretKey.sk)
    const signedTx = base16.stringify(signedTxBytes)

    edgeTransaction.signedTx = signedTx
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const signedTxBytes = Uint8Array.from(
      base16.parse(edgeTransaction.signedTx)
    )

    try {
      const { txId } = await asyncWaterfall(
        this.networkInfo.algodServers.map(server => async () => {
          const client = new Algodv2('', server, '')
          return await client.sendRawTransaction(signedTxBytes).do()
        })
      )
      edgeTransaction.txid = txId
      edgeTransaction.date = Date.now() / 1000
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }

    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  engineGetActivationAssets = async (
    options: EdgeEngineGetActivationAssetsOptions
  ): Promise<EdgeGetActivationAssetsResults> => {
    return {
      assetOptions: [
        {
          tokenId: null,
          paymentWalletId: this.walletId,
          currencyPluginId: this.currencyInfo.pluginId
        }
      ]
    }
  }

  engineActivateWallet = async ({
    activateTokenIds,
    paymentInfo
  }: EdgeEngineActivationOptions): Promise<EdgeActivationQuote> => {
    if (activateTokenIds == null)
      throw new Error(
        `Must specify activateTokenIds for ${this.currencyInfo.currencyCode}`
      )
    const { tokenId, wallet } = paymentInfo ?? { tokenId: null }
    if (tokenId != null)
      throw new Error(`Must activate with ${this.currencyInfo.currencyCode}`)
    if (wallet?.id !== this.walletId)
      throw new Error('Must pay with same wallet you are activating token with')

    const minTxFee = this.networkInfo.minimumTxFee.toFixed()
    let totalNetworkFee = '0'
    const approvalSpendInfos: EdgeSpendInfo[] = []

    for (const activateTokenId of activateTokenIds) {
      if (
        activateTokenId !== null &&
        this.allTokensMap[activateTokenId] == null
      )
        throw new Error(`Invalid tokenId to activate ${activateTokenId}`)

      const spendInfo: EdgeSpendInfo = {
        tokenId: activateTokenId,
        skipChecks: true,
        spendTargets: [
          { publicAddress: this.walletInfo.keys.publicKey, nativeAmount: '0' }
        ] // Activation ("opt-in") transactions are just asset transfers with a zero amount
      }
      try {
        const approvalTx = await this.makeSpend(spendInfo)
        totalNetworkFee = add(
          totalNetworkFee,
          approvalTx.parentNetworkFee ?? minTxFee
        )
      } catch (e) {
        // use default
        totalNetworkFee = add(totalNetworkFee, minTxFee)
      }

      approvalSpendInfos.push(spendInfo)
    }

    const out = {
      paymentTokenId: tokenId,
      paymentWalletId: this.walletId,
      fromNativeAmount: '0',
      networkFee: {
        tokenId: null,
        nativeAmount: totalNetworkFee,
        currencyPluginId: this.currencyInfo.pluginId
      },
      approve: async (
        options: EdgeActivationApproveOptions = {}
      ): Promise<EdgeActivationResult> => {
        const { metadata } = options
        const broadcastTransactions: EdgeTransaction[] = []
        for (const spendInfo of approvalSpendInfos) {
          const edgeTx = await this.makeSpend(spendInfo)
          edgeTx.metadata = { ...metadata }
          let signedTx = await wallet.signTx(edgeTx)
          signedTx = await wallet.broadcastTx(signedTx)
          broadcastTransactions.push(signedTx)
          await wallet.saveTx(signedTx)
        }

        return { transactions: broadcastTransactions }
      },
      close: async (): Promise<void> => {}
    }
    return out
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<AlgorandNetworkInfo>,
  tools: AlgorandTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeAlgorandWalletInfo(walletInfo)
  const engine = new AlgorandEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
