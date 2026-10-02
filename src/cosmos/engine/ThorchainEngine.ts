import { EncodeObject } from '@cosmjs/proto-signing'
import { add } from 'biggystring'
import { Fee } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { EdgeCurrencyEngineOptions } from 'edge-core-js/types'

import { PluginEnvironment } from '../../common/innerPlugin'
import { CosmosTools } from '../CosmosTools'
import { CosmosFee, SafeCosmosWalletInfo } from '../cosmosTypes'
import { rpcWithApiKey } from '../cosmosUtils'
import { MidgardNetworkInfo } from '../midgardTypes'
import { asThornodeNetwork } from '../thorchainTypes'
import { MidgardEngine } from './MidgardEngine'

/**
 * Turns a THORChain asset name, as Midgard reports it, into a bank denom.
 *
 * This follows thornode's `Asset.Native()`: a few assets have their own
 * denoms, and every other one uses its lowercased name. Midgard reports the
 * same token under more than one name ("THOR.RUJI" in a swap, "X/RUJI" in a
 * send), and both must land on the one denom the bank module uses.
 */
export function thorchainAssetToDenom(asset: string): string {
  const assetName = asset.toUpperCase()
  switch (assetName) {
    case 'THOR.RUNE':
      return 'rune'
    case 'THOR.TCY':
      return 'tcy'
    case 'THOR.RUJI':
      return 'x/ruji'
  }
  return assetName.toLowerCase()
}

/**
 * Thorchain-specific engine that uses the thornode API for fee calculation.
 */
export class ThorchainEngine extends MidgardEngine {
  networkInfo: MidgardNetworkInfo

  constructor(
    env: PluginEnvironment<MidgardNetworkInfo>,
    tools: CosmosTools,
    walletInfo: SafeCosmosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
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

  protected midgardAssetToDenom(asset: string): string {
    return thorchainAssetToDenom(asset)
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
    if (res.status !== 200) {
      const text = await res.text()
      throw new Error(`Thorchain calculateFee error: ${text}`)
    }
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

    // thornode's ante chain has no `DeductFeeDecorator`, so the fee the
    // transaction declares is ignored and the flat fee is the whole cost.
    return this.makeMidgardFee(networkFee)
  }
}
