import { EncodeObject } from '@cosmjs/proto-signing'
import { coin, Event } from '@cosmjs/stargate'
import { abs, add, div, max, mul } from 'biggystring'
import { Fee } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { EdgeCurrencyEngineOptions } from 'edge-core-js/types'

import { PluginEnvironment } from '../../common/innerPlugin'
import { getRandomDelayMs } from '../../common/network'
import { snooze } from '../../common/utils'
import { CosmosTools } from '../CosmosTools'
import {
  asCosmosWalletOtherData,
  CosmosCoin,
  CosmosFee,
  CosmosWalletOtherData,
  SafeCosmosWalletInfo
} from '../cosmosTypes'
import { reduceCoinEventsForAddress, rpcWithApiKey } from '../cosmosUtils'
import {
  asChainIdUpdate,
  asMidgardActionsResponse,
  asThorchainWalletOtherData,
  asThornodeNetwork,
  MidgardAction,
  ThorchainNetworkInfo,
  ThorchainWalletOtherData
} from '../thorchainTypes'
import { CosmosEngine } from './CosmosEngine'

const QUERY_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class ThorchainEngine extends CosmosEngine {
  networkInfo: ThorchainNetworkInfo
  otherData!: ThorchainWalletOtherData & CosmosWalletOtherData

  constructor(
    env: PluginEnvironment<ThorchainNetworkInfo>,
    tools: CosmosTools,
    walletInfo: SafeCosmosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
  }

  setOtherData(raw: unknown): void {
    const cosmosData = asCosmosWalletOtherData(raw)
    const thorchainData = asThorchainWalletOtherData(raw)
    this.otherData = { ...cosmosData, ...thorchainData }
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
      this.networkInfo.midgardConnctionInfo,
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

                // The coin might have a prefix like "RUNE.RUNE",
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

          // Midgard fees are 10x off from where they should be.
          // However, we can just ignore Midgard and guess 0.02 RUNE here:
          // See https://dev.thorchain.org/concepts/fees.html#thorchain-native-rune
          const fee: Fee = {
            amount: [
              {
                denom: 'rune',
                amount: '2000000'
              }
            ],
            gasLimit: BigInt(0),
            payer: '',
            granter: ''
          }

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

  async calculateFee(opts: { messages: EncodeObject[] }): Promise<CosmosFee> {
    const { url, headers } = rpcWithApiKey(
      this.networkInfo.transactionFeeConnectionInfo,
      this.tools.initOptions
    )

    const res = await this.engineFetch(url, {
      method: 'GET',
      headers
    })
    const raw = await res.json()
    const clean = asThornodeNetwork(raw)

    let networkFee = '0'
    for (const msg of opts.messages) {
      switch (msg.typeUrl) {
        case '/types.MsgDeposit':
          networkFee = add(networkFee, clean.native_outbound_fee_rune)
          break
        case '/types.MsgSend':
          networkFee = add(networkFee, clean.native_tx_fee_rune)
      }
    }

    return {
      gasFeeCoin: coin('1', this.networkInfo.nativeDenom),
      gasLimit: '60000000',
      // For Thorchain, the exact fee isn't known until the transaction is confirmed.
      // This would most commonly be an issue for max spends but we should overestimate
      // the fee for all spends.
      networkFee: mul(networkFee, '1.01')
    }
  }

  async startEngine(): Promise<void> {
    this.addToLoop('queryChainId', QUERY_POLL_MILLISECONDS)
    await super.startEngine()
  }
}
