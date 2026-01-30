import { HttpEndpoint } from '@cosmjs/stargate'
import { asObject, asString } from 'cleaners'

import { PluginEnvironment } from '../common/innerPlugin'
import { MidgardNetworkInfo } from './midgardTypes'

/**
 * Thorchain-specific network info that extends MidgardNetworkInfo.
 * Adds the thornode fee API endpoint.
 */
export interface ThorchainNetworkInfo extends MidgardNetworkInfo {
  transactionFeeConnectionInfo: HttpEndpoint
}

export function isThorchainEnvironment(
  env: PluginEnvironment<MidgardNetworkInfo | ThorchainNetworkInfo>
): env is PluginEnvironment<ThorchainNetworkInfo> {
  return (
    (env as PluginEnvironment<ThorchainNetworkInfo>).currencyInfo.pluginId ===
      'thorchainrune' ||
    (env as PluginEnvironment<ThorchainNetworkInfo>).currencyInfo.pluginId ===
      'thorchainrunestagenet'
  )
}

/**
 * Thornode network API response for fee calculation.
 */
export const asThornodeNetwork = asObject({
  // bond_reward_rune: asString, // '17257435059176',
  // burned_bep_2_rune: asString, // '47115838110346964',
  // burned_erc_20_rune: asString, // '1653783031763036',
  // effective_security_bond: asString, // '6621166637606310',
  // gas_spent_rune: asString, // '119414731966742',
  // gas_withheld_rune: asString, // '159093044870164',
  native_outbound_fee_rune: asString, // '2000000',
  native_tx_fee_rune: asString // '2000000',
  // outbound_fee_multiplier: asString, // '15000',
  // rune_price_in_tor: asString, // '649194931',
  // tns_fee_per_block_rune: asString, // '20',
  // tns_register_fee_rune: asString, // '1000000000',
  // tor_price_in_rune: asString, // '15403694',
  // total_bond_units: asString, // '22182160',
  // total_reserve: asString, // '8596638591565880',
  // vaults_migrating: false
})
