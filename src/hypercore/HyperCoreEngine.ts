import { add, div, gt, gte, lt, mul, sub } from 'biggystring'
import { asMaybe } from 'cleaners'
import {
  EdgeAddress,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeSignMessageOptions,
  EdgeSpendInfo,
  EdgeTokenId,
  EdgeTokenMap,
  EdgeTransaction,
  EdgeTxAmount,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError,
  SpendToSelfError
} from 'edge-core-js/types'
import { signTypedData_v4 } from 'eth-sig-util'
import { ethers } from 'ethers'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { makeTokenSyncTracker, TokenSyncTracker } from '../common/SyncTracker'
import { asSafeCommonWalletInfo, SafeCommonWalletInfo } from '../common/types'
import { cleanTxLogs, getOtherParams, makeMutex, snooze } from '../common/utils'
import { HyperCoreTools } from './HyperCoreTools'
import {
  asExchangeResponse,
  asHyperCorePrivateKeys,
  asHyperCoreSignedTx,
  asHyperCoreSignMessageParams,
  asHyperCoreSpendOtherParams,
  asHyperCoreUnsignedTx,
  asHyperCoreWalletOtherData,
  asLedgerDelta,
  asLedgerUpdates,
  asNonceMappingTypedData,
  asSendAssetTypedData,
  asSpotClearinghouseState,
  asTypedDataTypes,
  asUserRole,
  HyperCoreLedgerUpdate,
  HyperCoreNetworkInfo,
  HyperCoreSendAssetAction,
  HyperCoreSignedTx,
  HyperCoreSpotSendAction,
  HyperCoreTokenLocation,
  HyperCoreWalletOtherData,
  TypedDataTypes
} from './hypercoreTypes'

const POLL_MILLISECONDS = getRandomDelayMs(20000)

/** `userNonFundingLedgerUpdates` never returns more than this per call. */
const LEDGER_PAGE_SIZE = 2000

/** How long `broadcastTx` looks for its ledger entry to learn the hash. */
const HASH_LOOKUP_ATTEMPTS = 5
const HASH_LOOKUP_DELAY_MS = 1000

/** Ledger entries land a moment after the action's own timestamp. */
const HASH_LOOKUP_SKEW_MS = 10000

/**
 * Txid for a send whose ledger hash was not found in time. Swap plugins that
 * relay a transfer themselves save it under this txid too, so history can
 * replace it once the ledger entry appears.
 */
const placeholderTxid = (nonce: number): string => `hypercore-nonce-${nonce}`
const PLACEHOLDER_TXID = /^hypercore-nonce-(\d+)$/

const SPOT_SEND_TYPES = {
  EIP712Domain: [
    { name: 'name', type: 'string' },
    { name: 'version', type: 'string' },
    { name: 'chainId', type: 'uint256' },
    { name: 'verifyingContract', type: 'address' }
  ],
  'HyperliquidTransaction:SpotSend': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'destination', type: 'string' },
    { name: 'token', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'time', type: 'uint64' }
  ]
}

const SEND_ASSET_TYPES = {
  EIP712Domain: SPOT_SEND_TYPES.EIP712Domain,
  'HyperliquidTransaction:SendAsset': [
    { name: 'hyperliquidChain', type: 'string' },
    { name: 'destination', type: 'string' },
    { name: 'sourceDex', type: 'string' },
    { name: 'destinationDex', type: 'string' },
    { name: 'token', type: 'string' },
    { name: 'amount', type: 'string' },
    { name: 'fromSubAccount', type: 'string' },
    { name: 'nonce', type: 'uint64' }
  ]
}

/** Relay's link from a HyperCore transfer nonce to the request it pays. */
const NONCE_MAPPING_TYPES = {
  EIP712Domain: SPOT_SEND_TYPES.EIP712Domain,
  NonceMapping: [
    { name: 'chainId', type: 'string' },
    { name: 'wallet', type: 'address' },
    { name: 'depositor', type: 'address' },
    { name: 'id', type: 'bytes32' },
    { name: 'nonce', type: 'uint256' }
  ]
}

/**
 * The typed data `signMessage` signs, by primary type, with the exact types
 * each must declare: the relay nonce mapping and asset transfer that swap
 * providers submit. The mapping must name this wallet (see
 * `checkNonceMapping`) and the transfer must pass the same checks as
 * `makeSpend` (see `checkSendAsset`). Other Hyperliquid actions (agent keys,
 * orders, withdrawals) could move funds outside `makeSpend`, so they are
 * refused.
 */
const SIGNABLE_TYPES = new Map<string, TypedDataTypes>([
  ['NonceMapping', NONCE_MAPPING_TYPES],
  ['HyperliquidTransaction:SendAsset', SEND_ASSET_TYPES]
])

/** Relay's signing domain for nonce mappings. */
const RELAY_NONCE_DOMAIN = {
  name: 'RelayNonceMapping',
  version: '2',
  chainId: 1,
  verifyingContract: '0x0000000000000000000000000000000000000000'
}

/** True when typed-data `types` declare exactly the expected structs. */
const sameTypes = (types: unknown, expected: TypedDataTypes): boolean => {
  const cleanTypes = asMaybe(asTypedDataTypes)(types)
  if (cleanTypes == null) return false
  const names = Object.keys(cleanTypes)
  return (
    names.length === Object.keys(expected).length &&
    names.every(
      name =>
        JSON.stringify(cleanTypes[name]) === JSON.stringify(expected[name])
    )
  )
}

interface SpotBalance {
  total: string
  hold: string
}

/** A balance change to our spot account, in the ledger's decimal units. */
interface SpotMovement {
  tokenName: string
  amount: string
  isSend: boolean
  fees: Array<{ tokenName: string; amount: string }>
  nonce?: number
}

export class HyperCoreEngine extends CurrencyEngine<
  HyperCoreTools,
  SafeCommonWalletInfo,
  TokenSyncTracker
> {
  networkInfo: HyperCoreNetworkInfo
  otherData!: HyperCoreWalletOtherData

  /** Lowercase, which is how the API reports addresses. */
  address: string

  /** Latest balances, including tokens the user has not enabled. */
  private readonly spotBalances = new Map<EdgeTokenId, SpotBalance>()

  /** Custom tokens resolved against the spot token list, by token id. */
  private readonly customLocations = new Map<string, HyperCoreTokenLocation>()

  private readonly queryTxMutex = makeMutex()

  constructor(
    env: PluginEnvironment<HyperCoreNetworkInfo>,
    tools: HyperCoreTools,
    walletInfo: SafeCommonWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts, makeTokenSyncTracker)
    this.networkInfo = env.networkInfo
    this.address = walletInfo.keys.publicKey.toLowerCase()
  }

  setOtherData(raw: any): void {
    this.otherData = asHyperCoreWalletOtherData(raw)
  }

  //
  // Tokens
  //

  private getMultiplier(tokenId: EdgeTokenId): string | undefined {
    const denominations =
      tokenId == null
        ? this.currencyInfo.denominations
        : this.allTokensMap[tokenId]?.denominations
    return denominations?.[0]?.multiplier
  }

  /**
   * Locations for the native currency and every known token. Custom tokens
   * are resolved once through the spot token list; a token that fails to
   * resolve is left out until the next call.
   */
  private async getLocations(): Promise<
    Map<EdgeTokenId, HyperCoreTokenLocation>
  > {
    const out = new Map<EdgeTokenId, HyperCoreTokenLocation>()
    out.set(null, this.networkInfo.nativeToken)
    for (const [tokenId, token] of Object.entries(this.allTokensMap)) {
      const cached = this.customLocations.get(tokenId)
      if (cached != null) {
        out.set(tokenId, cached)
        continue
      }
      try {
        const location = await this.tools.getTokenLocation(token)
        out.set(tokenId, location)
        if (this.builtinTokens[tokenId] == null) {
          this.customLocations.set(tokenId, location)
        }
      } catch (error: unknown) {
        this.log.warn(`Cannot resolve token ${tokenId}:`, error)
      }
    }
    return out
  }

  async changeCustomTokens(tokens: EdgeTokenMap): Promise<void> {
    const hasNewToken = Object.keys(tokens).some(
      tokenId => this.allTokensMap[tokenId] == null
    )
    await super.changeCustomTokens(tokens)
    // History skips ledger entries for tokens we do not know, so a new token
    // needs the ledger read again from the start:
    if (hasNewToken) {
      await this.queryTxMutex(async () => {
        this.otherData.ledgerCursor = 0
        this.walletLocalDataDirty = true
      })
    }
  }

  //
  // Balances
  //

  async queryBalance(): Promise<void> {
    try {
      const locations = await this.getLocations()
      let balances: Map<EdgeTokenId, SpotBalance>
      try {
        balances = await this.fetchApiBalances(locations)
      } catch (error: unknown) {
        this.log.warn('queryBalance API error, using HyperEVM:', error)
        balances = await this.fetchEvmBalances(locations)
      }

      const detectedTokenIds: string[] = []
      for (const tokenId of locations.keys()) {
        const balance = balances.get(tokenId) ?? { total: '0', hold: '0' }
        this.spotBalances.set(tokenId, balance)
        // Detected tokens need their balance before core enables them:
        this.updateBalance(tokenId, balance.total)

        if (
          tokenId != null &&
          !this.enabledTokenIds.includes(tokenId) &&
          gt(balance.total, '0')
        ) {
          detectedTokenIds.push(tokenId)
        }
      }

      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }
      this.syncTracker.setBalanceRatios([null, ...this.enabledTokenIds], 1)
    } catch (error: unknown) {
      this.log.warn('queryBalance error:', error)
    }
  }

  private async fetchApiBalances(
    locations: Map<EdgeTokenId, HyperCoreTokenLocation>
  ): Promise<Map<EdgeTokenId, SpotBalance>> {
    const state = await this.tools.fetchInfo(
      { type: 'spotClearinghouseState', user: this.address },
      asSpotClearinghouseState
    )
    const out = new Map<EdgeTokenId, SpotBalance>()
    for (const [tokenId, location] of locations) {
      const multiplier = this.getMultiplier(tokenId)
      const row = state.balances.find(b => b.token === location.index)
      if (row == null || multiplier == null) continue
      out.set(tokenId, {
        total: decimalToNative(row.total, multiplier),
        hold: decimalToNative(row.hold, multiplier)
      })
    }
    return out
  }

  /** Reads the same balances through the HyperEVM balance checker. */
  private async fetchEvmBalances(
    locations: Map<EdgeTokenId, HyperCoreTokenLocation>
  ): Promise<Map<EdgeTokenId, SpotBalance>> {
    const entries = [...locations.entries()]
    const rows = await this.tools.fetchEvmBalances(
      this.address,
      entries.map(([, location]) => location.index)
    )
    const out = new Map<EdgeTokenId, SpotBalance>()
    entries.forEach(([tokenId], i) => {
      out.set(tokenId, { total: rows[i].total, hold: rows[i].hold })
    })
    return out
  }

  /** Balance not locked in open orders. */
  private getSpendable(tokenId: EdgeTokenId): string {
    const balance = this.spotBalances.get(tokenId)
    // The persisted total carries no holds, so spend nothing until a live read:
    if (balance == null) return '0'
    const spendable = sub(balance.total, balance.hold)
    return lt(spendable, '0') ? '0' : spendable
  }

  //
  // History
  //

  async queryTransactions(): Promise<void> {
    return await this.queryTxMutex(async () => {
      // A pass queued behind the mutex can land here after `killEngine`:
      if (!this.engineOn) return
      try {
        await this.queryTransactionsInner()
        this.syncTracker.setHistoryRatios([null, ...this.enabledTokenIds], 1)
      } catch (error: unknown) {
        this.log.warn('queryTransactions error:', error)
      }
      this.sendTransactionEvents()
    })
  }

  /**
   * Walks the ledger forward from the saved cursor. Pages start at their
   * `startTime` inclusively, so each page re-reads the last millisecond of
   * the one before it; `addTransaction` drops those repeats by txid.
   */
  private async queryTransactionsInner(): Promise<void> {
    const locations = await this.getLocations()
    const tokenIdsByName = new Map<string, EdgeTokenId>()
    for (const [tokenId, location] of locations) {
      tokenIdsByName.set(location.name, tokenId)
    }

    let cursor = this.otherData.ledgerCursor
    while (true) {
      const updates = await this.tools.fetchInfo(
        {
          type: 'userNonFundingLedgerUpdates',
          user: this.address,
          startTime: cursor
        },
        asLedgerUpdates
      )
      for (const update of updates) {
        this.processLedgerUpdate(update, tokenIdsByName)
      }

      const last = updates[updates.length - 1]
      if (last == null) break
      let nextCursor = last.time
      const isFull = updates.length >= LEDGER_PAGE_SIZE
      // A full page inside one millisecond would repeat forever:
      if (isFull && nextCursor <= cursor) nextCursor = cursor + 1
      if (nextCursor !== this.otherData.ledgerCursor) {
        this.otherData.ledgerCursor = nextCursor
        this.walletLocalDataDirty = true
      }
      cursor = nextCursor
      if (!isFull) break
    }
  }

  processLedgerUpdate(
    update: HyperCoreLedgerUpdate,
    tokenIdsByName: Map<string, EdgeTokenId>
  ): void {
    const movement = this.parseDelta(update.delta)
    if (movement == null) return

    const { nonce } = movement
    // Staking transfers all share an all-zero hash, so they need their own:
    const hash = /^0x0*$/.test(update.hash)
      ? `hypercore-ledger-${update.time}`
      : update.hash
    const txid =
      (nonce != null ? this.otherData.unresolvedNonces[String(nonce)] : null) ??
      hash
    const date = update.time / 1000

    // Fees paid in the moved token are part of its movement; fees in any
    // other token become that token's own entry under the same txid.
    const feeTotals = new Map<string, string>()
    for (const fee of movement.fees) {
      if (!gt(fee.amount, '0')) continue
      feeTotals.set(
        fee.tokenName,
        add(feeTotals.get(fee.tokenName) ?? '0', fee.amount)
      )
    }

    const networkFees: EdgeTxAmount[] = []
    for (const [tokenName, amount] of feeTotals) {
      const tokenId = tokenIdsByName.get(tokenName)
      if (tokenId === undefined) continue
      const multiplier = this.getMultiplier(tokenId)
      if (multiplier == null) continue
      networkFees.push({
        tokenId,
        nativeAmount: decimalToNative(amount, multiplier)
      })
    }

    const addEntry = (
      tokenName: string,
      amount: string,
      fee: string,
      isSend: boolean
    ): void => {
      const tokenId = tokenIdsByName.get(tokenName)
      if (tokenId === undefined) return
      const multiplier = this.getMultiplier(tokenId)
      const currencyCode = this.getCurrencyCode(tokenId)
      if (multiplier == null || currencyCode == null) return

      const networkFee = decimalToNative(fee, multiplier)
      const total = add(decimalToNative(amount, multiplier), networkFee)
      this.addTransaction(tokenId, {
        blockHeight: 1,
        confirmations: 'confirmed',
        currencyCode,
        date,
        isSend,
        memos: [],
        nativeAmount: isSend ? `-${total}` : total,
        networkFee: isSend ? networkFee : '0',
        networkFees: isSend ? networkFees : [],
        ourReceiveAddresses: isSend ? [] : [this.walletInfo.keys.publicKey],
        signedTx: '',
        tokenId,
        txid,
        walletId: this.walletId
      })
    }

    addEntry(
      movement.tokenName,
      movement.amount,
      movement.isSend ? feeTotals.get(movement.tokenName) ?? '0' : '0',
      movement.isSend
    )
    if (movement.isSend) {
      for (const [tokenName, amount] of feeTotals) {
        if (tokenName === movement.tokenName) continue
        addEntry(tokenName, '0', amount, true)
      }
    }
  }

  /**
   * Reduces a ledger delta to its effect on our spot balances. Deltas that
   * only touch perp or staking balances return undefined.
   */
  parseDelta(raw: unknown): SpotMovement | undefined {
    let delta
    try {
      delta = asLedgerDelta(raw)
    } catch (error: unknown) {
      return undefined
    }

    const nativeName = this.networkInfo.nativeToken.name
    switch (delta.type) {
      case 'spotTransfer':
      case 'send': {
        const fromSpot =
          delta.type === 'spotTransfer' || isSpotDex(delta.sourceDex)
        const toSpot =
          delta.type === 'spotTransfer' || isSpotDex(delta.destinationDex)
        const isOut = delta.user.toLowerCase() === this.address && fromSpot
        const isIn = delta.destination.toLowerCase() === this.address && toSpot
        if (isOut === isIn) return undefined

        const fees = []
        if (gt(delta.fee, '0')) {
          fees.push({
            tokenName: delta.feeToken === '' ? 'USDC' : delta.feeToken,
            amount: delta.fee
          })
        }
        if (gt(delta.nativeTokenFee, '0')) {
          fees.push({ tokenName: nativeName, amount: delta.nativeTokenFee })
        }
        return {
          tokenName: delta.token,
          amount: delta.amount,
          isSend: isOut,
          fees: isOut ? fees : [],
          nonce: isOut ? delta.nonce : undefined
        }
      }
      case 'cStakingTransfer':
        return {
          tokenName: delta.token,
          amount: delta.amount,
          isSend: delta.isDeposit,
          fees: []
        }
      case 'accountClassTransfer':
        return {
          tokenName: 'USDC',
          amount: delta.usdc,
          isSend: delta.toPerp,
          fees: []
        }
    }
  }

  //
  // Engine lifecycle
  //

  async startEngine(): Promise<void> {
    this.addToLoop('queryBalance', POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', POLL_MILLISECONDS)
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await super.killEngine()
    // Let a running history pass finish before a resync resets its cursor:
    await this.queryTxMutex(async () => {})
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    this.spotBalances.clear()
    await this.startEngine()
  }

  //
  // Spending
  //

  /**
   * HyperCore charges the sender a one-time fee, in a quote token, on the
   * first transfer to an account that does not exist yet.
   */
  private async needsActivation(destination: string): Promise<boolean> {
    const { role } = await this.tools.fetchInfo(
      { type: 'userRole', user: destination },
      asUserRole
    )
    return role === 'missing'
  }

  /**
   * Picks the first quote token that can pay the activation fee on top of
   * `amount` of `tokenId`.
   */
  private pickActivationFee(
    tokenId: EdgeTokenId,
    amount: string
  ): EdgeTxAmount | undefined {
    for (const feeTokenId of this.networkInfo.activationFeeTokenIds) {
      const multiplier = this.getMultiplier(feeTokenId)
      if (multiplier == null) continue
      const fee = mul(this.networkInfo.activationFee, multiplier)
      const available =
        feeTokenId === tokenId
          ? sub(this.getSpendable(feeTokenId), amount)
          : this.getSpendable(feeTokenId)
      if (gte(available, fee)) return { tokenId: feeTokenId, nativeAmount: fee }
    }
  }

  private activationFeeError(): InsufficientFundsError {
    const [feeTokenId] = this.networkInfo.activationFeeTokenIds
    const multiplier = this.getMultiplier(feeTokenId) ?? '1'
    return new InsufficientFundsError({
      tokenId: feeTokenId,
      networkFee: mul(this.networkInfo.activationFee, multiplier)
    })
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const { tokenId } = spendInfo
    const publicAddress = spendInfo.spendTargets[0]?.publicAddress
    if (publicAddress == null) throw new Error('Missing publicAddress')

    let maxAmount = this.getSpendable(tokenId)
    if (await this.needsActivation(publicAddress.toLowerCase())) {
      // Prefer paying the fee from another token over shrinking the send:
      if (this.pickActivationFee(tokenId, maxAmount) == null) {
        const fee = this.pickActivationFee(tokenId, '0')
        if (fee == null || fee.tokenId !== tokenId) {
          throw this.activationFeeError()
        }
        maxAmount = sub(maxAmount, fee.nativeAmount)
      }
    }
    if (!gt(maxAmount, '0')) throw new InsufficientFundsError({ tokenId })

    spendInfo.spendTargets[0].nativeAmount = maxAmount
    await this.makeSpend(spendInfo)
    return maxAmount
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo
    const { destinationDex } =
      asMaybe(asHyperCoreSpendOtherParams)(edgeSpendInfo.otherParams) ?? {}

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { nativeAmount: amount, publicAddress } =
      edgeSpendInfo.spendTargets[0]
    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (amount == null) throw new NoAmountSpecifiedError()
    if (!ethers.utils.isAddress(publicAddress)) {
      throw new Error('InvalidPublicAddressError')
    }
    const destination = publicAddress.toLowerCase()
    if (destination === this.address) throw new SpendToSelfError()

    const location =
      tokenId == null
        ? this.networkInfo.nativeToken
        : await this.tools.getTokenLocation(this.allTokensMap[tokenId])
    const multiplier = this.getMultiplier(tokenId)
    if (multiplier == null) throw new Error('Unknown token')

    if (gt(amount, this.getSpendable(tokenId))) {
      throw new InsufficientFundsError({ tokenId })
    }

    let activationFee: EdgeTxAmount | undefined
    if (await this.needsActivation(destination)) {
      activationFee = this.pickActivationFee(tokenId, amount)
      if (activationFee == null) throw this.activationFeeError()
    }

    // A fee in the sent token comes out of the same balance, so it is part
    // of this transaction's amount. A fee in another token is listed only in
    // `networkFees`.
    const networkFee =
      activationFee?.tokenId === tokenId ? activationFee.nativeAmount : '0'

    const unsignedTx = asHyperCoreUnsignedTx({
      destination,
      token: `${location.name}:${location.contractAddress}`,
      amount: nativeToDecimal(amount, multiplier),
      destinationDex
    })

    return {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: `-${add(amount, networkFee)}`,
      networkFee,
      networkFees: activationFee != null ? [activationFee] : [],
      otherParams: unsignedTx,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }
  }

  /**
   * Signs a `spotSend`, or a `sendAsset` when the spend names a destination
   * dex. The nonce is the signing time, which HyperCore requires to be recent
   * and unique per account.
   */
  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const unsignedTx = asHyperCoreUnsignedTx(getOtherParams(edgeTransaction))
    const { privateKey } = asHyperCorePrivateKeys(this.currencyInfo.pluginId)(
      privateKeys
    )
    const { hyperliquidChain, signatureChainId } = this.networkInfo
    const { destination, token, amount, destinationDex } = unsignedTx
    const time = Date.now()
    const domain = {
      name: 'HyperliquidSignTransaction',
      version: '1',
      chainId: parseInt(signatureChainId, 16),
      verifyingContract: '0x0000000000000000000000000000000000000000'
    }
    const key = Buffer.from(privateKey.replace(/^0x/, ''), 'hex')

    let action: HyperCoreSpotSendAction | HyperCoreSendAssetAction
    let signature: string
    if (destinationDex == null) {
      action = {
        type: 'spotSend',
        hyperliquidChain,
        signatureChainId,
        destination,
        token,
        amount,
        time
      }
      signature = signTypedData_v4(key, {
        data: {
          domain,
          types: SPOT_SEND_TYPES,
          primaryType: 'HyperliquidTransaction:SpotSend',
          message: { hyperliquidChain, destination, token, amount, time }
        }
      })
    } else {
      action = {
        type: 'sendAsset',
        hyperliquidChain,
        signatureChainId,
        destination,
        sourceDex: 'spot',
        destinationDex,
        token,
        amount,
        fromSubAccount: '',
        nonce: time
      }
      const { type, signatureChainId: _, ...message } = action
      signature = signTypedData_v4(key, {
        data: {
          domain,
          types: SEND_ASSET_TYPES,
          primaryType: 'HyperliquidTransaction:SendAsset',
          message
        }
      })
    }
    const signedTx: HyperCoreSignedTx = {
      action,
      nonce: time,
      signature: splitSignature(signature)
    }
    edgeTransaction.signedTx = JSON.stringify(signedTx)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    try {
      const signedTx = asHyperCoreSignedTx(JSON.parse(edgeTransaction.signedTx))
      const { status, response } = asExchangeResponse(
        await this.tools.postExchange(signedTx)
      )
      if (status !== 'ok') {
        throw new Error(`HyperCore rejected the transfer: ${String(response)}`)
      }

      const hash = await this.findHashByNonce(signedTx.nonce)
      if (hash != null) {
        edgeTransaction.txid = hash
      } else {
        // The transfer went through, but its hash is not visible yet. Keep a
        // stand-in txid that history will reuse for this nonce.
        const txid = placeholderTxid(signedTx.nonce)
        this.otherData.unresolvedNonces[String(signedTx.nonce)] = txid
        this.walletLocalDataDirty = true
        edgeTransaction.txid = txid
      }
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
      return edgeTransaction
    } catch (error: unknown) {
      this.warn(`FAILURE broadcastTx failed: ${String(error)}`)
      throw error
    }
  }

  /**
   * Signs EIP-712 typed data, such as the Hyperliquid user actions a swap
   * provider submits on our behalf.
   */
  async signMessage(
    message: string,
    privateKeys: JsonObject,
    opts: EdgeSignMessageOptions
  ): Promise<string> {
    const { typedData } = asHyperCoreSignMessageParams(opts.otherParams)
    if (!typedData) {
      throw new Error('HyperCoreEngine: signMessage() only signs typed data')
    }
    const data = JSON.parse(message)
    const expectedTypes = SIGNABLE_TYPES.get(data.primaryType)
    if (expectedTypes == null) {
      throw new Error(
        `HyperCoreEngine: signMessage() does not sign ${String(
          data.primaryType
        )}`
      )
    }
    // The signature covers the types, so a caller could drop a checked field:
    if (!sameTypes(data.types, expectedTypes)) {
      throw new Error(
        `HyperCoreEngine: unexpected ${String(data.primaryType)} types`
      )
    }
    if (data.primaryType === 'NonceMapping') {
      this.checkNonceMapping(data)
    } else {
      await this.checkSendAsset(data)
    }
    const { privateKey } = asHyperCorePrivateKeys(this.currencyInfo.pluginId)(
      privateKeys
    )
    return signTypedData_v4(Buffer.from(privateKey.replace(/^0x/, ''), 'hex'), {
      data
    })
  }

  /**
   * Holds a relay nonce mapping to Relay's domain and to this wallet, so the
   * transfer it maps can only be credited from our own account.
   */
  private checkNonceMapping(data: unknown): void {
    const { domain, message } = asNonceMappingTypedData(data)
    if (
      domain.name !== RELAY_NONCE_DOMAIN.name ||
      domain.version !== RELAY_NONCE_DOMAIN.version ||
      Number(domain.chainId) !== RELAY_NONCE_DOMAIN.chainId ||
      domain.verifyingContract !== RELAY_NONCE_DOMAIN.verifyingContract ||
      message.chainId !== 'hyperliquid'
    ) {
      throw new Error('HyperCoreEngine: nonce mapping is for another network')
    }
    if (
      message.wallet.toLowerCase() !== this.address ||
      message.depositor.toLowerCase() !== this.address
    ) {
      throw new Error('HyperCoreEngine: nonce mapping is for another wallet')
    }
  }

  /**
   * Holds a `sendAsset` from a swap provider to the limits `makeSpend` sets:
   * this network, our own spot balance, a valid destination other than us,
   * a known token, and no more than we can spend.
   */
  private async checkSendAsset(data: unknown): Promise<void> {
    const { domain, message } = asSendAssetTypedData(data)
    const { hyperliquidChain, signatureChainId } = this.networkInfo
    if (
      domain.name !== 'HyperliquidSignTransaction' ||
      Number(domain.chainId) !== parseInt(signatureChainId, 16) ||
      message.hyperliquidChain !== hyperliquidChain
    ) {
      throw new Error('HyperCoreEngine: sendAsset is for another network')
    }
    // An empty sourceDex is the default perp DEX, not the spot balance:
    if (message.sourceDex !== 'spot' || message.fromSubAccount !== '') {
      throw new Error('HyperCoreEngine: sendAsset must spend our spot balance')
    }
    const destination = message.destination.toLowerCase()
    if (!ethers.utils.isAddress(destination)) {
      throw new Error('InvalidPublicAddressError')
    }
    if (destination === this.address) throw new SpendToSelfError()

    const token = message.token.toLowerCase()
    for (const [tokenId, location] of await this.getLocations()) {
      if (
        `${location.name}:${location.contractAddress}`.toLowerCase() !== token
      )
        continue
      const multiplier = this.getMultiplier(tokenId)
      if (multiplier == null) break
      // `decimalToNative` would truncate extra places or keep a minus sign,
      // checking a different amount than the one we sign:
      if (!isDecimalAmount(message.amount, multiplier.length - 1)) {
        throw new Error(
          `HyperCoreEngine: invalid sendAsset amount ${message.amount}`
        )
      }
      if (
        gt(
          decimalToNative(message.amount, multiplier),
          this.getSpendable(tokenId)
        )
      ) {
        throw new InsufficientFundsError({ tokenId })
      }
      return
    }
    throw new Error(`HyperCoreEngine: unknown sendAsset token ${message.token}`)
  }

  async saveTx(edgeTransaction: EdgeTransaction): Promise<void> {
    const match = PLACEHOLDER_TXID.exec(edgeTransaction.txid)
    if (match != null) {
      this.otherData.unresolvedNonces[match[1]] = edgeTransaction.txid
      this.walletLocalDataDirty = true
    }
    await super.saveTx(edgeTransaction)
  }

  /** Finds the ledger hash of our transfer with this nonce. */
  private async findHashByNonce(nonce: number): Promise<string | undefined> {
    for (let attempt = 0; attempt < HASH_LOOKUP_ATTEMPTS; ++attempt) {
      if (attempt > 0) await snooze(HASH_LOOKUP_DELAY_MS)
      try {
        const updates = await this.tools.fetchInfo(
          {
            type: 'userNonFundingLedgerUpdates',
            user: this.address,
            startTime: nonce - HASH_LOOKUP_SKEW_MS
          },
          asLedgerUpdates
        )
        for (const update of updates) {
          const movement = this.parseDelta(update.delta)
          if (movement?.nonce === nonce) return update.hash
        }
      } catch (error: unknown) {
        this.log.warn('findHashByNonce error:', error)
      }
    }
  }

  async getAddresses(): Promise<EdgeAddress[]> {
    return [
      {
        addressType: 'publicAddress',
        publicAddress: this.walletInfo.keys.publicKey
      }
    ]
  }
}

/** Splits a 65-byte `r || s || v` signature the way the API expects it. */
const splitSignature = (
  signature: string
): { r: string; s: string; v: number } => {
  const hex = signature.replace(/^0x/, '')
  const v = parseInt(hex.slice(128, 130), 16)
  return {
    r: `0x${hex.slice(0, 64)}`,
    s: `0x${hex.slice(64, 128)}`,
    v: v < 27 ? v + 27 : v
  }
}

/** The perp dex is named by an empty string. */
const isSpotDex = (dex: string): boolean => dex === 'spot'

/** True for a non-negative decimal with no more than `decimals` places. */
const isDecimalAmount = (amount: string, decimals: number): boolean => {
  const match = /^\d+(?:\.(\d+))?$/.exec(amount)
  return match != null && (match[1] ?? '').replace(/0+$/, '').length <= decimals
}

/** Converts an API decimal string to integer native units. */
export const decimalToNative = (amount: string, multiplier: string): string => {
  const decimals = multiplier.length - 1
  const [whole, fraction = ''] = amount.split('.')
  const padded = fraction.padEnd(decimals, '0').slice(0, decimals)
  return add(`${whole}${padded}`, '0')
}

/** Converts integer native units to the API's decimal string. */
export const nativeToDecimal = (amount: string, multiplier: string): string => {
  const decimals = multiplier.length - 1
  const out = div(amount, multiplier, decimals)
  return out.includes('.') ? out.replace(/\.?0+$/, '') : out
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<HyperCoreNetworkInfo>,
  tools: HyperCoreTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeCommonWalletInfo(walletInfo)
  const engine = new HyperCoreEngine(env, tools, safeWalletInfo, opts)
  await engine.loadEngine()
  return engine
}
