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
  MidgardAction,
  MidgardNetworkInfo,
  MidgardWalletOtherData
} from '../midgardTypes'
import { CosmosEngine } from './CosmosEngine'

const QUERY_POLL_MILLISECONDS = getRandomDelayMs(20000)

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
          let txidHex = ''
          // Convert actions to Events
          const events: Event[] = []
          const convertToEvents = (
            actions: MidgardAction[],
            type: 'coin_spent' | 'coin_received'
          ): void => {
            for (const action of actions) {
              if (action.txID.length > txidHex.length) {
                txidHex = action.txID
              }
              for (const coin of action.coins) {
                const typeValue =
                  type === 'coin_received' ? 'receiver' : 'spender'

                // The coin might have a prefix like "RUNE.RUNE" or "MAYA.CACAO",
                // or it might be a plain currency code like "TCY":
                const assetParts = coin.asset.split('.')
                const asset = assetParts[1] ?? assetParts[0]

                events.push({
                  type,
                  attributes: [
                    {
                      key: 'amount',
                      value: `${abs(coin.amount)}${asset.toLowerCase()}`
                    },
                    {
                      key: typeValue,
                      value: action.address
                    }
                  ]
                })
              }
            }
          }
          convertToEvents(action.in, 'coin_spent')
          convertToEvents(action.out, 'coin_received')

          if (txidHex === mostRecentTxId) {
            breakWhileLoop = true
            break
          }
          if (inLoopTxid === mostRecentTxId) inLoopTxid = txidHex

          let netBalanceChanges: CosmosCoin[] = []
          try {
            netBalanceChanges = reduceCoinEventsForAddress(
              events,
              this.walletInfo.keys.bech32Address
            )
          } catch (e) {
            this.log.warn('reduceCoinEventsForAddress error:', String(e))
          }
          if (netBalanceChanges.length === 0) continue

          // Get the fee from the subclass
          const fee = this.getMidgardTransactionFee()

          netBalanceChanges.forEach(coin => {
            this.processCosmosTransaction(
              txidHex,
              date,
              '', // signedTx not provided by Midgard API
              coin,
              memo,
              parseInt(action.height),
              fee
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

    for (const tokenId of [null, ...this.enabledTokenIds]) {
      this.tokenCheckTransactionsStatus.set(tokenId, 1)
    }
    this.updateOnAddressesChecked()
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
