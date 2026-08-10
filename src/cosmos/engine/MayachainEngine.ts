import { EncodeObject } from '@cosmjs/proto-signing'
import { add } from 'biggystring'
import { Fee } from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { EdgeCurrencyEngineOptions } from 'edge-core-js/types'

import { PluginEnvironment } from '../../common/innerPlugin'
import { CosmosTools } from '../CosmosTools'
import { CosmosFee, SafeCosmosWalletInfo } from '../cosmosTypes'
import { rpcWithApiKey } from '../cosmosUtils'
import { MidgardNetworkInfo } from '../midgardTypes'
import { asMayachainConstants } from '../thorchainTypes'
import { MIDGARD_DECLARED_GAS_FEE, MidgardEngine } from './MidgardEngine'

/**
 * The chain's flat `NativeTransactionFee`, used to reconstruct the fee of a send
 * that syncs back from Midgard. `calculateFee` reads the live constant instead.
 */
const NATIVE_TRANSACTION_FEE = '2000000000'

/**
 * Mayachain (Cacao) engine that uses Midgard for transaction history
 * and the mayanode constants API for fee calculation.
 */
export class MayachainEngine extends MidgardEngine {
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

  protected getMidgardTransactionFee(): Fee {
    return {
      amount: [
        {
          denom: this.networkInfo.nativeDenom,
          // Both halves of what a send costs the signer, so history agrees with
          // what `calculateFee` reported at spend time.
          amount: add(NATIVE_TRANSACTION_FEE, MIDGARD_DECLARED_GAS_FEE)
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
    if (res.status !== 200) {
      const text = await res.text()
      throw new Error(`Mayachain calculateFee error: ${text}`)
    }
    const raw = await res.json()
    const clean = asMayachainConstants(raw)
    const { NativeTransactionFee, OutboundTransactionFee } = clean.int_64_values

    let networkFee = '0'
    for (const msg of opts.messages) {
      switch (msg.typeUrl) {
        case '/types.MsgDeposit':
          networkFee = add(networkFee, OutboundTransactionFee.toString())
          break
        case '/types.MsgSend':
          networkFee = add(networkFee, NativeTransactionFee.toString())
      }
    }

    // mayanode runs the stock cosmos-sdk `DeductFeeDecorator`, so the declared
    // gas fee is collected on top of the flat fee. Leaving it out of the total
    // put a max send one base unit over the balance, which the chain accepted
    // at CheckTx and then reverted as `insufficient funds`.
    return this.makeMidgardFee(add(networkFee, MIDGARD_DECLARED_GAS_FEE))
  }
}
