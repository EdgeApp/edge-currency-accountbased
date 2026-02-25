import {
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync
} from '@solana/spl-token'
import {
  AccountInfo,
  BlockhashWithExpiryBlockHeight,
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
  VersionedTransaction,
  VersionedTransactionResponse
} from '@solana/web3.js'
import { add, eq, gt, gte, lt, max, mul, sub } from 'biggystring'
import { asMaybe, asString } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeSpendInfo,
  EdgeTokenId,
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
  asyncStaggeredRace,
  asyncWaterfall,
  formatAggregateError,
  promiseAny,
  timeout
} from '../common/promiseUtils'
import { makeTokenSyncTracker, TokenSyncTracker } from '../common/SyncTracker'
import { cache, cleanTxLogs, getOtherParams, snooze } from '../common/utils'
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
  asTokenBalances,
  ParsedTxAmount,
  RpcRequest,
  SafeSolanaWalletInfo,
  SolanaNetworkInfo,
  SolanaWalletOtherData,
  wasSolanaTxOtherParams
} from './solanaTypes'

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class SolanaEngine extends CurrencyEngine<
  SolanaTools,
  SafeSolanaWalletInfo,
  TokenSyncTracker
> {
  lightMode: boolean
  networkInfo: SolanaNetworkInfo
  base58PublicKey: string
  feePerSignature: string
  getPriorityFee: () => Promise<string>
  getRecentBlockhash: () => Promise<BlockhashWithExpiryBlockHeight>
  otherData!: SolanaWalletOtherData
  fetch: EdgeFetchFunction
  progressRatio: number
  addressCache: Map<string, boolean>
  getMinimumAddressBalance: () => Promise<string>
  usedTokenIdSet: Set<EdgeTokenId> = new Set()

  constructor(
    env: PluginEnvironment<SolanaNetworkInfo>,
    tools: SolanaTools,
    walletInfo: SafeSolanaWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeTokenSyncTracker)
    this.lightMode = opts.lightMode ?? false
    this.networkInfo = env.networkInfo
    this.fetch = async (uri, opts) =>
      await env.io.fetch(uri, { ...opts, corsBypass: 'always' })
    this.feePerSignature = '5000'
    this.getPriorityFee = cache(this.queryFee.bind(this), 30000)
    this.getRecentBlockhash = cache(this.queryBlockhash.bind(this), 30000) // must be < ~2min old to send tx
    this.base58PublicKey = walletInfo.keys.publicKey
    this.progressRatio = 0
    this.addressCache = new Map()
    this.getMinimumAddressBalance = cache(
      this.queryMinimumBalance.bind(this),
      30000
    )
    this.usedTokenIdSet = new Set()
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
      const res = await this.fetch(serverUrl, options)
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
        },
        {
          method: 'getTokenAccountsByOwner',
          params: [
            this.base58PublicKey,
            { programId: this.networkInfo.tokenPublicKey },
            { encoding: 'jsonParsed' }
          ]
        },
        {
          method: 'getTokenAccountsByOwner',
          params: [
            this.base58PublicKey,
            { programId: this.networkInfo.token2022PublicKey },
            { encoding: 'jsonParsed' }
          ]
        }
      ]

      const balances: any = await this.fetchRpcBulk(requests)

      const [mainnetBal, tokenBalsRaw, token2022BalsRaw]: [
        AccountBalance,
        TokenAmount[],
        TokenAmount[]
      ] = balances

      const balance = asAccountBalance(mainnetBal)
      this.updateBalance(null, balance.result.value.toString())
      this.usedTokenIdSet.add(null)

      const tokenBalances = [
        ...asTokenBalances(tokenBalsRaw).result.value,
        ...asTokenBalances(token2022BalsRaw).result.value
      ].flat()
      const tokenBalMap = tokenBalances.reduce(
        (acc: { [key: string]: string }, tokenBal) => {
          acc[tokenBal.account.data.parsed.info.mint] =
            tokenBal.account.data.parsed.info.tokenAmount.amount
          return acc
        },
        {}
      )

      const detectedTokenIds: string[] = []
      for (const tokenId of Object.keys(this.allTokensMap)) {
        let balance = '0'
        if (tokenBalMap[tokenId] != null) {
          this.usedTokenIdSet.add(tokenId)
          balance = tokenBalMap[tokenId] ?? '0'
        }
        this.updateBalance(tokenId, balance)

        if (gt(balance, '0')) {
          detectedTokenIds.push(tokenId)
        }
      }

      if (detectedTokenIds.length > 0) {
        this.reportDetectedTokens(detectedTokenIds)
      }
    } catch (e: any) {
      // Nodes will return 0 for uninitiated accounts so thrown errors should be logged
      this.error(
        `Error checking ${this.currencyInfo.pluginId} address balance`,
        e
      )
    }
  }

  // https://solana.com/docs/core/rent
  async queryMinimumBalance(): Promise<string> {
    const funcs = this.tools.connections.map(connection => async () => {
      return await connection.getMinimumBalanceForRentExemption(50)
    })
    const minimumBalance: number = await asyncWaterfall(funcs)
    this.minimumAddressBalance = minimumBalance.toString()
    return this.minimumAddressBalance
  }

  async queryFee(): Promise<string> {
    const funcs = this.tools.connections.map(connection => async () => {
      return await connection.getRecentPrioritizationFees()
    })
    const recentPriorityFeesRes: RecentPrioritizationFees[] =
      await asyncWaterfall(funcs)

    if (recentPriorityFeesRes.length === 0) {
      return this.networkInfo.basePriorityFee.toString()
    }

    const recentPriorityFees = recentPriorityFeesRes.map(
      fee => fee.prioritizationFee
    )
    const averagePriorityFee =
      recentPriorityFees.reduce((acc, num) => acc + num, 0) /
      recentPriorityFees.length

    return Math.max(
      Math.ceil(averagePriorityFee),
      this.networkInfo.basePriorityFee
    ).toString()
  }

  async queryBlockhash(): Promise<BlockhashWithExpiryBlockHeight> {
    const results = await Promise.allSettled(
      this.tools.connections.map(async connection => {
        return await timeout(
          connection.getLatestBlockhash({
            commitment: 'finalized'
          }),
          2000
        )
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

    return {
      blockhash: latest.value.blockhash,
      lastValidBlockHeight: latest.value.lastValidBlockHeight
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
    const currencyCode = this.getCurrencyCode(tokenId)
    if (currencyCode == null) return

    if (gte(amount, '0')) {
      ourReceiveAddresses.push(this.base58PublicKey)
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: tx.slot,
      confirmations: 'confirmed',
      currencyCode,
      date: timestamp,
      isSend: amount.startsWith('-'),
      memos: memos.map(memo => ({ type: 'text', value: memo })),
      nativeAmount: amount,
      networkFee,
      networkFees: [],
      ourReceiveAddresses,
      parentNetworkFee,
      signedTx: '',
      tokenId,
      txid: tx.transaction.signatures[0],
      walletId: this.walletId
    }
    this.addTransaction(tokenId, edgeTransaction)
  }

  parseTxAmounts(
    tx: TransactionResponse | VersionedTransactionResponse,
    pubkey: PublicKey
  ): ParsedTxAmount[] {
    const index = tx.transaction.message.staticAccountKeys.findIndex(account =>
      account.equals(pubkey)
    )
    if (index < 0 || tx.meta == null) return []

    const {
      fee,
      preBalances,
      postBalances,
      preTokenBalances: maybePreTokenBalances,
      postTokenBalances: maybePostTokenBalancesRaw
    } = tx.meta
    const preTokenBalances = maybePreTokenBalances ?? []
    const postTokenBalances = maybePostTokenBalancesRaw ?? []
    const isTokenTransaction =
      tx.transaction.message.staticAccountKeys.find(
        pk =>
          pk.equals(this.tools.tokenProgramPublicKey) ||
          pk.equals(this.tools.token2022ProgramPublicKey)
      ) != null
    const networkFee = fee.toString()

    const out: ParsedTxAmount[] = []

    const solAmount = (postBalances[index] - preBalances[index]).toString()
    const isSend = index === 0
    if (solAmount !== '0') {
      let solFee = networkFee
      if (isTokenTransaction && isSend) {
        // we'll capture the fee using parentNetworkFee later
        solFee = '0'
      }
      const amount = isSend ? sub(solAmount, solFee) : solAmount
      out.push({
        amount,
        networkFee: solFee
      })
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
        parentNetworkFee: isSend ? networkFee : undefined,
        tokenId
      })
    })

    return out
  }

  async queryTransactions(): Promise<void> {
    if (this.usedTokenIdSet.size === 0) {
      // queryBalance needs to run once before we lookup transactions
      await this.queryBalance()
    }

    const mainPubkey = new PublicKey(this.base58PublicKey)
    await this.queryTransactionsInner(null, mainPubkey)
    this.sendTransactionEvents()
    this.syncTracker.updateHistoryRatio(null, 1)

    for (const tokenId of this.enabledTokenIds) {
      const token = this.allTokensMap[tokenId]
      if (this.usedTokenIdSet.has(tokenId)) {
        const tokenOwnerPubkey = this.tools.getTokenOwnerPublicKey(token)

        const pk = getAssociatedTokenAddressSync(
          new PublicKey(tokenId),
          mainPubkey,
          false,
          tokenOwnerPubkey,
          new PublicKey(this.networkInfo.associatedTokenPublicKey)
        )
        await this.queryTransactionsInner(tokenId, pk)
        this.sendTransactionEvents()
      }
      this.syncTracker.updateHistoryRatio(tokenId, 1)
    }
  }

  async queryTransactionsInner(
    tokenId: EdgeTokenId,
    pubkey: PublicKey
  ): Promise<void> {
    const safeTokenId = tokenId ?? ''
    let before: string | undefined
    const until =
      this.otherData.newestTxid[safeTokenId] !== ''
        ? this.otherData.newestTxid[safeTokenId]
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
        const response: ConfirmedSignatureInfo[] = await asyncStaggeredRace(
          funcs
        )
        txids = txids.concat(response)
        if (response.length < this.networkInfo.txQueryLimit) break // RPC limit
        before = response[this.networkInfo.txQueryLimit - 1].signature
      }
    } catch (e: any) {
      this.error('getTransactionSignatures failed with error: ', e)
      return
    }

    if (txids.length === 0) {
      this.syncTracker.updateHistoryRatio(tokenId, 1)
      return
    }

    // Break apart the txids into chunks and query them from oldest to newest
    const CHUNK_SIZE = 50
    let numProcessedTx = 0
    const transactionRequests = txids.map(txid => txid.signature).reverse()

    for (let i = 0; i < transactionRequests.length; i += CHUNK_SIZE) {
      const transactionRequest = transactionRequests.slice(i, i + CHUNK_SIZE)
      const funcs = this.tools.archiveConnections.map(
        connection => async () => {
          return await connection.getTransactions(transactionRequest, {
            commitment: this.networkInfo.commitment,
            maxSupportedTransactionVersion: 0
          })
        }
      )
      const txResponse: Array<
        TransactionResponse | VersionedTransactionResponse
      > = await asyncStaggeredRace(funcs)

      // Process the transactions from oldest to newest
      for (let i = 0; i < txResponse.length; i++) {
        numProcessedTx++
        if (txResponse[i].meta?.err != null) continue // ignore these
        const matchingTxid = txids.find(
          t => t.signature === txResponse[i].transaction.signatures[0]
        )
        if (matchingTxid == null) continue

        let blocktime = matchingTxid.blockTime ?? txResponse[i].blockTime
        if (blocktime == null) {
          const funcs = this.tools.archiveConnections.map(
            connection => async () => {
              return await connection.getBlockTime(txResponse[i].slot)
            }
          )
          const blocktimeRaw = await asyncStaggeredRace(funcs)
          const blocktimeClean = asMaybe(asBlocktime)(blocktimeRaw)
          if (blocktimeClean == null) continue

          blocktime = blocktimeClean.result
        }
        const timestamp = blocktime

        const memos: string[] = []
        if (matchingTxid.memo != null) {
          const regex = /^\[\d+\]\s(.*)$/ // memo field includes a length prefix ie. "[17] " that needs to be ignored
          const match = matchingTxid.memo.match(regex)
          if (match != null) {
            memos.push(match[1])
          }
        }
        const amounts = this.parseTxAmounts(txResponse[i], pubkey)
        amounts.forEach(amount => {
          this.processSolanaTransaction(txResponse[i], amount, timestamp, memos)
        })
        this.otherData.newestTxid[safeTokenId] =
          txResponse[i].transaction.signatures[0]

        // Update progress
        const percent = 1 - numProcessedTx / txids.length
        if (percent !== this.progressRatio) {
          if (Math.abs(percent - this.progressRatio) > 0.25 || percent === 1) {
            this.progressRatio = percent
            this.syncTracker.updateHistoryRatio(tokenId, this.progressRatio)
          }
        }
      }
    }

    this.walletLocalDataDirty = true
    this.sendTransactionEvents()
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    await this.tools.connectClient()

    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS)
    if (this.lightMode) {
      this.syncTracker.setHistoryRatios([null, ...this.enabledTokenIds], 1)
    } else {
      this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    }
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
    const minimumAddressBalance = await this.getMinimumAddressBalance()

    let spendableBalance: string
    if (tokenId == null) {
      spendableBalance = sub(
        sub(balance, edgeTx.networkFee),
        minimumAddressBalance
      )
    } else {
      const solBalance = this.getBalance({
        tokenId: null
      })
      const solRequired = sub(solBalance, edgeTx.networkFee)
      if (lt(sub(solRequired, minimumAddressBalance), '0')) {
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
    const balance = this.getBalance({ tokenId })

    // pubkeys
    const payer = new PublicKey(this.base58PublicKey)
    const payee = new PublicKey(publicAddress)

    const instructions: TransactionInstruction[] = []

    // calculate priority fee. Multipliers are arbitrary just to establish some ranges
    const priorityFee = await this.getPriorityFee()
    let microLamports = '0'
    switch (networkFeeOption) {
      case 'low':
        microLamports = max('0', mul(priorityFee, '0.75'))
        break
      case undefined:
      case 'standard':
        microLamports = priorityFee
        break
      case 'high':
        microLamports = max('1', mul(priorityFee, '1.25'))
        break
      case 'custom': {
        microLamports = asSolanaCustomFee(customNetworkFee).microLamports
        break
      }
    }

    const minimumAddressBalance = await this.getMinimumAddressBalance()

    if (gt(microLamports, '0')) {
      const priorityFeeInstruction = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: parseInt(microLamports)
      })
      instructions.push(priorityFeeInstruction)
      nativeNetworkFee = add(nativeNetworkFee, microLamports)
    }

    if (isTokenTx) {
      const tokenPubkey = new PublicKey(tokenId)
      const token = this.allTokensMap[tokenId]
      const tokenOwnerPubkey = this.tools.getTokenOwnerPublicKey(token)

      const decimals =
        token.denominations[0].multiplier.match(/0/g)?.length ?? 0
      const associatedTokenProgramId = new PublicKey(
        this.networkInfo.associatedTokenPublicKey
      )

      // derive recipient address
      const associatedDestinationTokenAddrPayee = getAssociatedTokenAddressSync(
        tokenPubkey,
        payee,
        true, // payee may be a Program Derived Address
        tokenOwnerPubkey,
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
            tokenPubkey,
            tokenOwnerPubkey,
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

      const balanceSol = this.getBalance({ tokenId: null })
      if (gt(add(parentNetworkFee, minimumAddressBalance), balanceSol)) {
        throw new InsufficientFundsError({
          networkFee: parentNetworkFee,
          tokenId: null
        })
      }

      // derive our address
      const associatedDestinationTokenAddrPayer = getAssociatedTokenAddressSync(
        tokenPubkey,
        payer,
        false,
        tokenOwnerPubkey,
        associatedTokenProgramId
      )
      const tokenTransferInstruction = createTransferCheckedInstruction(
        associatedDestinationTokenAddrPayer,
        new PublicKey(tokenId),
        associatedDestinationTokenAddrPayee,
        payer,
        BigInt(nativeAmount),
        decimals,
        [],
        tokenOwnerPubkey
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

      if (eq(totalTxAmount, balance)) {
        // This is a max token send so we don't need to consider the minimumAddressBalance
      } else if (gt(add(totalTxAmount, minimumAddressBalance), balance)) {
        throw new InsufficientFundsError({ tokenId })
      }
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

    const recentBlockhash = await this.getRecentBlockhash()
    const versionedMessage = MessageV0.compile({
      instructions,
      payerKey: payer,
      recentBlockhash: recentBlockhash.blockhash
    })
    const versionedTx = new VersionedTransaction(versionedMessage)

    const unsignedTx =
      asSolanaSpendInfoOtherParams(spendInfoOtherParams)?.unsignedTx ??
      versionedTx.serialize()

    const otherParams = wasSolanaTxOtherParams({
      unsignedTx,
      blockhash: recentBlockhash.blockhash,
      lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
    })

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
      networkFees: [],
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
    const recentBlockhash = await this.queryBlockhash()
    solTx.message.recentBlockhash = recentBlockhash.blockhash

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
    edgeTransaction.otherParams = wasSolanaTxOtherParams({
      unsignedTx,
      blockhash: recentBlockhash.blockhash,
      lastValidBlockHeight: recentBlockhash.lastValidBlockHeight
    })
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

    const { blockhash, lastValidBlockHeight } = asSolanaTxOtherParams(
      getOtherParams(edgeTransaction)
    )
    const stakedConnections = this.tools.makeConnections(
      this.networkInfo.stakedConnectionRpcNodes
    )
    const rpcConnections = this.tools.connections
    const allConnections = [...this.tools.connections, ...stakedConnections]

    const confirmationController = new AbortController()
    const retryTxController = new AbortController()

    const submitTx = async (): Promise<string> => {
      const broadcastPromises = allConnections.map(async connection => {
        const txid = await connection.sendEncodedTransaction(
          edgeTransaction.signedTx,
          { skipPreflight: true }
        )
        return txid
      })
      const txid = await formatAggregateError(
        promiseAny(broadcastPromises),
        'Broadcast failed:'
      )
      return txid
    }

    const checkBlockheight = async (): Promise<number> => {
      const broadcastPromises = rpcConnections.map(async connection => {
        const blockheight = await timeout(
          connection.getBlockHeight('confirmed'),
          1000
        )
        return blockheight
      })
      const blockheightResults = await Promise.allSettled(broadcastPromises)
      const blockheights = blockheightResults
        .filter(p => p.status === 'fulfilled')
        .map(r => (r as PromiseFulfilledResult<number>).value)
      const maxHeight = Math.max(...blockheights)
      return maxHeight
    }

    const retryTxSubmission = async (): Promise<void> => {
      while (!retryTxController.signal.aborted) {
        await snooze(400) // pause for roughly a blocktime
        const height = await checkBlockheight()
        if (height < lastValidBlockHeight) {
          await submitTx()
        } else {
          confirmationController.abort()
          throw new Error('transaction expired')
        }
      }
    }

    try {
      const txid = await submitTx()

      const confirmPromises = rpcConnections.map(async connection => {
        const confirmTxRes = await connection.confirmTransaction(
          {
            signature: txid,
            blockhash,
            lastValidBlockHeight,
            abortSignal: confirmationController.signal
          },
          'confirmed'
        )
        const txError = asMaybe(asString)(confirmTxRes.value.err)
        if (txError != null) {
          throw new Error(txError)
        }

        // Confirmed!!
        retryTxController.abort()
      })

      await Promise.race([retryTxSubmission(), ...confirmPromises])

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
