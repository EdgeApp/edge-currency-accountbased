import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import {
  AccountInfo,
  ComputeBudgetProgram,
  ConfirmedSignatureInfo,
  Keypair,
  MessageV0,
  PublicKey,
  RecentPrioritizationFees,
  SystemProgram,
  TokenAmount,
  TokenBalance,
  TransactionInstruction,
  TransactionResponse,
  TransactionSignature,
  VersionedTransaction,
  VersionedTransactionResponse
} from '@solana/web3.js'
import { add, eq, gt, gte, lt, max, mul, sub } from 'biggystring'
import { asMaybe } from 'cleaners'
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
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import {
  asyncWaterfall,
  cleanTxLogs,
  getFetchCors,
  getOtherParams,
  promiseAny
} from '../common/utils'
import { SolanaTools } from './SolanaTools'
import {
  AccountBalance,
  asAccountBalance,
  asBlocktime,
  asSafeSolanaWalletInfo,
  asSolanaCustomFee,
  asSolanaPrivateKeys,
  asSolanaSpendInfoOtherParams,
  asSolanaTxOtherParams,
  asSolanaWalletOtherData,
  asTokenBalance,
  Blocktime,
  ParsedTxAmount,
  RpcRequest,
  SafeSolanaWalletInfo,
  SolanaNetworkInfo,
  SolanaWalletOtherData,
  wasSolanaTxOtherParams
} from './solanaTypes'

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class SolanaEngine extends CurrencyEngine<
  SolanaTools,
  SafeSolanaWalletInfo
> {
  networkInfo: SolanaNetworkInfo
  base58PublicKey: string
  feePerSignature: string
  priorityFee: string
  recentBlockhash: string
  chainCode: string
  otherData!: SolanaWalletOtherData
  fetchCors: EdgeFetchFunction
  progressRatio: number
  addressCache: Map<string, boolean>
  minimumAddressBalance: string

  constructor(
    env: PluginEnvironment<SolanaNetworkInfo>,
    tools: SolanaTools,
    walletInfo: SafeSolanaWalletInfo,
    opts: any // EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    this.chainCode = tools.currencyInfo.currencyCode
    this.fetchCors = getFetchCors(env.io)
    this.feePerSignature = '5000'
    this.priorityFee = '0'
    this.recentBlockhash = '' // must be < ~2min old to send tx
    this.base58PublicKey = walletInfo.keys.publicKey
    this.progressRatio = 0
    this.addressCache = new Map()
    this.minimumAddressBalance = '0'
  }

  setOtherData(raw: any): void {
    this.otherData = asSolanaWalletOtherData(raw)
  }

  async fetchRpcBulk(
    requests: RpcRequest[],
    overrideRpcNodes?: string[]
  ): Promise<any[]> {
    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(
        requests.map((req, i) => ({ jsonrpc: '2.0', id: i + 1, ...req }))
      )
    }

    const rpcNodes = overrideRpcNodes ?? this.networkInfo.rpcNodes
    const funcs = rpcNodes.map(serverUrl => async () => {
      serverUrl = this.tools.rpcWithApiKey(serverUrl)
      const res = await this.fetchCors(serverUrl, options)
      if (!res.ok) {
        throw new Error(
          `fetchRpc ${options.method} failed error: ${res.status}`
        )
      }
      const out = await res.json()

      return out
    })

    return await asyncWaterfall(funcs)
  }

  async queryBalance(): Promise<void> {
    try {
      const requests: RpcRequest[] = [
        {
          method: 'getBalance',
          params: [
            this.base58PublicKey,
            { commitment: this.networkInfo.commitment }
          ]
        }
      ]

      const allTokenIds = [...Object.keys(this.allTokensMap)]
      const pubkey = new PublicKey(this.base58PublicKey)
      const tokenProgramId = new PublicKey(this.networkInfo.tokenPublicKey)
      const associatedTokenProgramId = new PublicKey(
        this.networkInfo.associatedTokenPublicKey
      )
      for (const tokenId of allTokenIds) {
        const associatedTokenPubkey = getAssociatedTokenAddressSync(
          new PublicKey(tokenId),
          pubkey,
          false,
          tokenProgramId,
          associatedTokenProgramId
        )
        requests.push({
          method: 'getTokenAccountBalance',
          params: [
            associatedTokenPubkey.toBase58(),
            {
              commitment: this.networkInfo.commitment,
              encoding: 'jsonParsed'
            }
          ]
        })
      }

      const balances: any = await this.fetchRpcBulk(requests)

      const [mainnetBal, ...tokenBals]: [AccountBalance, TokenAmount[]] =
        balances
      const balance = asAccountBalance(mainnetBal)
      this.updateBalance(this.chainCode, balance.result.value.toString())

      const detectedTokenIds: string[] = []
      for (const [i, tokenId] of allTokenIds.entries()) {
        const tokenBal = asMaybe(asTokenBalance)(tokenBals[i])
        // empty token addresses return an error "Invalid param: could not find account".
        // If there was an actual error with the request it would have thrown already
        const balance = tokenBal?.result?.value?.amount ?? '0'
        this.updateBalance(this.allTokensMap[tokenId].currencyCode, balance)

        if (gt(balance, '0')) {
          detectedTokenIds.push(tokenId)
        }
      }

      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }
    } catch (e: any) {
      // Nodes will return 0 for uninitiated accounts so thrown errors should be logged
      this.error(`Error checking ${this.chainCode} address balance`, e)
    }
  }

  async queryBlockheight(): Promise<void> {
    try {
      const funcs = this.tools.connections.map(connection => async () => {
        return await connection.getSlot()
      })
      const blockheight: number = await asyncWaterfall(funcs)
      if (blockheight > this.walletLocalData.blockHeight) {
        this.walletLocalData.blockHeight = blockheight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e: any) {
      this.error(`queryBlockheight Error `, e)
    }
  }

  // https://solana.com/docs/core/rent
  async queryMinimumBalance(): Promise<void> {
    try {
      const funcs = this.tools.connections.map(connection => async () => {
        return await connection.getMinimumBalanceForRentExemption(50)
      })
      const minimumBalance: number = await asyncWaterfall(funcs)
      this.minimumAddressBalance = minimumBalance.toString()
    } catch (e: any) {
      this.error(`queryMinimumBalance Error `, e)
    }
  }

  async queryFee(): Promise<void> {
    try {
      const funcs = this.tools.connections.map(connection => async () => {
        return await connection.getRecentPrioritizationFees()
      })
      const recentPriorityFees: RecentPrioritizationFees[] =
        await asyncWaterfall(funcs)
      // if the array is empty, or request otherwise fails, it's ok to just use the default
      const latestPriorityFee = recentPriorityFees.sort(
        (a, b) => a.slot - b.slot
      )[0]
      this.priorityFee = latestPriorityFee.prioritizationFee.toString()
    } catch (e: any) {
      this.error(`queryFee Error `, e)
    }
  }

  async queryBlockhash(): Promise<void> {
    try {
      const results = await Promise.allSettled(
        this.tools.connections.map(async connection => {
          return await connection.getLatestBlockhash({
            commitment: 'finalized'
          })
        })
      )

      const sortedResults = results
        .filter(
          (
            a
          ): a is PromiseFulfilledResult<{
            blockhash: string
            lastValidBlockHeight: number
          }> => a.status !== 'rejected'
        )
        .sort((a, b) => {
          return b.value.lastValidBlockHeight - a.value.lastValidBlockHeight
        })

      const latest = sortedResults[0]
      if (latest == null) {
        throw new Error('No valid blockhash found')
      }

      this.recentBlockhash = latest.value.blockhash
    } catch (e: any) {
      this.error(`queryBlockhash Error `, e)
    }
  }

  processSolanaTransaction(
    tx: TransactionResponse | VersionedTransactionResponse,
    amounts: ParsedTxAmount,
    timestamp: number,
    memos: string[]
  ): void {
    const ourReceiveAddresses = []

    const { amount, networkFee, parentNetworkFee, tokenId = null } = amounts
    const currencyCode =
      tokenId != null ? this.allTokensMap[tokenId].currencyCode : this.chainCode

    if (gte(amount, '0')) {
      ourReceiveAddresses.push(this.base58PublicKey)
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: tx.slot,
      currencyCode,
      date: timestamp,
      isSend: amount.startsWith('-'),
      memos: memos.map(memo => ({ type: 'text', value: memo })),
      nativeAmount: amount,
      networkFee,
      ourReceiveAddresses,
      parentNetworkFee,
      signedTx: '',
      tokenId,
      txid: tx.transaction.signatures[0],
      walletId: this.walletId
    }
    this.addTransaction(currencyCode, edgeTransaction)
  }

  parseTxAmounts(
    tx: TransactionResponse | VersionedTransactionResponse,
    pubkey: PublicKey
  ): ParsedTxAmount[] {
    const out: ParsedTxAmount[] = []
    const index = tx.transaction.message.staticAccountKeys.findIndex(account =>
      account.equals(pubkey)
    )
    if (index < 0 || tx.meta == null) return out

    const {
      fee,
      preBalances,
      postBalances,
      preTokenBalances: maybePreTokenBalances,
      postTokenBalances: maybePostTokenBalancesRaw
    } = tx.meta
    const preTokenBalances = maybePreTokenBalances ?? []
    const postTokenBalances = maybePostTokenBalancesRaw ?? []
    const networkFee = fee.toString()
    if (this.base58PublicKey === pubkey.toBase58()) {
      const solAmount = (postBalances[index] - preBalances[index]).toString()
      if (solAmount !== '0') {
        const isSend = lt(solAmount, '0')
        out.push({
          amount: solAmount,
          networkFee: isSend ? networkFee : '0'
        })
      }
    }

    const skip = (balObj: TokenBalance): boolean => {
      return (
        balObj.owner !== this.base58PublicKey || // isn't related to our wallet
        this.allTokensMap[balObj.mint] == null // never heard of it
      )
    }

    const tokenBalanceChangeMap = new Map<string, string>()
    for (const postTokenBal of postTokenBalances) {
      if (postTokenBal == null || skip(postTokenBal)) continue
      tokenBalanceChangeMap.set(
        postTokenBal.mint,
        postTokenBal.uiTokenAmount.amount
      )
    }
    for (const preTokenBal of preTokenBalances) {
      if (preTokenBal == null || skip(preTokenBal)) continue
      const current = tokenBalanceChangeMap.get(preTokenBal.mint) ?? '0'
      tokenBalanceChangeMap.set(
        preTokenBal.mint,
        sub(current, preTokenBal.uiTokenAmount.amount)
      )
    }

    tokenBalanceChangeMap.forEach((balanceChange, tokenId) => {
      out.push({
        amount: balanceChange,
        networkFee: '0',
        parentNetworkFee: lt(balanceChange, '0') ? networkFee : undefined,
        tokenId
      })
    })

    return out
  }

  async queryTransactions(): Promise<void> {
    const mainPubkey = new PublicKey(this.base58PublicKey)
    const codePubkeyPairs = new Set<[string, PublicKey]>([
      [this.currencyInfo.currencyCode, mainPubkey]
    ])
    for (const tokenId of this.enabledTokenIds) {
      const pk = getAssociatedTokenAddressSync(
        new PublicKey(tokenId),
        mainPubkey,
        false,
        new PublicKey(this.networkInfo.tokenPublicKey),
        new PublicKey(this.networkInfo.associatedTokenPublicKey)
      )
      const cc = this.allTokensMap[tokenId].currencyCode
      codePubkeyPairs.add([cc, pk])
    }

    for (const pair of codePubkeyPairs) {
      const [currencyCode, pubkey] = pair
      await this.queryTransactionsInner(currencyCode, pubkey)
    }
  }

  async queryTransactionsInner(
    currencyCode: string,
    pubkey: PublicKey
  ): Promise<void> {
    let before: string | undefined
    const until =
      this.otherData.newestTxid[currencyCode] !== ''
        ? this.otherData.newestTxid[currencyCode]
        : undefined
    let txids: ConfirmedSignatureInfo[] = []
    try {
      // Gather all transaction IDs since we last updated
      while (true) {
        const funcs = this.tools.archiveConnections.map(
          connection => async () => {
            return await connection.getSignaturesForAddress(pubkey, {
              until,
              before,
              limit: this.networkInfo.txQueryLimit
            })
          }
        )
        const response: ConfirmedSignatureInfo[] = await asyncWaterfall(funcs)
        txids = txids.concat(response)
        if (response.length < this.networkInfo.txQueryLimit) break // RPC limit
        before = response[this.networkInfo.txQueryLimit - 1].signature
      }
    } catch (e: any) {
      this.error('getTransactionSignatures failed with error: ', e)
      return
    }

    if (txids.length === 0) {
      this.updateTxStatus(currencyCode, 1)
      return
    }

    // Break apart the txids into chunks and query them from oldest to newest
    const CHUNK_SIZE = 50
    let numProcessedTx = 0
    const transactionRequests = txids.map(txid => txid.signature).reverse()

    for (let i = 0; i < transactionRequests.length; i += CHUNK_SIZE) {
      const funcs = this.tools.archiveConnections.map(
        connection => async () => {
          return await connection.getTransactions(transactionRequests, {
            commitment: this.networkInfo.commitment,
            maxSupportedTransactionVersion: 0
          })
        }
      )
      const txResponse: Array<
        TransactionResponse | VersionedTransactionResponse
      > = await asyncWaterfall(funcs)
      const blocktimeRequests: RpcRequest[] = txResponse.map(res => ({
        method: 'getBlockTime',
        params: [res.slot]
      }))
      const blocktimeResponse: Blocktime[] = await this.fetchRpcBulk(
        blocktimeRequests,
        this.networkInfo.rpcNodesArchival
      )

      // Process the transactions from oldest to newest
      for (let i = 0; i < txResponse.length; i++) {
        if (txResponse[i].meta?.err != null) continue // ignore these
        const matchingTxid = txids.find(
          t => t.signature === txResponse[i].transaction.signatures[0]
        )
        const memos: string[] = []
        if (matchingTxid?.memo != null) {
          const regex = /^\[\d+\]\s(.*)$/ // memo field includes a length prefix ie. "[17] " that needs to be ignored
          const match = matchingTxid.memo.match(regex)
          if (match != null) {
            memos.push(match[1])
          }
        }
        const amounts = this.parseTxAmounts(txResponse[i], pubkey)
        amounts.forEach(amount => {
          this.processSolanaTransaction(
            txResponse[i],
            amount,
            asBlocktime(blocktimeResponse[i]).result,
            memos
          )
          numProcessedTx++
        })
        this.otherData.newestTxid[currencyCode] = txids[i].signature

        // Update progress
        const percent = 1 - numProcessedTx / txids.length
        if (percent !== this.progressRatio) {
          if (Math.abs(percent - this.progressRatio) > 0.25 || percent === 1) {
            this.progressRatio = percent
            this.updateTxStatus(currencyCode, this.progressRatio)
          }
        }
      }
    }

    this.walletLocalDataDirty = true
    this.updateTxStatus(currencyCode, 1)

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  updateTxStatus(currencyCode: string, progress: number): void {
    this.tokenCheckTransactionsStatus[currencyCode] = progress
    this.updateOnAddressesChecked()
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    await this.tools.connectClient()
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('queryMinimumBalance', BLOCKCHAIN_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('queryFee', BLOCKCHAIN_POLL_MILLISECONDS).catch(() => {})
    this.queryBlockhash().catch(() => {})

    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS).catch(
      () => {}
    )
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await this.tools.disconnectClient()
    await super.killEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    // todo: Stop using deprecated currencyCode
    const { tokenId } = spendInfo
    const balance = this.getBalance({
      tokenId
    })

    spendInfo.spendTargets[0].nativeAmount = '1'
    const edgeTx = await this.makeSpend(spendInfo)

    let spendableBalance: string
    if (tokenId == null) {
      spendableBalance = sub(balance, edgeTx.networkFee)
    } else {
      const solBalance = this.getBalance({
        tokenId: null
      })
      const solRequired = sub(solBalance, edgeTx.networkFee)
      if (lt(sub(solRequired, this.minimumAddressBalance), '0')) {
        throw new InsufficientFundsError({
          networkFee: this.feePerSignature,
          tokenId: null
        })
      }
      spendableBalance = balance
    }
    if (lt(spendableBalance, '0')) throw new InsufficientFundsError({ tokenId })

    return spendableBalance
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const {
      customNetworkFee,
      memos = [],
      networkFeeOption,
      tokenId,
      otherParams: spendInfoOtherParams = {}
    } = edgeSpendInfo

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { nativeAmount, publicAddress } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    const isTokenTx = tokenId != null

    let totalTxAmount = '0'
    let nativeNetworkFee = this.feePerSignature
    let parentNetworkFee: string | undefined
    const balance = this.walletLocalData.totalBalances[currencyCode] ?? '0'

    // pubkeys
    const payer = new PublicKey(this.base58PublicKey)
    const payee = new PublicKey(publicAddress)
    const tokenProgramId = new PublicKey(this.networkInfo.tokenPublicKey)
    const associatedTokenProgramId = new PublicKey(
      this.networkInfo.associatedTokenPublicKey
    )

    const instructions: TransactionInstruction[] = []

    // calculate priority fee. Multipliers are arbitrary just to establish some ranges
    let microLamports = '0'
    switch (networkFeeOption) {
      case 'low':
        microLamports = max('0', mul(this.priorityFee, '0.75'))
        break
      case 'standard':
        microLamports = this.priorityFee
        break
      case 'high':
        microLamports = max('1', mul(this.priorityFee, '1.25'))
        break
      case 'custom': {
        microLamports = asSolanaCustomFee(customNetworkFee).microLamports
        break
      }
    }

    if (gt(microLamports, '0')) {
      const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: parseInt(microLamports)
      })
      instructions.push(priorityFeeInstruction)
      nativeNetworkFee = add(nativeNetworkFee, microLamports)
    }

    if (isTokenTx) {
      const TOKEN = new PublicKey(tokenId)

      // derive recipient address
      const associatedDestinationTokenAddrPayee = getAssociatedTokenAddressSync(
        TOKEN,
        payee,
        false,
        tokenProgramId,
        associatedTokenProgramId
      )

      // check if recipient exists
      let tokenAddressExists = this.addressCache.get(publicAddress)
      if (tokenAddressExists === undefined) {
        const funcs = this.tools.connections.map(connection => async () => {
          return await connection.getAccountInfo(
            associatedDestinationTokenAddrPayee,
            this.networkInfo.commitment
          )
        })
        const accountRes: AccountInfo<Buffer> | null = await asyncWaterfall(
          funcs
        )
        if (accountRes == null) {
          tokenAddressExists = false
          this.addressCache.set(publicAddress, false)
        } else {
          tokenAddressExists = true
          this.addressCache.set(publicAddress, true)
        }
      }

      // Add token account creation instruction and bump fee
      if (!tokenAddressExists) {
        const tokenCreationInstruction =
          createAssociatedTokenAccountInstruction(
            payer,
            associatedDestinationTokenAddrPayee,
            payee,
            TOKEN,
            tokenProgramId,
            associatedTokenProgramId
          )
        instructions.push(tokenCreationInstruction)
        nativeNetworkFee = add(nativeNetworkFee, this.feePerSignature)
      }

      parentNetworkFee = nativeNetworkFee
      nativeNetworkFee = '0'
      totalTxAmount = nativeAmount
      if (gt(nativeAmount, balance)) {
        throw new InsufficientFundsError({ tokenId })
      }

      const balanceSol =
        this.walletLocalData.totalBalances[this.chainCode] ?? '0'
      if (gt(add(parentNetworkFee, this.minimumAddressBalance), balanceSol)) {
        throw new InsufficientFundsError({
          networkFee: parentNetworkFee,
          tokenId: null
        })
      }

      // derive our address
      const associatedDestinationTokenAddrPayer = getAssociatedTokenAddressSync(
        TOKEN,
        payer,
        false,
        tokenProgramId,
        associatedTokenProgramId
      )
      const tokenTransferInstruction = createTransferInstruction(
        associatedDestinationTokenAddrPayer,
        associatedDestinationTokenAddrPayee,
        payer,
        BigInt(nativeAmount),
        [],
        tokenProgramId
      )
      instructions.push(tokenTransferInstruction)
    } else {
      totalTxAmount = add(nativeAmount, nativeNetworkFee)
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: payee,
        lamports: parseInt(nativeAmount)
      })
      instructions.push(transferInstruction)
    }

    if (eq(totalTxAmount, balance)) {
      // This is a max send so we don't need to consider the minimumAddressBalance
    } else if (gt(add(totalTxAmount, this.minimumAddressBalance), balance)) {
      throw new InsufficientFundsError({ tokenId })
    }

    if (memos[0]?.type === 'text') {
      const memoInstruction = new TransactionInstruction({
        keys: [
          {
            pubkey: payer,
            isSigner: true,
            isWritable: true
          }
        ],
        programId: new PublicKey(this.networkInfo.memoPublicKey),
        data: Buffer.from(memos[0].value, 'utf-8')
      })
      instructions.push(memoInstruction)
    }

    if (this.recentBlockhash === '') await this.queryBlockhash()
    const versionedMessage = MessageV0.compile({
      instructions,
      payerKey: payer,
      recentBlockhash: this.recentBlockhash
    })
    const versionedTx = new VersionedTransaction(versionedMessage)

    const unsignedTx =
      asSolanaSpendInfoOtherParams(spendInfoOtherParams)?.unsignedTx ??
      versionedTx.serialize()

    const otherParams = wasSolanaTxOtherParams({ unsignedTx })

    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: mul(totalTxAmount, '-1'),
      networkFee: nativeNetworkFee,
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

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const solanaPrivateKeys = asSolanaPrivateKeys(this.currencyInfo.pluginId)(
      privateKeys
    )
    const { unsignedTx } = asSolanaTxOtherParams(
      getOtherParams(edgeTransaction)
    )

    const solTx = VersionedTransaction.deserialize(unsignedTx)
    await this.queryBlockhash()
    solTx.message.recentBlockhash = this.recentBlockhash

    const keypair = Keypair.fromSecretKey(
      base16.parse(solanaPrivateKeys.privateKey)
    )
    solTx.sign([
      {
        publicKey: keypair.publicKey,
        secretKey: keypair.secretKey
      }
    ])
    edgeTransaction.signedTx = base64.stringify(solTx.serialize())
    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)

    // Remove all false values from addressCache
    this.addressCache = new Map(
      Array.from(this.addressCache.entries()).filter(([_, value]) => value)
    )

    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    if (edgeTransaction.signedTx == null) throw new Error('Missing signedTx')

    try {
      const promises = this.tools.connections.map(async connection => {
        return await connection.sendEncodedTransaction(edgeTransaction.signedTx)
      })
      const txid: TransactionSignature = await promiseAny(promises)
      edgeTransaction.txid = txid
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }

    return edgeTransaction
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<SolanaNetworkInfo>,
  tools: SolanaTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeSolanaWalletInfo(walletInfo)
  const engine = new SolanaEngine(env, tools, safeWalletInfo, opts)

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}
