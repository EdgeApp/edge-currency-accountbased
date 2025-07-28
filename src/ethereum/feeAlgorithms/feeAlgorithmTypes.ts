import { EthFeeHistoryConfig } from './ethFeeHistory'

/**
 * The legacy fee algorithm config is used to configure the legacy fee algorithm.
 * This is used for existing networks that haven't upgraded to fee algorithm
 * adapters.
 */
export interface LegacyFeeAlgorithmConfig {
  type: 'legacy'
}

export type FeeAlgorithmConfig = LegacyFeeAlgorithmConfig | EthFeeHistoryConfig
