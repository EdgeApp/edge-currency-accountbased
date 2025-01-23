import {
  CoinStruct,
  GasCostSummary,
  SuiTransactionBlockResponse
} from '@mysten/sui/client'
import { SignatureWithBytes } from '@mysten/sui/cryptography'
import { Ed25519Keypair, Ed25519PublicKey } from '@mysten/sui/keypairs/ed25519'
import { Transaction } from '@mysten/sui/transactions'
import { SUI_TYPE_ARG } from '@mysten/sui/utils'
import { add, eq, gt, lt, sub } from 'biggystring'
import {
  EdgeAddress,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { asMaybeContractLocation } from '../common/tokenHelpers'
import { asSafeCommonWalletInfo, SafeCommonWalletInfo } from '../common/types'
import { cleanTxLogs, getOtherParams } from '../common/utils'
import { SuiTools } from './SuiTools'
import {
  asSuiPrivateKeys,
  asSuiSignedTx,
  asSuiUnsignedTx,
  asSuiWalletOtherData,
  SuiNetworkInfo,
  SuiWalletOtherData
} from './suiTypes'

const ADDRESS_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class SuiEngine extends CurrencyEngine<SuiTools, SafeCommonWalletInfo> {
  networkInfo: SuiNetworkInfo

  otherData!: SuiWalletOtherData
  suiAddress: string

  constructor(
    env: PluginEnvironment<SuiNetworkInfo>,
    tools: SuiTools,
    walletInfo: SafeCommonWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    const publicKey = new Ed25519PublicKey(walletInfo.keys.publicKey)
    this.suiAddress = publicKey.toSuiAddress()
  }

  setOtherData(raw: any): void {
    this.otherData = asSuiWalletOtherData(raw)
  }

  async queryBalance(): Promise<void> {
    try {
      const balances = await this.tools.suiClient.getAllBalances({
        owner: this.suiAddress
      })

      const detectedTokenIds: string[] = []

      for (const bal of balances) {
        const { coinType, totalBalance } = bal

        if (coinType === SUI_TYPE_ARG) {
          this.updateBalance(this.currencyInfo.currencyCode, totalBalance)
          continue
        }

        const tokenId = this.tools.edgeTokenIdFromCoinType(coinType)
        const edgeToken = this.allTokensMap[tokenId]
        if (edgeToken == null) continue

        this.updateBalance(edgeToken.currencyCode, totalBalance)
        if (!this.enabledTokenIds.includes(tokenId)) {
          detectedTokenIds.push(tokenId)
        }
      }

      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }

      for (const cc of [
        this.currencyInfo.currencyCode,
        ...this.enabledTokens
      ]) {
        this.tokenCheckBalanceStatus[cc] = 1
      }
      this.updateOnAddressesChecked()
    } catch (e) {
      this.log.warn('queryBalance error:', e)
    }
  }

  async queryTransactions(): Promise<void> {
    const cursorFrom = this.otherData.latestTxidFrom
    try {
      const latestTxid = await this.queryTransactionsInner('from', cursorFrom)
      if (latestTxid !== cursorFrom) {
        this.otherData.latestTxidFrom = latestTxid
        this.walletLocalDataDirty = true
      }
    } catch (e) {
      this.log.warn('queryTransactions from error:', e)
    }

    for (const token of this.enabledTokens) {
      this.tokenCheckTransactionsStatus[token] = 0.5
    }

    const cursorTo = this.otherData.latestTxidTo
    try {
      const latestTxid = await this.queryTransactionsInner('to', cursorTo)
      if (latestTxid !== cursorTo) {
        this.otherData.latestTxidTo = latestTxid
        this.walletLocalDataDirty = true
      }
    } catch (e) {
      this.log.warn('queryTransactions to error:', e)
    }

    if (this.transactionEvents.length > 0) {
      this.currencyEngineCallbacks.onTransactions(this.transactionEvents)
      this.transactionEvents = []
    }

    for (const token of this.enabledTokens) {
      this.tokenCheckTransactionsStatus[token] = 1
    }
    this.updateOnAddressesChecked()
  }

  async queryTransactionsInner(
    direction: 'from' | 'to',
    latestTxid?: string
  ): Promise<string | undefined> {
    const filter =
      direction === 'from'
        ? { FromAddress: this.suiAddress }
        : { ToAddress: this.suiAddress }

    let queryMore = true
    let cursor = latestTxid

    while (queryMore) {
      const { data, hasNextPage, nextCursor } =
        await this.tools.suiClient.queryTransactionBlocks({
          cursor,
          filter,
          order: 'ascending',
          options: {
            showBalanceChanges: true,
            showEffects: true,
            // showEvents: false,
            // showInput: false,
            // showObjectChanges: false,
            // showRawEffects: false,
            showRawInput: true
          }
        })

      data.forEach(tx => this.processTransaction(tx, direction))
      cursor = nextCursor ?? undefined
      queryMore = hasNextPage
    }
    return cursor
  }

  processTransaction(
    tx: SuiTransactionBlockResponse,
    direction: 'from' | 'to'
  ): void {
    if (tx.checkpoint == null) return
    if (tx.rawTransaction == null) return

    if (tx.effects?.gasUsed == null) return
    const networkFee = this.feeSum(tx.effects?.gasUsed)
    const networkFees = [{ tokenId: null, nativeAmount: networkFee }]

    if (tx.timestampMs == null) return
    const date = Math.floor(parseInt(tx.timestampMs) / 1000)

    const coinTypeMap = new Map<string, string>()
    const balanceChanges = tx.balanceChanges ?? []
    for (const bal of balanceChanges) {
      const owner = bal.owner
      if (typeof owner === 'string') continue
      if ('AddressOwner' in owner && owner.AddressOwner === this.suiAddress) {
        const balance = coinTypeMap.get(bal.coinType) ?? '0'
        coinTypeMap.set(bal.coinType, add(balance, bal.amount))
      }
    }

    for (const [coinType, bal] of coinTypeMap) {
      let tokenId = null
      let currencyCode = this.currencyInfo.currencyCode
      let nativeAmount = bal
      if (coinType !== SUI_TYPE_ARG) {
        tokenId = this.tools.edgeTokenIdFromCoinType(coinType)
        const edgeToken = this.allTokensMap[tokenId]
        if (edgeToken == null) continue
        currencyCode = this.allTokensMap[tokenId].currencyCode
      }

      if (tokenId == null && direction === 'from') {
        nativeAmount = sub(nativeAmount, networkFee)
      }

      const edgeTx: EdgeTransaction = {
        txid: tx.digest,
        date,
        currencyCode,
        confirmations: 'confirmed',
        blockHeight: parseInt(tx.checkpoint),
        nativeAmount,
        networkFee,
        networkFees,
        ourReceiveAddresses: direction === 'to' ? [this.suiAddress] : [],
        signedTx: tx.rawTransaction,
        isSend: direction === 'from',
        memos: [], // TODO:
        tokenId,
        walletId: this.walletId
      }
      this.addTransaction(currencyCode, edgeTx)
    }
  }

  feeSum(gasUsed: GasCostSummary): string {
    const { computationCost, storageCost, storageRebate } = gasUsed
    return sub(add(computationCost, storageCost), storageRebate)
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
    const { tokenId } = spendInfo
    const balance = this.getBalance({
      tokenId
    })
    const publicAddress = spendInfo.spendTargets[0]?.publicAddress
    if (publicAddress == null) {
      throw new Error('Missing publicAddress')
    }

    let maxAmount = '0'
    if (tokenId == null) {
      // We can actually send the whole balance but it requires a small change
      // to the transaction creation which cannot be nicely special-cased. We
      // can actually empty the wallet with upcoming makeMaxSpend API. For now
      // we leave 0.1 SUI behind.
      maxAmount = sub(balance, '100000000')
    } else {
      maxAmount = balance
    }

    spendInfo.spendTargets[0].nativeAmount = maxAmount
    // Use makeSpend to test for insufficient funds
    await this.makeSpend(spendInfo)
    return maxAmount
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const { nativeAmount: amount, publicAddress } =
      edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (amount == null) throw new NoAmountSpecifiedError()

    const tx = new Transaction()

    if (tokenId == null) {
      const coins = tx.splitCoins(tx.gas, [amount])
      tx.transferObjects([coins], publicAddress)
    } else {
      const networkLocation = asMaybeContractLocation(
        this.allTokensMap[tokenId].networkLocation
      )
      if (networkLocation == null) {
        throw new Error('Unknown token')
      }

      const setGasBudget = (coinCount: number): void => {
        // These are safe overestimates
        const base = 1000000
        const gasPerCoin = 1500000
        tx.setGasBudgetIfNotSet(base + coinCount * gasPerCoin)
      }

      const transferCoins: CoinStruct[] = []
      let transferCoinsBalance = '0'
      let keepSearching = true
      do {
        const { data: coins, hasNextPage } =
          await this.tools.suiClient.getCoins({
            owner: this.suiAddress,
            coinType: networkLocation.contractAddress
          })

        for (const coin of coins) {
          transferCoins.push(coin)
          transferCoinsBalance = add(transferCoinsBalance, coin.balance)

          if (gt(transferCoinsBalance, amount)) {
            const overage = sub(transferCoinsBalance, amount)
            const amountNeeded = sub(coin.balance, overage)

            // Remove coin from transfer array, We'll create a new coin for the exact amount needed
            transferCoins.pop()
            const [newCoin] = tx.splitCoins(coin.coinObjectId, [amountNeeded])

            tx.transferObjects(
              [newCoin, ...transferCoins.map(c => tx.object(c.coinObjectId))],
              publicAddress
            )
            setGasBudget(transferCoins.length + 1)

            keepSearching = false
            break
          } else if (eq(transferCoinsBalance, amount)) {
            // This coin gives us the exact amount needed, no need to split
            tx.transferObjects(
              [...transferCoins.map(c => tx.object(c.coinObjectId))],
              publicAddress
            )
            setGasBudget(transferCoins.length)

            keepSearching = false
            break
          }
        }

        if (keepSearching && !hasNextPage && lt(transferCoinsBalance, amount)) {
          throw new InsufficientFundsError({ tokenId })
        }
      } while (keepSearching)
    }

    tx.setSender(this.suiAddress)
    const serialized = await tx.build({ client: this.tools.suiClient })
    const dryRun = await this.tools.suiClient.dryRunTransactionBlock({
      transactionBlock: serialized
    })
    let networkFee = this.feeSum(dryRun.effects.gasUsed)

    const mainnetBalance = this.getBalance({ tokenId: null })
    let nativeAmount = amount
    let parentNetworkFee: string | undefined
    if (tokenId == null) {
      nativeAmount = add(amount, networkFee)
      if (gt(nativeAmount, mainnetBalance)) {
        throw new InsufficientFundsError({ tokenId: null, networkFee })
      }
    } else {
      const tokenBalance = this.getBalance({ tokenId })
      if (gt(nativeAmount, tokenBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
      if (gt(networkFee, mainnetBalance)) {
        throw new InsufficientFundsError({ tokenId: null, networkFee })
      }
      parentNetworkFee = networkFee
      networkFee = '0'
    }

    const edgeTx: EdgeTransaction = {
      blockHeight: 0,
      date: 0,
      currencyCode,
      isSend: true,
      memos,
      nativeAmount: `-${nativeAmount}`,
      networkFee,
      networkFees: [
        { tokenId: null, nativeAmount: parentNetworkFee ?? networkFee }
      ],
      parentNetworkFee,
      ourReceiveAddresses: [this.suiAddress],
      otherParams: {
        unsignedBase64: base64.stringify(serialized)
      },
      tokenId,
      txid: '',
      signedTx: '',
      walletId: this.walletId
    }
    return edgeTx
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const { unsignedBase64 } = asSuiUnsignedTx(getOtherParams(edgeTransaction))
    const tx = Transaction.from(unsignedBase64)

    const keys = asSuiPrivateKeys(this.currencyInfo.pluginId)(privateKeys)
    const pair = Ed25519Keypair.deriveKeypair(keys.mnemonic)
    const res = await tx.sign({ signer: pair })
    edgeTransaction.signedTx = JSON.stringify(res)
    edgeTransaction.txid = await tx.getDigest()
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    try {
      const signedTxObj: SignatureWithBytes = asSuiSignedTx(
        JSON.parse(edgeTransaction.signedTx)
      )

      const broadcastResult =
        await this.tools.suiClient.executeTransactionBlock({
          transactionBlock: signedTxObj.bytes,
          signature: signedTxObj.signature
        })

      edgeTransaction.txid = broadcastResult.digest
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
      return edgeTransaction
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
  }

  async getAddresses(): Promise<EdgeAddress[]> {
    return [{ addressType: 'publicAddress', publicAddress: this.suiAddress }]
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<SuiNetworkInfo>,
  tools: SuiTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeCommonWalletInfo(walletInfo)

  const engine = new SuiEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
