import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress
} from '@solana/spl-token'
import * as solanaWeb3 from '@solana/web3.js'
import { add, eq, gt, gte, lt, max, mul, sub } from 'biggystring'
import { asMaybe, asNumber, asString } from 'cleaners'
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
import { base16 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { utf8 } from '../common/utf8'
import {
  asyncWaterfall,
  cleanTxLogs,
  getFetchCors,
  getOtherParams
} from '../common/utils'
import { SolanaTools } from './SolanaTools'
import {
  AccountBalance,
  asAccountBalance,
  asAccountInfo,
  asBlocktime,
  asGetRecentPrioritizationFees,
  asLatestBlockhash,
  asRpcSignatureForAddressResponse,
  asSafeSolanaWalletInfo,
  asSolanaCustomFee,
  asSolanaInitOptions,
  asSolanaPrivateKeys,
  asSolanaWalletOtherData,
  asTokenBalance,
  asTransaction,
  Blocktime,
  ParsedTxAmount,
  RpcGetTransaction,
  RpcRequest,
  RpcSignatureForAddress,
  SafeSolanaWalletInfo,
  SolanaNetworkInfo,
  SolanaWalletOtherData,
  TokenBalance
} from './solanaTypes'

const {
  ComputeBudgetProgram,
  PublicKey,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionInstruction
} = solanaWeb3

const ACCOUNT_POLL_MILLISECONDS = 5000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000

export class SolanaEngine extends CurrencyEngine<
  SolanaTools,
  SafeSolanaWalletInfo
> {
  networkInfo: SolanaNetworkInfo
  initOptions: JsonObject
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
    this.initOptions = env.initOptions
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

  async fetchRpc(method: string, params: any = []): Promise<unknown> {
    const req = {
      method,
      params
    }
    const res = await this.fetchRpcBulk([req])
    return res[0].result
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
      const apiKeys = asSolanaInitOptions(this.initOptions) as {
        [key: string]: string
      }
      const regex = /{{(.*)}}/g
      const match = regex.exec(serverUrl)
      if (match != null) {
        const key = match[1]
        const apiKey = apiKeys[key]
        if (typeof apiKey === 'string') {
          serverUrl = serverUrl.replace(match[0], apiKey)
        } else if (apiKey == null) {
          throw new Error(
            `Missing ${key} in 'initOptions' for ${this.currencyInfo.pluginId}`
          )
        } else {
          throw new Error('Incorrect apikey type for RPC')
        }
      }

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
        const associatedTokenPubkey = await getAssociatedTokenAddress(
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

      const [mainnetBal, ...tokenBals]: [AccountBalance, TokenBalance[]] =
        balances
      const balance = asAccountBalance(mainnetBal)
      this.updateBalance(this.chainCode, balance.result.value.toString())

      for (const [i, tokenId] of allTokenIds.entries()) {
        const tokenBal = asMaybe(asTokenBalance)(tokenBals[i])
        // empty token addresses return an error "Invalid param: could not find account".
        // If there was an actual error with the request it would have thrown already
        const balance = tokenBal?.result?.value?.amount ?? '0'
        this.updateBalance(this.allTokensMap[tokenId].currencyCode, balance)
      }
    } catch (e: any) {
      // Nodes will return 0 for uninitiated accounts so thrown errors should be logged
      this.error(`Error checking ${this.chainCode} address balance`, e)
    }
  }

  async queryBlockheight(): Promise<void> {
    try {
      const blockheight = asNumber(await this.fetchRpc('getSlot'))
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
      const minimumBalance = asNumber(
        await this.fetchRpc('getMinimumBalanceForRentExemption', [50])
      )
      this.minimumAddressBalance = minimumBalance.toString()
    } catch (e: any) {
      this.error(`queryMinimumBalance Error `, e)
    }
  }

  async queryFee(): Promise<void> {
    try {
      const response = await this.fetchRpc('getRecentPrioritizationFees')
      const recentPriorityFees = asGetRecentPrioritizationFees(response)
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
      const response = await this.fetchRpc('getLatestBlockhash')
      const { blockhash } = asLatestBlockhash(response).value
      this.recentBlockhash = blockhash
    } catch (e: any) {
      this.error(`queryBlockhash Error `, e)
    }
  }

  processSolanaTransaction(
    tx: RpcGetTransaction['result'],
    amounts: ParsedTxAmount,
    timestamp: number
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
      memos: [],
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

  parseTxAmounts(tx: RpcGetTransaction['result']): ParsedTxAmount[] {
    const out: ParsedTxAmount[] = []
    const index = tx.transaction.message.accountKeys.findIndex(
      account => account.pubkey === this.base58PublicKey
    )
    if (index < 0 || tx.meta == null) return out

    const {
      fee,
      preBalances,
      postBalances,
      preTokenBalances,
      postTokenBalances
    } = tx.meta
    const networkFee = fee.toString()
    const solAmount = (postBalances[index] - preBalances[index]).toString()
    if (solAmount !== '0') {
      const isSend = lt(solAmount, '0')
      out.push({
        amount: isSend ? sub(solAmount, networkFee) : solAmount,
        networkFee: isSend ? networkFee : '0'
      })
    }

    const skip = (
      balObj: RpcGetTransaction['result']['meta']['postTokenBalances'][number]
    ): boolean => {
      return (
        balObj == null || // don't recognize the object
        balObj.owner !== this.base58PublicKey || // isn't related to our wallet
        balObj.programId !== this.networkInfo.tokenPublicKey || // isn't an spl token
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
    let before = null
    const until =
      this.otherData.newestTxid !== '' ? this.otherData.newestTxid : null
    let txids: RpcSignatureForAddress[] = []
    try {
      // Gather all transaction IDs since we last updated
      while (true) {
        const params = [
          this.base58PublicKey,
          {
            until,
            before,
            limit: this.networkInfo.txQueryLimit,
            commitment: this.networkInfo.commitment
          }
        ]
        const raw: unknown = await this.fetchRpcBulk(
          [{ method: 'getSignaturesForAddress', params }],
          this.networkInfo.rpcNodesArchival
        )
        const response = asRpcSignatureForAddressResponse(raw)[0].result
        txids = txids.concat(response)
        if (response.length < this.networkInfo.txQueryLimit) break // RPC limit
        before = response[this.networkInfo.txQueryLimit - 1].signature
      }
    } catch (e: any) {
      this.error('getTransactionSignatures failed with error: ', e)
      return
    }

    if (txids.length === 0) {
      this.updateTxStatus(1)
      this.updateOnAddressesChecked()
      return
    }

    // Break apart the txids into chunks and query them from oldest to newest
    const CHUNK_SIZE = 50
    let numProcessedTx = 0
    const transactionRequests = txids
      .map(txid => ({
        method: 'getTransaction',
        params: [
          txid.signature,
          {
            encoding: 'jsonParsed',
            commitment: this.networkInfo.commitment,
            maxSupportedTransactionVersion: 0
          }
        ]
      }))
      .reverse()

    for (let i = 0; i < transactionRequests.length; i += CHUNK_SIZE) {
      const partialTransactionRequests = transactionRequests.slice(
        i,
        i + CHUNK_SIZE > transactionRequests.length - 1
          ? undefined
          : i + CHUNK_SIZE
      )

      const txResponse: RpcGetTransaction[] = await this.fetchRpcBulk(
        partialTransactionRequests,
        this.networkInfo.rpcNodesArchival
      )
      const slots = txResponse.map(res => asTransaction(res).result.slot)
      const blocktimeRequests: RpcRequest[] = slots.map(slot => ({
        method: 'getBlockTime',
        params: [slot]
      }))
      const blocktimeResponse: Blocktime[] = await this.fetchRpcBulk(
        blocktimeRequests,
        this.networkInfo.rpcNodesArchival
      )

      // Process the transactions from oldest to newest
      for (let i = 0; i < txResponse.length; i++) {
        if (txResponse[i].result.meta?.err != null) continue // ignore these
        const amounts = this.parseTxAmounts(txResponse[i].result)
        amounts.forEach(amount => {
          this.processSolanaTransaction(
            txResponse[i].result,
            amount,
            asBlocktime(blocktimeResponse[i]).result
          )
          numProcessedTx++
        })
        this.otherData.newestTxid = txids[i].signature

        // Update progress
        const percent = 1 - numProcessedTx / txids.length
        if (percent !== this.progressRatio) {
          if (Math.abs(percent - this.progressRatio) > 0.25 || percent === 1) {
            this.progressRatio = percent
            this.updateTxStatus(this.progressRatio)
            this.updateOnAddressesChecked()
          }
        }
      }
    }

    this.walletLocalDataDirty = true
    this.updateTxStatus(1)

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  updateTxStatus(progress: number): void {
    const codeArray = [
      this.chainCode,
      ...this.enabledTokenIds.map(
        tokenId => this.allTokensMap[tokenId].currencyCode
      )
    ]
    codeArray.forEach(code => {
      this.tokenCheckTransactionsStatus[code] = progress
    })
    this.updateOnAddressesChecked()
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('queryMinimumBalance', BLOCKCHAIN_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('queryFee', BLOCKCHAIN_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop('queryBlockhash', BLOCKCHAIN_POLL_MILLISECONDS).catch(
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
      tokenId
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

    const txOpts = {
      recentBlockhash: this.recentBlockhash,
      feePayer: payer
    }
    const solTx = new Transaction(txOpts)

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
      solTx.add(priorityFeeInstruction)
      nativeNetworkFee = add(nativeNetworkFee, microLamports)
    }

    if (isTokenTx) {
      const TOKEN = new PublicKey(tokenId)

      // derive recipient address
      const associatedDestinationTokenAddrPayee =
        await getAssociatedTokenAddress(
          TOKEN,
          payee,
          false,
          tokenProgramId,
          associatedTokenProgramId
        )

      // check if recipient exists
      let tokenAddressExists = this.addressCache.get(publicAddress)
      if (tokenAddressExists === undefined) {
        const accountRes = asAccountInfo(
          await this.fetchRpc('getAccountInfo', [
            associatedDestinationTokenAddrPayee.toBase58(),
            {
              commitment: this.networkInfo.commitment,
              encoding: 'jsonParsed'
            }
          ])
        )

        if (accountRes.value == null) {
          tokenAddressExists = false
          this.addressCache.set(publicAddress, false)
        } else {
          tokenAddressExists = true
          this.addressCache.set(publicAddress, true)
        }
      }

      // Add token account creation instruction and bump fee
      if (!tokenAddressExists) {
        solTx.add(
          createAssociatedTokenAccountInstruction(
            payer,
            associatedDestinationTokenAddrPayee,
            payee,
            TOKEN,
            tokenProgramId,
            associatedTokenProgramId
          )
        )
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
      const associatedDestinationTokenAddrPayer =
        await getAssociatedTokenAddress(
          TOKEN,
          payer,
          false,
          tokenProgramId,
          associatedTokenProgramId
        )

      solTx.add(
        createTransferInstruction(
          associatedDestinationTokenAddrPayer,
          associatedDestinationTokenAddrPayee,
          payer,
          BigInt(nativeAmount),
          [],
          tokenProgramId
        )
      )
    } else {
      totalTxAmount = add(nativeAmount, nativeNetworkFee)

      solTx.add(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: payee,
          lamports: parseInt(nativeAmount)
        })
      )
    }

    if (eq(totalTxAmount, balance)) {
      // This is a max send so we don't need to consider the minimumAddressBalance
    } else if (gt(add(totalTxAmount, this.minimumAddressBalance), balance)) {
      throw new InsufficientFundsError({ tokenId })
    }

    if (memos[0]?.type === 'text') {
      const memoOpts = new TransactionInstruction({
        keys: [
          {
            pubkey: payer,
            isSigner: true,
            isWritable: true
          }
        ],
        programId: new PublicKey(this.networkInfo.memoPublicKey),
        data: Buffer.from(utf8.parse(memos[0].value))
      })
      solTx.add(memoOpts)
    }

    const otherParams: JsonObject = {
      unsignedSerializedSolTx: solTx.serialize({
        requireAllSignatures: false
      })
    }

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
    const { unsignedSerializedSolTx } = getOtherParams(edgeTransaction)
    if (unsignedSerializedSolTx == null)
      throw new Error('Missing unsignedSerializedSolTx')

    const keypair = Keypair.fromSecretKey(
      Uint8Array.from(base16.parse(solanaPrivateKeys.privateKey))
    )

    const solTx = Transaction.from(unsignedSerializedSolTx)
    solTx.recentBlockhash = this.recentBlockhash
    solTx.sign({
      publicKey: keypair.publicKey,
      secretKey: keypair.secretKey
    })
    edgeTransaction.signedTx = solTx.serialize().toString('base64')
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
      const params = [edgeTransaction.signedTx, { encoding: 'base64' }]
      const txid = asString(await this.fetchRpc('sendTransaction', params))
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
