import { getGasPriceStep } from '@chain-registry/utils'
import { decodeSignature, encodeSecp256k1Pubkey } from '@cosmjs/amino'
import { toHex } from '@cosmjs/encoding'
import {
  decodeTxRaw,
  EncodeObject,
  encodePubkey,
  makeAuthInfoBytes
} from '@cosmjs/proto-signing'
import { Coin, coin, fromTendermintEvent } from '@cosmjs/stargate'
import { fromRfc3339WithNanoseconds, toSeconds } from '@cosmjs/tendermint-rpc'
import { add, ceil, gt, lt, mul, sub } from 'biggystring'
import { Fee, SignDoc, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeMemo,
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
import { MakeTxParams } from '../common/types'
import { upgradeMemos } from '../common/upgradeMemos'
import { cleanTxLogs } from '../common/utils'
import { CosmosTools } from './CosmosTools'
import {
  asCosmosPrivateKeys,
  asCosmosTxOtherParams,
  asCosmosWalletOtherData,
  asSafeCosmosWalletInfo,
  CosmosClients,
  CosmosCoin,
  CosmosFee,
  CosmosNetworkInfo,
  CosmosOtherMethods,
  CosmosTxOtherParams,
  CosmosWalletOtherData,
  SafeCosmosWalletInfo,
  txQueryStrings
} from './cosmosTypes'
import {
  createCosmosClients,
  reduceCoinEventsForAddress,
  safeAddCoins
} from './cosmosUtils'

const ACCOUNT_POLL_MILLISECONDS = 5000
const TRANSACTION_POLL_MILLISECONDS = 3000
const TWO_WEEKS = 1000 * 60 * 60 * 24 * 14
const TWO_MINUTES = 1000 * 60 * 2

export class CosmosEngine extends CurrencyEngine<
  CosmosTools,
  SafeCosmosWalletInfo
> {
  networkInfo: CosmosNetworkInfo
  fetchCors: EdgeFetchFunction
  accountNumber: number
  sequence: number
  unconfirmedTransactionCache: {
    cacheSequence: number
    txids: Map<string, Date>
  }

  otherData!: CosmosWalletOtherData
  otherMethods: CosmosOtherMethods
  feeCache: Map<string, CosmosFee>

  constructor(
    env: PluginEnvironment<CosmosNetworkInfo>,
    tools: CosmosTools,
    walletInfo: SafeCosmosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    this.fetchCors = env.io.fetchCors
    this.accountNumber = 0
    this.sequence = 0
    this.unconfirmedTransactionCache = {
      cacheSequence: 0,
      txids: new Map()
    }
    this.feeCache = new Map()
    this.otherMethods = {
      getMaxTx: async (params: MakeTxParams) => {
        switch (params.type) {
          case 'MakeTxDeposit': {
            if (this.tools.methods.deposit == null) {
              throw new Error(
                `${this.currencyInfo.displayName} does not support the deposit method`
              )
            }

            const { assets, memo } = params

            if (assets.length !== 1) {
              throw new Error('Cannot calculate max tx for more than one asset')
            }

            const msg = this.tools.methods.deposit({
              assets,
              memo,
              signer: this.walletInfo.keys.bech32Address
            })

            const { networkFee } = await this.calculateFee({
              messages: [msg],
              memo
            })

            const balance = this.getBalance({
              currencyCode: this.currencyInfo.currencyCode
            })
            return sub(balance, networkFee)
          }
          default: {
            throw new Error(`Invalid type: ${params.type}`)
          }
        }
      },
      makeTx: async (params: MakeTxParams) => {
        switch (params.type) {
          case 'MakeTxDeposit': {
            if (this.tools.methods.deposit == null) {
              throw new Error(
                `${this.currencyInfo.displayName} does not support the deposit method`
              )
            }

            const { assets, memo, metadata } = params

            const msg = this.tools.methods.deposit({
              assets,
              memo,
              signer: this.walletInfo.keys.bech32Address
            })
            const unsignedTxHex = this.createUnsignedTxHex([msg], memo)

            const { gasFeeCoin, gasLimit, networkFee } =
              await this.calculateFee({
                messages: [msg],
                memo
              })
            const otherParams: CosmosTxOtherParams = {
              gasFeeCoin,
              gasLimit,
              unsignedTxHex
            }

            const out: EdgeTransaction = {
              blockHeight: 0, // blockHeight,
              currencyCode: this.currencyInfo.currencyCode,
              date: Date.now() / 1000,
              isSend: true,
              memos: [],
              metadata,
              nativeAmount: `-${networkFee}`,
              networkFee,
              otherParams,
              ourReceiveAddresses: [],
              signedTx: '',
              txid: '',
              walletId: this.walletId
            }
            return out
          }
          default: {
            throw new Error(`Invalid type: ${params.type}`)
          }
        }
      }
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asCosmosWalletOtherData(raw)
  }

  getClients(): CosmosClients {
    if (this.tools.clients == null) {
      throw new Error('No StargateClient')
    }
    return this.tools.clients
  }

  async queryBalance(): Promise<void> {
    try {
      const { stargateClient } = this.getClients()
      const balances = await stargateClient.getAllBalances(
        this.walletInfo.keys.bech32Address
      )
      const mainnetBal = balances.find(
        bal => bal.denom === this.networkInfo.nativeDenom
      )
      this.updateBalance(
        this.currencyInfo.currencyCode,
        mainnetBal?.amount ?? '0'
      )

      const { accountNumber, sequence } = await stargateClient.getSequence(
        this.walletInfo.keys.bech32Address
      )
      this.accountNumber = accountNumber
      this.sequence = sequence
    } catch (e) {
      if (String(e).includes('does not exist on chain')) {
        this.updateBalance(this.currencyInfo.currencyCode, '0')
      } else {
        this.log.warn('queryBalance error:', e)
      }
    }
  }

  async queryBlockheight(): Promise<void> {
    try {
      const { stargateClient } = this.getClients()
      const blockheight = await stargateClient.getHeight()
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

  async queryTransactions(): Promise<void> {
    let progress = 0
    const clients =
      Date.now() - TWO_WEEKS > this.otherData.archivedTxLastCheckTime
        ? // Uses archive rpc for first sync and then only if it's been two weeks between syncs.
          await createCosmosClients(
            this.fetchCors,
            this.networkInfo.archiveNode
          )
        : // Otherwise, uses regular rpc
          this.getClients()

    for (const query of txQueryStrings) {
      const newestTxid = await this.queryTransactionsInner(query, clients)
      if (newestTxid != null && this.otherData[query] !== newestTxid) {
        this.otherData[query] = newestTxid
        this.walletLocalDataDirty = true
      }
      progress += 0.5
      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        progress
      this.updateOnAddressesChecked()
    }
    this.otherData.archivedTxLastCheckTime = Date.now()

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async queryTransactionsInner(
    queryString: typeof txQueryStrings[number],
    clients: CosmosClients
  ): Promise<string | undefined> {
    const txSearchParams = {
      query: `${queryString}='${this.walletInfo.keys.bech32Address}'`,
      per_page: 50, // sdk default 50
      order_by: 'desc'
    }
    let newestTxid: string | undefined
    let page = 0
    let txCountTotal
    let txCount = 0
    let earlyExit = false
    try {
      do {
        const txRes = await clients.tendermintClient.txSearch({
          ...txSearchParams,
          page: ++page
        })
        const { totalCount, txs } = txRes
        if (txCountTotal == null) txCountTotal = totalCount
        txCount = txCount + txs.length

        for (const tx of txs) {
          const txidHex = toHex(tx.hash).toUpperCase()

          // update unconfirmed cache
          this.removeFromUnconfirmedCache(txidHex)

          if (newestTxid == null) {
            newestTxid = txidHex
          }

          if (txidHex === this.otherData[queryString]) {
            earlyExit = true
            break
          }

          const events = tx.result.events.map(fromTendermintEvent)
          const netBalanceChanges = reduceCoinEventsForAddress(
            events,
            this.walletInfo.keys.bech32Address
          )
          if (netBalanceChanges.length === 0) continue

          const block = await clients.stargateClient.getBlock(tx.height)
          const date = toSeconds(
            fromRfc3339WithNanoseconds(block.header.time)
          ).seconds
          const { height, tx: txRaw } = tx
          const signedTx = base16.stringify(txRaw)
          const {
            authInfo: { fee },
            body: { memo }
          } = decodeTxRaw(txRaw)
          netBalanceChanges.forEach(coin => {
            this.processCosmosTransaction(
              txidHex,
              date,
              signedTx,
              coin,
              memo,
              height,
              fee
            )
          })
        }
      } while (txCountTotal > txCount && !earlyExit)
    } catch (e) {
      this.log.warn('queryTransactions error:', e)
      throw e
    }

    return newestTxid
  }

  processCosmosTransaction(
    txidHex: string,
    date: number,
    signedTx: string,
    cosmosCoin: CosmosCoin,
    memo: string,
    height: number,
    fee?: Fee
  ): void {
    const { amount, denom } = cosmosCoin

    const isMainnet = this.networkInfo.nativeDenom === denom

    const currencyCode =
      this.networkInfo.nativeDenom === denom
        ? this.currencyInfo.currencyCode
        : this.allTokensMap[denom] != null
        ? this.allTokensMap[denom].currencyCode
        : undefined
    if (currencyCode == null) return

    let networkFee = this.networkInfo.defaultTransactionFee?.amount ?? '0'
    if (fee != null) {
      const { amount } = fee
      const networkFeeCoin = safeAddCoins([
        coin('0', this.networkInfo.nativeDenom),
        ...amount
      ])
      networkFee = add(networkFee, networkFeeCoin.amount)
    }

    const isSend = lt(amount, '0')
    const ourReceiveAddresses: string[] = []

    let nativeAmount = amount
    let parentNetworkFee: string | undefined
    if (isSend) {
      if (isMainnet) {
        nativeAmount = sub(nativeAmount, networkFee)
      } else {
        networkFee = '0'
        parentNetworkFee = networkFee
      }
    } else {
      ourReceiveAddresses.push(this.walletInfo.keys.bech32Address)
      networkFee = '0'
    }

    const memos: EdgeMemo[] = []
    if (memo !== '') {
      memos.push({
        type: 'text',
        value: memo
      })
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: height,
      currencyCode,
      date,
      isSend,
      memos,
      nativeAmount,
      networkFee,
      ourReceiveAddresses,
      parentNetworkFee,
      signedTx,
      txid: txidHex,
      walletId: this.walletId
    }
    this.addTransaction(currencyCode, edgeTransaction)
  }

  private createUnsignedTxHex(messages: EncodeObject[], memo?: string): string {
    const body = TxBody.fromPartial({ messages, memo })
    const bodyBytes = TxBody.encode(body).finish()
    const unsignedTxRaw = TxRaw.fromPartial({
      bodyBytes
    })

    return base16.stringify(TxRaw.encode(unsignedTxRaw).finish())
  }

  private addToUnconfirmedCache(txid: string): void {
    const twoMinutesFromNow = new Date(new Date().getTime() + TWO_MINUTES)
    if (this.unconfirmedTransactionCache.txids.size === 0) {
      this.unconfirmedTransactionCache.cacheSequence = this.sequence
    }
    this.unconfirmedTransactionCache.txids.set(txid, twoMinutesFromNow)
  }

  private removeFromUnconfirmedCache(txid: string): void {
    if (this.unconfirmedTransactionCache.txids.has(txid)) {
      this.unconfirmedTransactionCache.cacheSequence =
        this.unconfirmedTransactionCache.cacheSequence + 1
      this.sequence = this.unconfirmedTransactionCache.cacheSequence
      this.unconfirmedTransactionCache.txids.delete(txid)
    }
  }

  private getSequence(): number {
    if (this.unconfirmedTransactionCache.txids.size === 0) {
      return this.sequence
    } else {
      // If cache has any expired transactions, trash it and use the sequence
      if (
        [...this.unconfirmedTransactionCache.txids.values()].some(
          expiration => expiration < new Date()
        )
      ) {
        this.unconfirmedTransactionCache.txids = new Map()
        return this.sequence
      }

      // Otherwise calculate sequence from pending txids
      return (
        this.unconfirmedTransactionCache.cacheSequence +
        this.unconfirmedTransactionCache.txids.size
      )
    }
  }

  private async calculateFee(opts: {
    messages: EncodeObject[]
    memo?: string
    networkFeeOption?: EdgeSpendInfo['networkFeeOption']
  }): Promise<CosmosFee> {
    let gasFeeCoin = coin('0', this.networkInfo.nativeDenom)
    let gasLimit = '0'
    let networkFee = '0'
    if (this.networkInfo.defaultTransactionFee == null) {
      const { messages, memo, networkFeeOption } = opts
      const { queryClient } = this.getClients()
      const { gasInfo } = await queryClient.tx.simulate(
        messages,
        memo,
        encodeSecp256k1Pubkey(base16.parse(this.walletInfo.keys.publicKey)),
        this.getSequence()
      )
      if (gasInfo?.gasUsed == null) {
        throw new Error(`simulate didn't return gasUsed `)
      }
      // The simulate endpoint is imperfect and under-estimates. It's typical to use 1.5x the estimated amount
      gasLimit = ceil(mul(gasInfo?.gasUsed.toString(), '1.5'), 0)

      const { low, average, high } = getGasPriceStep(this.tools.chainData)

      let gasPrice = average
      switch (networkFeeOption) {
        case 'low': {
          gasPrice = low
          break
        }
        case 'high': {
          gasPrice = high
          break
        }
        case 'custom': {
          throw new Error('Custom fee not supported')
        }
      }

      const gasFee = ceil(mul(gasLimit, gasPrice.toString()), 0)
      gasFeeCoin = coin(gasFee, this.networkInfo.nativeDenom)
      networkFee = gasFeeCoin.amount
    } else {
      networkFee = this.networkInfo.defaultTransactionFee.amount
    }
    return {
      gasFeeCoin,
      gasLimit,
      networkFee
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    await this.tools.connectClient()
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop('queryBlockheight', ACCOUNT_POLL_MILLISECONDS).catch(
      () => {}
    )
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

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    edgeSpendInfoIn = upgradeMemos(edgeSpendInfoIn, this.currencyInfo)
    const { edgeSpendInfo, currencyCode, nativeBalance } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], networkFeeOption } = edgeSpendInfo
    const memo: string | undefined = memos[0]?.value

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { nativeAmount, publicAddress } = edgeSpendInfo.spendTargets[0]
    if (nativeAmount == null) throw new NoAmountSpecifiedError()
    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')

    // Encode a send message.
    const msg = this.tools.methods.transfer({
      amount: [coin(nativeAmount, this.networkInfo.nativeDenom)],
      fromAddress: this.walletInfo.keys.bech32Address,
      toAddress: publicAddress
    })

    let gasFeeCoin: Coin
    let gasLimit: string
    let networkFee: string
    const feeCacheKey = `${publicAddress}${String(networkFeeOption)}`
    const feeCacheFees = this.feeCache.get(feeCacheKey)
    if (nativeAmount === '0') {
      gasFeeCoin = coin('0', this.networkInfo.nativeDenom)
      gasLimit = '0'
      networkFee = '0'
    } else if (feeCacheFees == null) {
      const fees = await this.calculateFee({
        messages: [msg],
        memo,
        networkFeeOption
      })
      gasFeeCoin = fees.gasFeeCoin
      gasLimit = fees.gasLimit
      networkFee = fees.networkFee
      this.feeCache.set(feeCacheKey, fees)
    } else {
      gasFeeCoin = feeCacheFees.gasFeeCoin
      gasLimit = feeCacheFees.gasLimit
      networkFee = feeCacheFees.networkFee
    }

    const totalNativeAmount = add(nativeAmount, networkFee)
    if (gt(totalNativeAmount, nativeBalance)) {
      throw new InsufficientFundsError()
    }

    const unsignedTxHex = this.createUnsignedTxHex([msg], memo)

    const otherParams: CosmosTxOtherParams = {
      gasFeeCoin,
      gasLimit,
      unsignedTxHex
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: `-${totalNativeAmount}`,
      networkFee,
      otherParams,
      ourReceiveAddresses: [],
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
    const { gasFeeCoin, gasLimit, unsignedTxHex } = asCosmosTxOtherParams(
      edgeTransaction.otherParams
    )
    const keys = asCosmosPrivateKeys(this.currencyInfo.pluginId)(privateKeys)
    const txRawBytes = base16.parse(unsignedTxHex)
    const { bodyBytes } = TxRaw.decode(txRawBytes)

    const senderPubkeyBytes = base16.parse(this.walletInfo.keys.publicKey)
    const senderPubkey = encodeSecp256k1Pubkey(senderPubkeyBytes)
    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey: encodePubkey(senderPubkey), sequence: this.getSequence() }],
      [gasFeeCoin], // fee, but for thorchain the fee doesn't need to be defined and is automatically pulled from account
      parseInt(gasLimit), // gasLimit
      undefined, // feeGranter
      undefined, // feePayer (defaults to first signer)
      1 // signMode
    )

    const signDoc = SignDoc.fromPartial({
      accountNumber: this.accountNumber,
      authInfoBytes,
      bodyBytes,
      chainId: this.tools.chainData.chain_id
    })
    const signer = await this.tools.createSigner(keys.mnemonic)
    const signResponse = await signer.signDirect(
      this.walletInfo.keys.bech32Address,
      signDoc
    )
    const decodedSignature = decodeSignature(signResponse.signature)
    const signedTxRaw = TxRaw.fromPartial({
      authInfoBytes,
      bodyBytes,
      signatures: [decodedSignature.signature]
    })
    const signedTxBytes = TxRaw.encode(signedTxRaw).finish()
    const signedTxHex = base16.stringify(signedTxBytes)
    edgeTransaction.signedTx = signedTxHex
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    try {
      const signedTxBytes = base16.parse(edgeTransaction.signedTx)
      const { stargateClient } = this.getClients()
      const txid = await stargateClient.broadcastTxSync(signedTxBytes)
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)

      edgeTransaction.txid = txid
      edgeTransaction.date = Date.now() / 1000

      // add to unconfirmed cache
      this.addToUnconfirmedCache(txid)

      return edgeTransaction
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
  }

  async getFreshAddress(_options: any): Promise<EdgeFreshAddress> {
    const { bech32Address } = this.walletInfo.keys

    return {
      publicAddress: bech32Address
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<CosmosNetworkInfo>,
  tools: CosmosTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeCosmosWalletInfo(walletInfo)
  const engine = new CosmosEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
