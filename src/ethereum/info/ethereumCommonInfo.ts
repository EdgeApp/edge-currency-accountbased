import type { EdgeMemoOption, JsonObject } from 'edge-core-js/types'

import type { EthereumNetworkInfo } from '../ethereumTypes'

// We are using the memo to pass Ethereum contract calls:
export const evmMemoOptions: EdgeMemoOption[] = [
  {
    type: 'hex',
    hidden: true,
    memoName: 'data'
  }
]

/**
 * The core has deprecated `defaultSettings`,
 * but the GUI still looks at it, so give the GUI just what it needs.
 */
export function makeEvmDefaultSettings(
  networkInfo: EthereumNetworkInfo
): JsonObject {
  return {
    customFeeSettings: ['gasLimit', 'gasPrice'],
    otherSettings: {
      chainParams: networkInfo.chainParams,
      ercTokenStandard: networkInfo.ercTokenStandard,
      networkAdapterConfigs: networkInfo.networkAdapterConfigs
    }
  }
}
