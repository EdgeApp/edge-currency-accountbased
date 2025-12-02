import { mnemonicToPrivateKey } from '@ton/crypto'
import {
  Address,
  beginCell,
  Cell,
  external,
  fromNano,
  internal,
  JettonMaster,
  JettonWallet,
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
import {
  asyncWaterfall,
  formatAggregateError,
  promiseAny
} from '../common/promiseUtils'
import { asMaybeContractLocation } from '../common/tokenHelpers'
import { asSafeCommonWalletInfo, SafeCommonWalletInfo } from '../common/types'
import { snooze } from '../common/utils'
import { TonTools } from './TonTools'
import {
  asParsedTx,
  asTonPrivateKeys,
  asTonTxOtherParams,
  asTonWalletOtherData,
  JETTON_INTERNAL_TRANSFER_OP,
  JETTON_TRANSFER_NOTIFICATION_OP,
  JETTON_TRANSFER_OP,
  ParsedTx,
  TonNetworkInfo,
  TonWalletOtherData
} from './tonTypes'

/** Cached mapping of JettonWallet address (raw format) to tokenId */
interface JettonWalletCache {
  [walletAddressRaw: string]: string // tokenId
}

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class TonEngine extends CurrencyEngine<TonTools, SafeCommonWalletInfo> {
  log: EdgeLog
  networkInfo: TonNetworkInfo
  otherData!: TonWalletOtherData

  wallet: WalletContractV5R1
  archiveTransactions: boolean

  // Cache of our JettonWallet addresses for each token
  // Key: raw address format, Value: tokenId
  jettonWalletCache: JettonWalletCache = {}
  // Reverse lookup: tokenId -> JettonWallet address (raw format)
  tokenIdToJettonWallet: Map<string, string> = new Map()

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
      const funcs = clients.map(async client => {
        return await client.getContractState(this.wallet.address)
      })
      const contractState: Awaited<ReturnType<TonClient['getContractState']>> =
        await promiseAny(funcs)

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

  /**
   * Query balances for all enabled jetton tokens.
   * For each token:
   * 1. Get the JettonMaster contract
   * 2. Query our JettonWallet address from the master
   * 3. Query the balance from our JettonWallet
   */
  async queryJettonBalances(): Promise<void> {
    const detectedTokenIds: string[] = []

    for (const tokenId of this.enabledTokenIds) {
      try {
        const token = this.allTokensMap[tokenId]
        if (token == null) continue

        const networkLocation = asMaybeContractLocation(token.networkLocation)
        if (networkLocation == null) continue

        const { contractAddress } = networkLocation
        const jettonMasterAddress = Address.parse(contractAddress)

        // Get a client and query the jetton wallet address
        const clients = this.tools.getOrbsClients()

        // Query our JettonWallet address from the JettonMaster
        const walletAddressFuncs = clients.map(async client => {
          const jettonMaster = client.open(
            JettonMaster.create(jettonMasterAddress)
          )
          return await jettonMaster.getWalletAddress(this.wallet.address)
        })

        let jettonWalletAddress: Address
        try {
          jettonWalletAddress = await promiseAny(walletAddressFuncs)

          // Cache the JettonWallet address for transaction detection
          const walletAddressRaw = `${
            jettonWalletAddress.workChain
          }:${jettonWalletAddress.hash.toString('hex')}`
          this.jettonWalletCache[walletAddressRaw] = tokenId
          this.tokenIdToJettonWallet.set(tokenId, walletAddressRaw)
        } catch (e: unknown) {
          // JettonMaster might not exist or be invalid
          this.log.warn(
            `Failed to get jetton wallet address for ${token.currencyCode}:`,
            e
          )
          this.updateBalance(token.currencyCode, '0')
          continue
        }

        // Query the balance from our JettonWallet
        const balanceFuncs = clients.map(async client => {
          const jettonWallet = client.open(
            JettonWallet.create(jettonWalletAddress)
          )
          return await jettonWallet.getBalance()
        })

        try {
          const balance = await promiseAny(balanceFuncs)
          const balanceStr = balance.toString()
          this.updateBalance(token.currencyCode, balanceStr)

          if (gt(balanceStr, '0')) {
            detectedTokenIds.push(tokenId)
          }
        } catch (e: unknown) {
          // JettonWallet might not exist (user has never received this token)
          this.updateBalance(token.currencyCode, '0')
        }
      } catch (e: unknown) {
        this.log.warn(`queryJettonBalances error for tokenId ${tokenId}:`, e)
      }
    }

    // Notify about detected tokens
    if (detectedTokenIds.length > 0) {
      this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
    }
  }

  /**
   * Query transactions for all enabled jetton tokens.
   * We query transactions on each of our JettonWallet contracts.
   */
  async queryJettonTransactions(): Promise<void> {
    // Make sure we have the JettonWallet addresses cached
    if (this.tokenIdToJettonWallet.size === 0) {
      // Balance query not completed yet, skip for now
      return
    }

    for (const tokenId of this.enabledTokenIds) {
      const jettonWalletRaw = this.tokenIdToJettonWallet.get(tokenId)
      if (jettonWalletRaw == null) continue

      const token = this.allTokensMap[tokenId]
      if (token == null) continue

      try {
        await this.queryJettonTransactionsForToken(tokenId, jettonWalletRaw)
      } catch (e: unknown) {
        this.log.warn(
          `queryJettonTransactions error for ${token.currencyCode}:`,
          e
        )
      }
    }

    this.sendTransactionEvents()
    this.updateOnAddressesChecked()
  }

  /**
   * Query transactions for a specific jetton token.
   */
  private async queryJettonTransactionsForToken(
    tokenId: string,
    jettonWalletRaw: string
  ): Promise<void> {
    const token = this.allTokensMap[tokenId]
    if (token == null) return

    const clients = this.tools.getTonCenterClients()
    const jettonWalletAddress = Address.parse(jettonWalletRaw)

    // Get checkpoints for this token
    let inLoopLogicalTime: string | undefined
    let inLoopHash: string | undefined
    let mostRecentLogicalTime: string | undefined
    let mostRecentHash: string | undefined

    while (true) {
      const funcs = clients.map(client => async () => {
        return await client.getTransactions(jettonWalletAddress, {
          limit: 50,
          lt: inLoopLogicalTime,
          hash: inLoopHash,
          inclusive: false,
          archival: true
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

          // Check if we've reached the last known transaction
          const savedLogicalTime =
            this.otherData.jettonMostRecentLogicalTime[tokenId]
          const savedHash = this.otherData.jettonMostRecentHash[tokenId]
          if (
            inLoopLogicalTime === savedLogicalTime &&
            inLoopHash === savedHash
          ) {
            breakWhileLoop = true
            break
          }

          // Process the jetton transaction
          this.processJettonTransaction(tx, tokenId, token.currencyCode)
        }

        if (breakWhileLoop || transactions.length === 0) break
      } catch (e: unknown) {
        this.log.warn(
          `queryJettonTransactionsForToken error for ${token.currencyCode}:`,
          e
        )
        break
      }
    }

    // Save checkpoints
    if (mostRecentLogicalTime != null && mostRecentHash != null) {
      this.otherData.jettonMostRecentLogicalTime[tokenId] =
        mostRecentLogicalTime
      this.otherData.jettonMostRecentHash[tokenId] = mostRecentHash
      this.walletLocalDataDirty = true
    }

    this.tokenCheckTransactionsStatus[token.currencyCode] = 1
  }

  /**
   * Process a transaction on a JettonWallet contract.
   * Parse the message body to extract jetton transfer details.
   */
  private processJettonTransaction(
    tx: Awaited<ReturnType<TonClient['getTransactions']>>[number],
    tokenId: string,
    currencyCode: string
  ): void {
    try {
      const timestamp = tx.now
      const txid = base16.stringify(tx.hash()).toLowerCase()
      const networkFee = tx.totalFees.coins.toString()

      // Parse the incoming message to determine the operation
      const inMsg = tx.inMessage
      if (inMsg == null || inMsg.body == null) return

      const bodySlice = inMsg.body.beginParse()
      if (bodySlice.remainingBits < 32) return

      const opcode = bodySlice.loadUint(32)

      let nativeAmount = '0'
      let isSend = false
      const ourReceiveAddresses: string[] = []

      // Handle internal_transfer (incoming jettons)
      if (opcode === JETTON_INTERNAL_TRANSFER_OP) {
        // internal_transfer: query_id:uint64 amount:Coins from:MsgAddress ...
        bodySlice.skip(64) // query_id
        const amount = bodySlice.loadCoins()

        nativeAmount = amount.toString()
        isSend = false
        ourReceiveAddresses.push(
          this.wallet.address.toString({ bounceable: false })
        )
      }
      // Handle transfer (outgoing jettons - we see this on our wallet's outbound msg)
      else if (opcode === JETTON_TRANSFER_OP) {
        // transfer: query_id:uint64 amount:Coins destination:MsgAddress ...
        bodySlice.skip(64) // query_id
        const amount = bodySlice.loadCoins()

        nativeAmount = `-${amount.toString()}`
        isSend = true
      }
      // Handle transfer_notification (notification of received jettons)
      else if (opcode === JETTON_TRANSFER_NOTIFICATION_OP) {
        // transfer_notification: query_id:uint64 amount:Coins sender:MsgAddress ...
        bodySlice.skip(64) // query_id
        const amount = bodySlice.loadCoins()

        nativeAmount = amount.toString()
        isSend = false
        ourReceiveAddresses.push(
          this.wallet.address.toString({ bounceable: false })
        )
      } else {
        // Unknown opcode, skip
        return
      }

      if (nativeAmount === '0') return

      const edgeTransaction: EdgeTransaction = {
        blockHeight: 1,
        confirmations: 'confirmed',
        currencyCode,
        date: timestamp,
        isSend,
        nativeAmount,
        // Token transactions: fee is in TON (parent), not in the token
        networkFee: '0',
        networkFees: isSend
          ? [{ tokenId: null, nativeAmount: networkFee }]
          : [],
        parentNetworkFee: isSend ? networkFee : undefined,
        memos: [],
        ourReceiveAddresses,
        tokenId,
        txid,
        signedTx: '',
        walletId: this.walletId
      }

      this.addTransaction(currencyCode, edgeTransaction)
    } catch (e: unknown) {
      // Failed to parse transaction, skip it
      this.log.warn('processJettonTransaction parse error:', e)
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

    this.sendTransactionEvents()
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

    let isSend = false
    const networkFee = tx.originalTx.totalFees.coins.toString()
    if (lt(nativeAmount, '0')) {
      nativeAmount = sub(nativeAmount, networkFee)
      isSend = true
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 1, // This isn't readily accessible from the TonClient and isn't important if we just mark it confirmed
      confirmations: 'confirmed',
      currencyCode: this.currencyInfo.currencyCode,
      date: tx.now,
      isSend,
      nativeAmount: nativeAmount,
      networkFee,
      networkFees: [{ tokenId: null, nativeAmount: networkFee }],
      memos,
      ourReceiveAddresses: [...ourReceiveAddresses],
      tokenId: null,
      txid: tx.hash,
      signedTx: '',
      walletId: this.walletId
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  getTxCheckpoint(edgeTransaction: EdgeTransaction): string {
    return edgeTransaction.date.toString()
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.addToLoop('queryBalance', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('queryJettonBalances', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', ADDRESS_POLL_MILLISECONDS)
    this.addToLoop('queryJettonTransactions', ADDRESS_POLL_MILLISECONDS)
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

    let networkFee = '0'
    if (nativeAmount !== '0') {
      // Only estimate fee if we're sending something
      const clients = this.tools.getOrbsClients()
      const feeFuncs = clients.map(async client => {
        return await client.estimateExternalMessageFee(this.wallet.address, {
          body: transfer,
          initCode: needsInit ? this.wallet.init.code : null,
          initData: needsInit ? this.wallet.init.data : null,
          ignoreSignature: false
        })
      })
      const fees: Awaited<ReturnType<TonClient['estimateExternalMessageFee']>> =
        await promiseAny(feeFuncs)

      const totalFee =
        fees.source_fees.fwd_fee +
        fees.source_fees.gas_fee +
        fees.source_fees.in_fwd_fee +
        fees.source_fees.storage_fee
      networkFee = totalFee.toString()
    }

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
      networkFees: [{ tokenId: null, nativeAmount: networkFee }],
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
    const seqnoFuncs = clients.map(async client => {
      const contract = client.open(this.wallet)
      return await contract.getSeqno()
    })
    const seqno: Awaited<ReturnType<typeof this.wallet['getSeqno']>> =
      await promiseAny(seqnoFuncs)

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
      await formatAggregateError(
        promiseAny(broadcastFuncs),
        'Broadcast failed:'
      )

      if (this.otherData.contractState === 'uninitialized') {
        // It's not possible to calculate the txid for a wallet's first send so we need to look for it once it's confirmed
        let attempts = 0
        do {
          attempts++
          await snooze(1000)
          const txidFuncs = clients.map(async client => {
            return await client.getTransactions(this.wallet.address, {
              limit: 50
            })
          })
          const transactions: Awaited<
            ReturnType<TonClient['getTransactions']>
          > = await promiseAny(txidFuncs)

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
