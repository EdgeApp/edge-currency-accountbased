import { add, div, mul } from 'biggystring'
import { asArray, asMaybe, asObject, asString } from 'cleaners'
import { EdgeFetchFunction, EdgeLog } from 'edge-core-js/types'

import { asyncWaterfall } from '../../common/promiseUtils'
import { hexToDecimal, pickRandom } from '../../common/utils'

/**
 *  This is the configuration type for the eth_feeHistory fee algorithm.
 */
export interface EthFeeHistoryConfig {
  type: 'eth_feeHistory'
  blocksToAnalyze: number
}

export type FeePriority = 'low' | 'standard' | 'high'

export interface FeeResult {
  maxFeePerGas: string
  maxPriorityFeePerGas: string
}

//
// Local Types
//

export interface EthFeeHistoryResponse {
  baseFeePerGas: string[]
  reward: string[][]
}

export const asRpcResultEthFeeHistory = asObject({
  result: asObject({
    baseFeePerGas: asArray(asString),
    reward: asArray(asArray(asString))
  })
})

const PERCENTILES = [10, 50, 90]

export async function callEthFeeHistory(
  fetch: EdgeFetchFunction,
  rpcServers: string[],
  blocksToAnalyze: number
): Promise<EthFeeHistoryResponse> {
  const server = pickRandom(rpcServers, 1)[0]

  const opts = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      method: 'eth_feeHistory',
      params: [
        `0x${blocksToAnalyze.toString(16)}`, // number of blocks
        'latest', // ending block
        PERCENTILES // percentiles for tips: [10, 50, 90]
      ],
      id: 1,
      jsonrpc: '2.0'
    })
  }

  const fetchResponse = await fetch(server, opts)
  if (!fetchResponse.ok) {
    const text = await fetchResponse.text()
    throw new Error(`eth_feeHistory fetch error: ${text}`)
  }

  const json = await fetchResponse.json()
  const rpcResponse = asMaybe(asRpcResultEthFeeHistory)(json)

  if (rpcResponse == null) {
    throw new Error(
      `eth_feeHistory ${server} returned invalid json: ${JSON.stringify(json)}`
    )
  }

  // Return the result directly
  return rpcResponse.result
}

/**
 * Calculate EIP-1559 gas fees using percentile-based priority fee estimation.
 *
 * @param priority - The urgency level (10, 50, or 90)
 * @param fetch - Edge fetch function
 * @param rpcServers - Array of RPC server URLs
 * @param log - Edge log function
 * @param blocksToAnalyze - Number of recent blocks to analyze
 * @returns Fee result with maxFeePerGas and maxPriorityFeePerGas
 */
export async function calculateFeeForPriority(
  priority: 10 | 50 | 90,
  fetch: EdgeFetchFunction,
  rpcServers: string[],
  log: EdgeLog,
  blocksToAnalyze: number
): Promise<FeeResult> {
  const getFee = async (rpcUrl: string): Promise<FeeResult> => {
    const feeHistory = await callEthFeeHistory(fetch, [rpcUrl], blocksToAnalyze)

    // Extract next block's base fee (last entry in baseFeePerGas array)
    const baseFees = feeHistory.baseFeePerGas.map(hex => hexToDecimal(hex))
    if (baseFees.length === 0) {
      throw new Error('eth_feeHistory returned empty baseFeePerGas data')
    }
    const nextBaseFee = baseFees[baseFees.length - 1]

    // Calculate adjusted base fee (2x multiplier)
    const adjustedBaseFee = mul(nextBaseFee, '2')

    // Map priority to percentile index
    const priorityToIndex: Record<number, number> = { 10: 0, 50: 1, 90: 2 }
    const percentileIndex = priorityToIndex[priority]

    // Extract priority fees at the specified percentile
    const rewards = feeHistory.reward
    if (rewards.length === 0) {
      throw new Error('eth_feeHistory returned empty reward data')
    }

    // Calculate average tip at the selected percentile across all blocks
    let totalTip = '0'
    let validBlocks = 0

    for (const blockRewards of rewards) {
      if (blockRewards.length > percentileIndex) {
        const tip = hexToDecimal(blockRewards[percentileIndex])
        totalTip = add(totalTip, tip)
        validBlocks++
      }
    }

    if (validBlocks === 0) {
      throw new Error(
        `No valid reward data found for percentile index ${percentileIndex}`
      )
    }

    const avgPriorityFee = div(totalTip, validBlocks.toString(), 0)

    // Calculate final fees
    const maxPriorityFeePerGas = avgPriorityFee
    const maxFeePerGas = add(adjustedBaseFee, maxPriorityFeePerGas)

    log(`eth_feeHistory priority ${priority}:`)
    log(`  blocks analyzed: ${rewards.length}`)
    log(`  nextBaseFee: ${div(nextBaseFee, '1000000000', 18)} gwei`)
    log(
      `  adjustedBaseFee (2x): ${div(adjustedBaseFee, '1000000000', 18)} gwei`
    )
    log(`  avgPriorityFee: ${div(avgPriorityFee, '1000000000', 18)} gwei`)
    log(`  maxFeePerGas: ${div(maxFeePerGas, '1000000000', 18)} gwei`)

    return {
      maxFeePerGas,
      maxPriorityFeePerGas
    }
  }

  // Use asyncWaterfall to try multiple RPC servers
  const result = await asyncWaterfall(
    rpcServers.map(rpcUrl => async () => await getFee(rpcUrl))
  )

  return result
}
