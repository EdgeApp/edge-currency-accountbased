import { Event } from '@cosmjs/stargate'
import { abs, div, max } from 'biggystring'
import { Fee } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { EdgeCurrencyEngineOptions } from 'edge-core-js/types'

import { PluginEnvironment } from '../../common/innerPlugin'
import { getRandomDelayMs } from '../../common/network'
import { CosmosTools } from '../CosmosTools'
import {
  asCosmosWalletOtherData,
  CosmosCoin,
  CosmosWalletOtherData,
  SafeCosmosWalletInfo
} from '../cosmosTypes'
import { reduceCoinEventsForAddress } from '../cosmosUtils'
import {
  asChainIdUpdate,
  asMidgardActionsResponse,
  asThorchainWalletOtherData,
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
      const res = await this.fetchCors(this.networkInfo.chainIdUpdateUrl)
      if (!res.ok) {
        const message = await res.text()
        throw new Error(message)
      }
      const raw = await res.json()
      const clean = asChainIdUpdate(raw)
      this.chainId = clean.result.node_info.network
      clearTimeout(this.timers.queryChainId)
    } catch (e: any) {
      this.error(`queryChainId Error `, e)
    }
  }

  async queryTransactions(): Promise<void> {
    const allCurrencyCodes = [
      this.currencyInfo.currencyCode,
      ...this.enabledTokenIds.map(
        tokenId => this.allTokensMap[tokenId].currencyCode
      )
    ]

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
        const res = await this.fetchCors(
          `${baseUrl}${fromHeightQueryString}${nextPageQueryString}`,
          headers
        )
        if (!res.ok) {
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
          const { memo, networkFees } = Object.values(action.metadata)[0]
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
                if (coin.asset !== 'THOR.RUNE') continue

                const typeValue =
                  type === 'coin_received' ? 'receiver' : 'spender'

                events.push({
                  type,
                  attributes: [
                    {
                      key: 'amount',
                      value: `${abs(coin.amount)}rune`
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

          const fee: Fee = {
            amount: [],
            gasLimit: BigInt(0),
            payer: '',
            granter: ''
          }
          for (const networkFee of networkFees) {
            if (networkFee.asset !== 'THOR.RUNE') continue
            fee.amount.push({
              denom: 'rune',
              amount: networkFee.amount
            })
          }

          netBalanceChanges.forEach(coin => {
            this.processCosmosTransaction(
              txidHex,
              date,
              '', // signedTx not provided by Midgard API
              coin,
              memo,
              parseInt(action.height),
              '0',
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

    allCurrencyCodes.forEach(
      code => (this.tokenCheckTransactionsStatus[code] = 1)
    )
    this.updateOnAddressesChecked()

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async startEngine(): Promise<void> {
    await super.startEngine()
    this.addToLoop('queryChainId', QUERY_POLL_MILLISECONDS).catch(() => {})
  }
}
