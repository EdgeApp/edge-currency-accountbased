import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress
} from '@solana/spl-token'
import * as solanaWeb3 from '@solana/web3.js'
import { add, gt, mul } from 'biggystring'
import { asArray, asNumber, asString } from 'cleaners'
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
import { upgradeMemos } from '../common/upgradeMemos'
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
  asRecentBlockHash,
  asRpcSignatureForAddress,
  asSafeSolanaWalletInfo,
  asSolanaPrivateKeys,
  asSolanaWalletOtherData,
  asTokenBalance,
  asTransaction,
  Blocktime,
  RpcGetTransaction,
  RpcRequest,
  RpcSignatureForAddress,
  SafeSolanaWalletInfo,
  SolanaNetworkInfo,
  SolanaWalletOtherData,
  TokenBalance
} from './solanaTypes'

const {
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
  base58PublicKey: string
  feePerSignature: string
  recentBlockhash: string
  chainCode: string
  otherData!: SolanaWalletOtherData
  fetchCors: EdgeFetchFunction
  progressRatio: number
  addressCache: Map<string, boolean>

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
    this.recentBlockhash = '' // must be < ~2min old to send tx
    this.base58PublicKey = walletInfo.keys.publicKey
    this.progressRatio = 0
    this.addressCache = new Map()
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

  async fetchRpcBulk(requests: RpcRequest[]): Promise<any[]> {
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

    const funcs = this.networkInfo.rpcNodes.map(serverUrl => async () => {
      const res = await this.fetchCors(serverUrl, options)
      if (!res.ok) {
        throw new Error(
          `fetchRpc ${options.method} failed error: ${res.status}`
        )
      }
      return await res.json()
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
      for (const tokenId of allTokenIds) {
        requests.push({
          method: 'getTokenAccountsByOwner',
          params: [
            this.base58PublicKey,
            { mint: tokenId },
            {
              commitment: this.networkInfo.commitment,
              encoding: 'jsonParsed'
            }
          ]
        })

        const balances: any = await this.fetchRpcBulk(requests)

        const [mainnetBal, ...tokenBals]: [AccountBalance, TokenBalance[]] =
          balances
        const balance = asAccountBalance(mainnetBal)
        this.updateBalance(this.chainCode, balance.result.value.toString())

        for (const [i, tokenId] of allTokenIds.entries()) {
          const tokenBal = asTokenBalance(tokenBals[i])
          const balance =
            tokenBal.result.value[0]?.account?.data?.parsed?.info?.tokenAmount
              ?.amount ?? '0'
          this.updateBalance(this.allTokensMap[tokenId].currencyCode, balance)
        }
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

  async queryFee(): Promise<void> {
    try {
      const response = await this.fetchRpc('getRecentBlockhash')
      const {
        blockhash,
        feeCalculator: { lamportsPerSignature }
      } = asRecentBlockHash(response).value
      this.feePerSignature = lamportsPerSignature.toString()
      this.recentBlockhash = blockhash
    } catch (e: any) {
      this.error(`queryFee Error `, e)
    }
  }

  processSolanaTransaction(
    tx: RpcGetTransaction['result'],
    timestamp: number
  ): void {
    const ourReceiveAddresses = []
    const index = tx.transaction.message.accountKeys.findIndex(
      account => account === this.base58PublicKey
    )
    if (index < 0 || tx.meta == null) return
    const amount = tx.meta.postBalances[index] - tx.meta.preBalances[index]
    const fee = tx.meta.fee

    // Failed outgoing transactions can go through the normal flow since the payload returns pre- and post- balances which account for burned fees.
    // Failed incoming transactions need to be ignored
    if (amount >= 0) {
      if (tx.meta.err != null) return // ignore these
      ourReceiveAddresses.push(this.base58PublicKey)
    }
    const edgeTransaction: EdgeTransaction = {
      blockHeight: tx.slot,
      currencyCode: this.chainCode,
      date: timestamp,
      isSend: amount.toString().startsWith('-'),
      memos: [],
      nativeAmount: amount.toString(),
      networkFee: fee.toString(),
      ourReceiveAddresses,
      signedTx: '',
      txid: tx.transaction.signatures[0],
      walletId: this.walletId
    }
    this.addTransaction(this.chainCode, edgeTransaction)
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
        const response: RpcSignatureForAddress[] = asArray(
          asRpcSignatureForAddress
        )(await this.fetchRpc('getSignaturesForAddress', params))
        txids = txids.concat(response)
        if (response.length < this.networkInfo.txQueryLimit) break // RPC limit
        before = response[this.networkInfo.txQueryLimit - 1].signature
      }
    } catch (e: any) {
      this.error('getTransactionSignatures failed with error: ', e)
      return
    }

    if (txids.length === 0) {
      this.tokenCheckTransactionsStatus[this.chainCode] = 1
      this.updateOnAddressesChecked()
      return
    }

    const transactionRequests: RpcRequest[] = []
    for (let i = txids.length - 1; i >= 0; i--) {
      transactionRequests.push({
        method: 'getTransaction',
        params: [
          txids[i].signature,
          { encoding: 'json', commitment: this.networkInfo.commitment }
        ]
      })
    }
    const txResponse: RpcGetTransaction[] = await this.fetchRpcBulk(
      transactionRequests
    )
    const slots = txResponse.map(res => asTransaction(res).result.slot)
    const blocktimeRequests: RpcRequest[] = slots.map(slot => ({
      method: 'getBlockTime',
      params: [slot]
    }))
    const blocktimeResponse: Blocktime[] = await this.fetchRpcBulk(
      blocktimeRequests
    )

    // Process the transactions from oldest to newest
    for (let i = txids.length - 1; i >= 0; i--) {
      this.processSolanaTransaction(
        txResponse[i].result,
        asBlocktime(blocktimeResponse[i]).result
      )
      this.otherData.newestTxid = txids[i].signature

      // Update progress
      const percent = 1 - i / txids.length
      if (percent !== this.progressRatio) {
        if (Math.abs(percent - this.progressRatio) > 0.25 || percent === 1) {
          this.progressRatio = percent
          this.tokenCheckTransactionsStatus[this.chainCode] = this.progressRatio
          this.updateOnAddressesChecked()
        }
      }
    }

    this.walletLocalDataDirty = true
    this.tokenCheckTransactionsStatus[this.chainCode] = 1
    this.updateOnAddressesChecked()

    if (this.transactionsChangedArray.length > 0) {
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
    this.addToLoop('queryFee', BLOCKCHAIN_POLL_MILLISECONDS).catch(() => {})
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
    edgeSpendInfoIn = upgradeMemos(edgeSpendInfoIn, this.currencyInfo)
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

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
        throw new InsufficientFundsError()
      }

      const balanceSol =
        this.walletLocalData.totalBalances[this.chainCode] ?? '0'
      if (gt(parentNetworkFee, balanceSol)) {
        throw new InsufficientFundsError({
          currencyCode: this.chainCode,
          networkFee: parentNetworkFee
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

    if (gt(totalTxAmount, balance)) {
      throw new InsufficientFundsError()
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
