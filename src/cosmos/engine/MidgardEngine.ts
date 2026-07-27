import { Event } from '@cosmjs/stargate'
import { abs, div, max } from 'biggystring'
import { Fee } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { EdgeCurrencyEngineOptions } from 'edge-core-js/types'

import { PluginEnvironment } from '../../common/innerPlugin'
import { getRandomDelayMs } from '../../common/network'
import { snooze } from '../../common/utils'
import { CosmosTools } from '../CosmosTools'
import {
  asCosmosWalletOtherData,
  CosmosCoin,
  CosmosWalletOtherData,
  SafeCosmosWalletInfo
} from '../cosmosTypes'
import { reduceCoinEventsForAddress, rpcWithApiKey } from '../cosmosUtils'
import {
  asChainIdUpdate,
  asMidgardActionsResponse,
  asMidgardWalletOtherData,
  MidgardActionResponse,
  MidgardNetworkInfo,
  MidgardWalletOtherData
} from '../midgardTypes'
import { CosmosEngine } from './CosmosEngine'

const QUERY_POLL_MILLISECONDS = getRandomDelayMs(20000)

/**
 * Midgard reports a reverted operation two ways: a reverted send is a normal
 * action with `status: 'failed'`, while a MsgDeposit whose message failed to
 * execute (e.g. a swap memo the chain could not parse) is its own
 * `type: 'failed'` action whose status is still 'success'. Both mean the
 * `in`/`out` amounts never moved on-chain.
 */
export function isFailedMidgardAction(action: MidgardActionResponse): boolean {
  return action.status === 'failed' || action.type === 'failed'
}

/**
 * Converts a single Midgard action into the coin_spent/coin_received events
 * used to compute our wallet's net balance change.
 *
 * A failed action reverted its state changes on-chain, so the `in`/`out`
 * amounts Midgard reports never actually moved. The only real balance change is
 * the network fee, which is still charged to the signer even though the message
 * reverted (exactly like a failed EVM transaction). For a failed action we
 * therefore emit only the burned fee, and only when our wallet signed the
 * transaction. If our wallet was merely the intended recipient it paid nothing
 * and gets no events, so the action is ignored rather than shown as a
 * successful receive.
 *
 * A `type: 'failed'` deposit reports no networkFees in its metadata, so
 * callers pass the chain's standard fee as `fallbackNetworkFees` to keep the
 * burned fee on record.
 */
export function midgardActionToCoinEvents(
  action: MidgardActionResponse,
  ourAddress: string,
  fallbackNetworkFees: Array<{ amount: string; asset: string }> = []
): Event[] {
  const events: Event[] = []
  const pushCoinEvent = (
    address: string,
    asset: string,
    amount: string,
    type: 'coin_spent' | 'coin_received'
  ): void => {
    // The coin might have a prefix like "RUNE.RUNE" or "MAYA.CACAO",
    // or it might be a plain currency code like "TCY":
    const assetParts = asset.split('.')
    const assetCode = assetParts[1] ?? assetParts[0]
    const typeValue = type === 'coin_received' ? 'receiver' : 'spender'
    events.push({
      type,
      attributes: [
        { key: 'amount', value: `${abs(amount)}${assetCode.toLowerCase()}` },
        { key: typeValue, value: address }
      ]
    })
  }

  if (isFailedMidgardAction(action)) {
    const isSigner = action.in.some(
      subAction => subAction.address === ourAddress
    )
    if (isSigner) {
      const { networkFees } = Object.values(action.metadata)[0]
      const feeCoins =
        networkFees.length > 0 ? networkFees : fallbackNetworkFees
      for (const feeCoin of feeCoins) {
        pushCoinEvent(ourAddress, feeCoin.asset, feeCoin.amount, 'coin_spent')
      }
    }
    return events
  }

  for (const subAction of action.in) {
    for (const coin of subAction.coins) {
      pushCoinEvent(subAction.address, coin.asset, coin.amount, 'coin_spent')
    }
  }
  for (const subAction of action.out) {
    for (const coin of subAction.coins) {
      pushCoinEvent(subAction.address, coin.asset, coin.amount, 'coin_received')
    }
  }
  return events
}

/**
 * Base engine for chains that use Midgard API for transaction history.
 * Subclasses can override calculateFee for chain-specific fee logic.
 */
export class MidgardEngine extends CosmosEngine {
  networkInfo: MidgardNetworkInfo
  otherData!: MidgardWalletOtherData & CosmosWalletOtherData

  constructor(
    env: PluginEnvironment<MidgardNetworkInfo>,
    tools: CosmosTools,
    walletInfo: SafeCosmosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
  }

  setOtherData(raw: unknown): void {
    const cosmosData = asCosmosWalletOtherData(raw)
    const midgardData = asMidgardWalletOtherData(raw)
    this.otherData = { ...cosmosData, ...midgardData }
  }

  async queryChainId(): Promise<void> {
    try {
      const res = await this.engineFetch(this.networkInfo.chainIdUpdateUrl)
      if (!res.ok) {
        const message = await res.text()
        throw new Error(message)
      }
      const raw = await res.json()
      const clean = asChainIdUpdate(raw)
      this.chainId = clean.result.node_info.network
      this.removeFromLoop('queryChainId')
    } catch (e: any) {
      this.error(`queryChainId Error `, e)
    }
  }

  async queryTransactions(): Promise<void> {
    const { url, headers } = rpcWithApiKey(
      this.networkInfo.midgardConnectionInfo,
      this.tools.initOptions
    )
    const baseUrl = `${url}/v2/actions?address=${this.walletInfo.keys.bech32Address}`
    const { mostRecentHeight, mostRecentTxId } =
      this.otherData.midgardTxQueryParams
    const fromHeight = mostRecentHeight
    // Data from Midgard API is returned newest to oldest so we need to hold onto the most recent until the loop is complete
    let nextPageToken: string | undefined
    let inLoopHeight = mostRecentHeight
    let inLoopTxid = mostRecentTxId
    let breakWhileLoop = false
    while (true) {
      try {
        const fromHeightQueryString = `&fromHeight=${fromHeight}`
        const nextPageQueryString =
          nextPageToken != null ? `&nextPageToken=${nextPageToken}` : ''
        const res = await this.engineFetch(
          `${baseUrl}${fromHeightQueryString}${nextPageQueryString}`,
          headers
        )
        if (!res.ok) {
          // snooze in case we're rate-limited
          await snooze(1000)
          const message = await res.text()
          throw new Error(message)
        }
        const raw = await res.json()
        const response = asMidgardActionsResponse(raw)
        if (
          response.actions.length === 0 ||
          response.meta.nextPageToken === ''
        ) {
          break
        }
        nextPageToken = response.meta.nextPageToken

        for (const action of response.actions) {
          inLoopHeight = max(inLoopHeight, action.height)
          const date = parseInt(div(action.date, '1000000000'))
          const { memo } = Object.values(action.metadata)[0]
          const ourAddress = this.walletInfo.keys.bech32Address

          // The transaction id is the longest txID across all in/out
          // sub-actions (internal/synthetic movements can use a shorter id).
          let txidHex = ''
          for (const subAction of [...action.in, ...action.out]) {
            if (subAction.txID.length > txidHex.length) {
              txidHex = subAction.txID
            }
          }

          // A failed deposit reports no networkFees, so offer the chain's
          // standard fee as the fallback balance change for the signer.
          const fallbackNetworkFees =
            this.getMidgardTransactionFee().amount.map(feeCoin => ({
              amount: feeCoin.amount,
              asset: feeCoin.denom
            }))
          const events = midgardActionToCoinEvents(
            action,
            ourAddress,
            fallbackNetworkFees
          )

          if (txidHex === mostRecentTxId) {
            breakWhileLoop = true
            break
          }
          if (inLoopTxid === mostRecentTxId) inLoopTxid = txidHex

          let netBalanceChanges: CosmosCoin[] = []
          try {
            netBalanceChanges = reduceCoinEventsForAddress(events, ourAddress)
          } catch (e) {
            this.log.warn('reduceCoinEventsForAddress error:', String(e))
          }
          if (netBalanceChanges.length === 0) continue

          // For a failed action the events already carry the burned fee as
          // the entire balance change, so don't pass a fee that would be
          // subtracted on top of it. Otherwise get the fee from the subclass.
          const isFailed = isFailedMidgardAction(action)
          const fee = isFailed ? undefined : this.getMidgardTransactionFee()

          netBalanceChanges.forEach(coin => {
            this.processCosmosTransaction(
              txidHex,
              date,
              '', // signedTx not provided by Midgard API
              coin,
              memo,
              parseInt(action.height),
              fee,
              isFailed
            )
          })
        }
      } catch (e) {
        this.log.warn('queryTransactionsMidgard error:', e)
      }

      if (breakWhileLoop) break
    }

    if (inLoopHeight !== mostRecentHeight || inLoopTxid !== mostRecentTxId) {
      this.otherData.midgardTxQueryParams.mostRecentHeight = inLoopHeight
      this.otherData.midgardTxQueryParams.mostRecentTxId = inLoopTxid ?? ''
      this.walletLocalDataDirty = true
    }

    this.syncTracker.setHistoryRatios([null, ...this.enabledTokenIds], 1)
    this.sendTransactionEvents()
  }

  /**
   * Returns the fee to use for Midgard transactions.
   * Subclasses can override this for chain-specific fee estimation.
   * Default implementation returns a zero fee (actual fees are calculated at spend time).
   */
  protected getMidgardTransactionFee(): Fee {
    // Default: use zero fee - actual fees are calculated during makeSpend
    return {
      amount: [
        {
          denom: this.networkInfo.nativeDenom,
          amount: '0'
        }
      ],
      gasLimit: BigInt(0),
      payer: '',
      granter: ''
    }
  }

  async startEngine(): Promise<void> {
    this.addToLoop('queryChainId', QUERY_POLL_MILLISECONDS)
    await super.startEngine()
  }
}
