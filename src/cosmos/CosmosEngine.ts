import { getGasPriceStep } from '@chain-registry/utils'
import { decodeSignature, encodeSecp256k1Pubkey } from '@cosmjs/amino'
import { toHex } from '@cosmjs/encoding'
import {
  decodeTxRaw,
  EncodeObject,
  encodePubkey,
  makeAuthInfoBytes
} from '@cosmjs/proto-signing'
import { Coin, coin, parseCoins } from '@cosmjs/stargate'
import { parseRawLog } from '@cosmjs/stargate/build/logs'
import {
  fromRfc3339WithNanoseconds,
  toSeconds,
  TxResponse
} from '@cosmjs/tendermint-rpc'
import { add, ceil, gt, mul } from 'biggystring'
import { asMaybe } from 'cleaners'
import { SignDoc, TxBody, TxRaw } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
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
  asTransfer,
  CosmosClients,
  CosmosFee,
  CosmosNetworkInfo,
  CosmosOtherMethods,
  CosmosTxOtherParams,
  CosmosWalletOtherData,
  SafeCosmosWalletInfo,
  TransferEvent,
  txQueryStrings
} from './cosmosTypes'
import { safeAddCoins } from './cosmosUtils'

const ACCOUNT_POLL_MILLISECONDS = 5000
const TRANSACTION_POLL_MILLISECONDS = 3000

export class CosmosEngine extends CurrencyEngine<
  CosmosTools,
  SafeCosmosWalletInfo
> {
  networkInfo: CosmosNetworkInfo
  accountNumber: number
  sequence: number
  otherData!: CosmosWalletOtherData
  otherMethods: CosmosOtherMethods

  constructor(
    env: PluginEnvironment<CosmosNetworkInfo>,
    tools: CosmosTools,
    walletInfo: SafeCosmosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    this.accountNumber = 0
    this.sequence = 0
    this.otherMethods = {
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
    for (const query of txQueryStrings) {
      const newestTxid = await this.queryTransactionsInner(query)
      if (newestTxid != null && this.otherData[query] !== newestTxid) {
        this.otherData[query] = newestTxid
        this.walletLocalDataDirty = true
      }
      progress += 0.5
      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        progress
      this.updateOnAddressesChecked()
    }

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async queryTransactionsInner(
    queryString: typeof txQueryStrings[number]
  ): Promise<string | undefined> {
    const { stargateClient, tendermintClient } = this.getClients()

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
        const txRes = await tendermintClient.txSearch({
          ...txSearchParams,
          page: ++page
        })
        const { totalCount, txs } = txRes
        if (txCountTotal == null) txCountTotal = totalCount
        txCount = txCount + txs.length

        for (const tx of txs) {
          const txidHex = toHex(tx.hash).toUpperCase()
          if (newestTxid == null) {
            newestTxid = txidHex
          }

          if (txidHex === this.otherData[queryString]) {
            earlyExit = true
            break
          }

          // The bank module emits 'transfer' events with sender, recipient, and coins
          const transferEvents: TransferEvent[] = []
          const parsedLogs = parseRawLog(tx.result.log)
          parsedLogs.forEach(log => {
            log.events.forEach(event => {
              const transferEvent = asMaybe(asTransfer)(event)
              if (transferEvent == null) return
              const [recipient, sender, amount] = transferEvent.attributes

              const coins = parseCoins(amount.value)
              coins.forEach(coin => {
                transferEvents.push({
                  sender: sender.value,
                  recipient: recipient.value,
                  coin
                })
              })
            })
          })
          if (transferEvents.length === 0) continue

          const block = await stargateClient.getBlock(tx.height)
          const date = toSeconds(
            fromRfc3339WithNanoseconds(block.header.time)
          ).seconds
          transferEvents.forEach(event => {
            this.processCosmosTransaction(txidHex, date, event, tx)
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
    event: TransferEvent,
    tx: TxResponse
  ): void {
    const { height, tx: txRaw } = tx
    const signedTx = base16.stringify(txRaw)
    const {
      authInfo: { fee },
      body: { memo }
    } = decodeTxRaw(txRaw)

    let networkFee = this.networkInfo.defaultTransactionFee?.amount ?? '0'
    if (fee != null) {
      const { amount } = fee
      const networkFeeCoin = safeAddCoins([
        coin('0', this.networkInfo.nativeDenom),
        ...amount
      ])
      networkFee = add(networkFee, networkFeeCoin.amount)
    }

    const { coin: eventCoin, recipient, sender } = event

    if (
      (this.walletInfo.keys.bech32Address !== recipient &&
        this.walletInfo.keys.bech32Address !== sender) ||
      this.networkInfo.nativeDenom !== eventCoin.denom
    ) {
      return
    }
    const isSend = this.walletInfo.keys.bech32Address === sender
    const ourReceiveAddresses: string[] = []

    let nativeAmount = eventCoin.amount
    const currencyCode = this.currencyInfo.currencyCode
    if (isSend) {
      nativeAmount = `-${add(nativeAmount, networkFee)}`
    } else {
      ourReceiveAddresses.push(this.walletInfo.keys.bech32Address)
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
        this.sequence
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

    let gasFeeCoin: Coin = coin('0', this.networkInfo.nativeDenom)
    let gasLimit = '0'
    let networkFee = '0'
    if (nativeAmount !== '0') {
      const fees = await this.calculateFee({
        messages: [msg],
        memo,
        networkFeeOption
      })
      gasFeeCoin = fees.gasFeeCoin
      gasLimit = fees.gasLimit
      networkFee = fees.networkFee
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
      [{ pubkey: encodePubkey(senderPubkey), sequence: this.sequence }],
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
      chainId: this.networkInfo.chainId
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
