import { EncodeObject } from '@cosmjs/proto-signing'
import { coin } from '@cosmjs/stargate'
import { add, mul } from 'biggystring'
import { Fee } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { EdgeCurrencyEngineOptions } from 'edge-core-js/types'

import { PluginEnvironment } from '../../common/innerPlugin'
import { CosmosTools } from '../CosmosTools'
import { CosmosFee, SafeCosmosWalletInfo } from '../cosmosTypes'
import { rpcWithApiKey } from '../cosmosUtils'
import { MidgardNetworkInfo } from '../midgardTypes'
import { asThornodeNetwork, ThorchainNetworkInfo } from '../thorchainTypes'
import { MidgardEngine } from './MidgardEngine'

/**
 * Thorchain-specific engine that uses the thornode API for fee calculation.
 */
export class ThorchainEngine extends MidgardEngine {
  networkInfo: ThorchainNetworkInfo

  constructor(
    env: PluginEnvironment<ThorchainNetworkInfo>,
    tools: CosmosTools,
    walletInfo: SafeCosmosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    // Cast to MidgardNetworkInfo for parent constructor
    super(env as PluginEnvironment<MidgardNetworkInfo>, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
  }

  /**
   * Override to provide Thorchain's fixed fee estimate for Midgard transactions.
   * Thorchain fees are 0.02 RUNE (2000000 base units).
   * See https://dev.thorchain.org/concepts/fees.html#thorchain-native-rune
   */
  protected getMidgardTransactionFee(): Fee {
    return {
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
}
