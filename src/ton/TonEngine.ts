import { mnemonicToPrivateKey } from '@ton/crypto'
import {
  Address,
  beginCell,
  Cell,
  external,
  fromNano,
  internal,
  loadMessageRelaxed,
  MessageRelaxed,
  SendMode,
  storeMessage,
  storeMessageRelaxed,
  TonClient,
  WalletContractV5R1
} from '@ton/ton'
import { add, gt, lt, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFreshAddress,
  EdgeLog,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16, base64 } from 'rfc4648'
import { parse_tx } from 'ton-watcher/build/modules/txs/Transaction'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { asyncWaterfall, promiseAny } from '../common/promiseUtils'
import { asSafeCommonWalletInfo, SafeCommonWalletInfo } from '../common/types'
import { snooze } from '../common/utils'
import { TonTools } from './TonTools'
import {
  asParsedTx,
  asTonPrivateKeys,
  asTonTxOtherParams,
  asTonWalletOtherData,
  ParsedTx,
  TonNetworkInfo,
  TonWalletOtherData
} from './tonTypes'

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class TonEngine extends CurrencyEngine<TonTools, SafeCommonWalletInfo> {
  log: EdgeLog
  networkInfo: TonNetworkInfo
  otherData!: TonWalletOtherData

  wallet: WalletContractV5R1
  archiveTransactions: boolean

  constructor(
    env: PluginEnvironment<TonNetworkInfo>,
    tools: TonTools,
    walletInfo: SafeCommonWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    this.log = env.log

    this.wallet = WalletContractV5R1.create({
      publicKey: Buffer.from(base16.parse(walletInfo.keys.publicKey))
    })

    // Only the first query needs to use archive nodes
    this.archiveTransactions = true
  }

  setOtherData(raw: any): void {
    this.otherData = asTonWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    try {
      const clients = this.tools.getOrbsClients()
      const funcs = clients.map(client => async () => {
        return await client.getContractState(this.wallet.address)
      })
      const contractState: Awaited<ReturnType<TonClient['getContractState']>> =
        await asyncWaterfall(funcs)

      this.updateBalance(
        this.currencyInfo.currencyCode,
        contractState.balance.toString()
      )

      if (contractState.state !== this.otherData.contractState) {
        this.otherData.contractState = contractState.state
        this.walletLocalDataDirty = true
      }
    } catch (e) {
      this.log.warn('queryBalance error:', e)
    }
  }

  async queryTransactions(): Promise<void> {
    // Transactions can only be queried newest to oldest.
    const clients = this.tools.getTonCenterClients()

    // Both of these params must be included to filter results. They should be undefined to start at the most recent.
    let inLoopLogicalTime: string | undefined
    let inLoopHash: string | undefined

    // Save the most recent transaction (first seen) in otherData
    let mostRecentLogicalTime: undefined | string
    let mostRecentHash: undefined | string
    while (true) {
      const funcs = clients.map(client => async () => {
        return await client.getTransactions(this.wallet.address, {
          limit: 50,
          lt: inLoopLogicalTime,
          hash: inLoopHash,
          inclusive: false,
          archival: true // must always be true, because ton center reasons
        })
      })
      try {
        const transactions: Awaited<ReturnType<TonClient['getTransactions']>> =
          await asyncWaterfall(funcs)

        let breakWhileLoop = false
        for (const tx of transactions) {
          inLoopLogicalTime = tx.lt.toString()
          inLoopHash = base64.stringify(tx.hash())
          if (mostRecentLogicalTime == null && mostRecentHash == null) {
            mostRecentLogicalTime = inLoopLogicalTime
            mostRecentHash = inLoopHash
          }

          if (
            inLoopLogicalTime === this.otherData.mostRecentLogicalTime &&
            inLoopHash === this.otherData.mostRecentHash
          ) {
            breakWhileLoop = true
            break
          }

          try {
            const parsedTx = asParsedTx(parse_tx(tx, false))
            this.processTonTransaction(parsedTx)
          } catch (e) {
            // unknown transaction type
          }
        }
        if (breakWhileLoop || transactions.length === 0) break
      } catch (e) {
        this.log.warn('queryTransactions error:', e)
      }
    }

    this.archiveTransactions = false
    this.otherData.mostRecentLogicalTime = mostRecentLogicalTime
    this.otherData.mostRecentHash = mostRecentHash

    if (this.transactionEvents.length > 0) {
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onTransactions(this.transactionEvents)
      this.transactionEvents = []
    }

    this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] = 1
    this.updateOnAddressesChecked()
  }

  processTonTransaction(tx: ParsedTx): void {
    const memos: EdgeMemo[] = []
    const ourReceiveAddresses = new Set<string>()
    let nativeAmount: string = '0'

    for (const message of [tx.inMessage, ...tx.outMessages]) {
      const { message: memo } = message
      // Currently, we only parse memos using 0x0 op_code
      if (memo != null && memo !== '') {
        memos.push({
          type: 'text',
          value: memo
        })
      }

      if (message.value == null) continue

      if (
        message.sender != null &&
        Address.parse(message.sender).equals(this.wallet.address)
      ) {
        nativeAmount = sub(nativeAmount, message.value.toString())
      } else if (Address.parse(message.recipient).equals(this.wallet.address)) {
        nativeAmount = add(nativeAmount, message.value.toString())
        ourReceiveAddresses.add(
          this.wallet.address.toString({ bounceable: false })
        )
      }
    }

    const networkFee = tx.originalTx.totalFees.coins.toString()
    if (lt(nativeAmount, '0')) {
      nativeAmount = sub(nativeAmount, networkFee)
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 1, // This isn't readily accessible from the TonClient and isn't important if we just mark it confirmed
      confirmations: 'confirmed',
      currencyCode: this.currencyInfo.currencyCode,
      date: tx.now,
      isSend: false,
      nativeAmount: nativeAmount,
      networkFee,
      networkFees: [],
      memos,
      ourReceiveAddresses: [...ourReceiveAddresses],
      tokenId: null,
      txid: tx.hash,
      signedTx: '',
      walletId: this.walletId
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.addToLoop('queryBalance', ADDRESS_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop('queryTransactions', ADDRESS_POLL_MILLISECONDS).catch(
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
    // TON allows sending the entire balance but we need to be able to craft the entire transaction here instead of just an amount
    const spendInfoCopy = { ...spendInfo }

    const balance = this.getBalance({ tokenId: spendInfoCopy.tokenId })
    spendInfoCopy.spendTargets[0].nativeAmount = balance
    spendInfoCopy.skipChecks = true

    const edgeTransaction = await this.makeSpend(spendInfoCopy)
    return sub(
      sub(balance, this.networkInfo.minimumAddressBalance),
      edgeTransaction.networkFee
    )
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo
    const memo: string | undefined = memos[0]?.value

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { nativeAmount, publicAddress } = edgeSpendInfo.spendTargets[0]
    if (nativeAmount == null) throw new NoAmountSpecifiedError()
    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }

    let memoCell: Cell | undefined
    if (memo != null) {
      memoCell = beginCell().storeUint(0, 32).storeStringTail(memo).endCell()
    }

    const needsInit = this.otherData.contractState === 'uninitialized'

    const transferMessage: MessageRelaxed = internal({
      value: fromNano(nativeAmount),
      to: Address.parse(publicAddress),
      body: memoCell,
      init: needsInit ? this.wallet.init : null,
      bounce: false
    })

    const transferArgs: Parameters<WalletContractV5R1['createTransfer']>[0] = {
      sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
      messages: [transferMessage],

      // Fake data that doesn't impact fee calc
      seqno: 0,
      secretKey: Buffer.alloc(64)
    }
    const transfer = this.wallet.createTransfer(transferArgs)

    const clients = this.tools.getOrbsClients()
    const feeFuncs = clients.map(client => async () => {
      return await client.estimateExternalMessageFee(this.wallet.address, {
        body: transfer,
        initCode: needsInit ? this.wallet.init.code : null,
        initData: needsInit ? this.wallet.init.data : null,
        ignoreSignature: false
      })
    })
    const fees: Awaited<ReturnType<TonClient['estimateExternalMessageFee']>> =
      await asyncWaterfall(feeFuncs)

    const totalFee =
      fees.source_fees.fwd_fee +
      fees.source_fees.gas_fee +
      fees.source_fees.in_fwd_fee +
      fees.source_fees.storage_fee
    const networkFee = totalFee.toString()

    const total = add(nativeAmount, networkFee)
    const balance = this.getBalance({ tokenId })
    if (
      edgeSpendInfoIn.skipChecks !== true &&
      gt(add(total, this.networkInfo.minimumAddressBalance), balance)
    ) {
      throw new InsufficientFundsError({
        tokenId: null
      })
    }

    // Serialize transferMessage
    const builder = beginCell()
    storeMessageRelaxed(transferMessage)(builder)
    const messageSlice = builder.asSlice()
    const otherParams = {
      unsignedTxBase64: base64.stringify(messageSlice.asCell().toBoc())
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: `-${add(nativeAmount, networkFee)}`,
      networkFee,
      networkFees: [],
      otherParams,
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
    const { unsignedTxBase64 } = asTonTxOtherParams(edgeTransaction.otherParams)
    const keys = asTonPrivateKeys(this.currencyInfo.pluginId)(privateKeys)
    const keyPair = await mnemonicToPrivateKey(keys.mnemonic.split(' '))

    const messageSlice = Cell.fromBoc(
      Buffer.from(base64.parse(unsignedTxBase64))
    )[0].asSlice()
    const transferMessage = loadMessageRelaxed(messageSlice)

    const clients = this.tools.getOrbsClients()
    const seqnoFuncs = clients.map(client => async () => {
      const contract = client.open(this.wallet)
      return await contract.getSeqno()
    })
    const seqno: Awaited<ReturnType<typeof this.wallet['getSeqno']>> =
      await asyncWaterfall(seqnoFuncs)

    const transferArgs: Parameters<WalletContractV5R1['createTransfer']>[0] = {
      sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
      messages: [transferMessage],
      seqno,
      secretKey: keyPair.secretKey
    }
    const transfer = this.wallet.createTransfer(transferArgs)
    const signedTx = base64.stringify(transfer.toBoc())

    edgeTransaction.signedTx = signedTx
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    try {
      const txBoc = base64.parse(edgeTransaction.signedTx)
      const txCell = Cell.fromBoc(Buffer.from(txBoc))[0]

      const clients = this.tools.getOrbsClients()
      const broadcastFuncs = clients.map(async client => {
        const contract = client.open(this.wallet)
        return await contract.send(txCell)
      })
      await promiseAny(broadcastFuncs)

      if (this.otherData.contractState === 'uninitialized') {
        // It's not possible to calculate the txid for a wallet's first send so we need to look for it once it's confirmed
        let attempts = 0
        do {
          attempts++
          await snooze(1000)
          const txidFuncs = clients.map(client => async () => {
            return await client.getTransactions(this.wallet.address, {
              limit: 50
            })
          })
          const transactions: Awaited<
            ReturnType<TonClient['getTransactions']>
          > = await asyncWaterfall(txidFuncs)

          const tx = transactions.find(tx => {
            return tx.oldStatus === 'uninitialized' && tx.endStatus === 'active'
          })
          if (tx != null) {
            const txid = base16.stringify(tx.hash()).toLowerCase()
            edgeTransaction.txid = txid
            edgeTransaction.date = Date.now() / 1000
            this.otherData.contractState = 'active'
            this.walletLocalDataDirty = true
            return edgeTransaction
          }
        } while (attempts <= 30) // In testing, the tx was found after ~10 seconds
        throw new Error('Transaction broadcast but unable to find txid')
      } else {
        // We can calculate the txid from the signedTx
        const externalMessage = external({
          to: this.wallet.address,
          body: txCell
        })
        const externalBoc = beginCell()
          .store(storeMessage(externalMessage))
          .endCell()
        const txid = base16.stringify(externalBoc.hash()).toLowerCase()
        edgeTransaction.txid = txid
        edgeTransaction.date = Date.now() / 1000
        return edgeTransaction
      }
    } catch (e) {
      this.log.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
  }

  async getFreshAddress(): Promise<EdgeFreshAddress> {
    const publicAddress = this.wallet.address.toString({ bounceable: false })
    return { publicAddress }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<TonNetworkInfo>,
  tools: TonTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeCommonWalletInfo(walletInfo)

  const engine = new TonEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
