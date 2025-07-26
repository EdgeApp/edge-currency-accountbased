import { expect } from 'chai'
import { describe, it } from 'mocha'

import { calculateFeeForPriority } from '../../../src/ethereum/feeAlgorithms/ethFeeHistory'
import { fetchFeesFromFeeHistory } from '../../../src/ethereum/fees/feeProviders'

describe('eth_feeHistory percentile-based fee calculation', function () {
  // Mock fetch function that returns sample fee history data with percentiles [10, 50, 90]
  const mockFetch = async (_url: string, options: any): Promise<any> => {
    const body = JSON.parse(options.body)

    if (body.method === 'eth_feeHistory') {
      return {
        ok: true,
        json: async () => ({
          result: {
            baseFeePerGas: [
              '0x6fc23ac00', // 30 gwei
              '0x77359400', // 32 gwei
              '0x7ef40a00', // 34 gwei
              '0x861c4680', // 36 gwei
              '0x8d9ee800' // 38 gwei (next block base fee)
            ],
            reward: [
              ['0x3b9aca00', '0x77359400', '0xb2d05e00'], // [1, 2, 3] gwei for percentiles [10, 50, 90]
              ['0x3b9aca00', '0x77359400', '0xb2d05e00'], // [1, 2, 3] gwei
              ['0x3b9aca00', '0x77359400', '0xb2d05e00'], // [1, 2, 3] gwei
              ['0x3b9aca00', '0x77359400', '0xb2d05e00'] // [1, 2, 3] gwei
            ]
          }
        })
      }
    }

    throw new Error('Unexpected RPC call')
  }

  const mockLog = Object.assign((message: string) => console.log(message), {
    breadcrumb: () => {},
    crash: () => {},
    warn: () => {},
    error: () => {}
  }) as any

  it('should calculate fees for priority 10 (low urgency)', async function () {
    const result = await calculateFeeForPriority(
      10,
      mockFetch,
      ['https://test-rpc.com'],
      mockLog,
      4
    )

    // Next base fee is 2376001536 wei (0x8d9ee800)
    // Adjusted base fee = 2376001536 * 2 = 4752003072 wei
    // Average priority fee at 10th percentile = 1000000000 wei (1 gwei)
    // maxFeePerGas = 4752003072 + 1000000000 = 5752003072
    expect(result.maxFeePerGas).to.equal('5752003072')
    expect(result.maxPriorityFeePerGas).to.equal('1000000000')
  })

  it('should calculate fees for priority 50 (standard urgency)', async function () {
    const result = await calculateFeeForPriority(
      50,
      mockFetch,
      ['https://test-rpc.com'],
      mockLog,
      4
    )

    // Next base fee is 2376001536 wei (0x8d9ee800)
    // Adjusted base fee = 2376001536 * 2 = 4752003072 wei
    // Average priority fee at 50th percentile = 2000000000 wei (2 gwei)
    // maxFeePerGas = 4752003072 + 2000000000 = 6752003072
    expect(result.maxFeePerGas).to.equal('6752003072')
    expect(result.maxPriorityFeePerGas).to.equal('2000000000')
  })

  it('should calculate fees for priority 90 (high urgency)', async function () {
    const result = await calculateFeeForPriority(
      90,
      mockFetch,
      ['https://test-rpc.com'],
      mockLog,
      4
    )

    // Next base fee is 2376001536 wei (0x8d9ee800)
    // Adjusted base fee = 2376001536 * 2 = 4752003072 wei
    // Average priority fee at 90th percentile = 3000000000 wei (3 gwei)
    // maxFeePerGas = 4752003072 + 3000000000 = 7752003072
    expect(result.maxFeePerGas).to.equal('7752003072')
    expect(result.maxPriorityFeePerGas).to.equal('3000000000')
  })

  it('should handle RPC errors gracefully', async function () {
    const errorFetch = async (): Promise<any> => {
      return {
        ok: false,
        text: async () => 'RPC Error'
      }
    }

    try {
      await calculateFeeForPriority(
        50,
        errorFetch,
        ['https://test-rpc.com'],
        mockLog,
        4
      )
      expect.fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).to.include('eth_feeHistory fetch error')
    }
  })

  it('should handle empty fee history data', async function () {
    const emptyFetch = async (_url: string, _options: any): Promise<any> => {
      return {
        ok: true,
        json: async () => ({
          result: {
            baseFeePerGas: [],
            reward: []
          }
        })
      }
    }

    try {
      await calculateFeeForPriority(
        50,
        emptyFetch,
        ['https://test-rpc.com'],
        mockLog,
        4
      )
      expect.fail('Should have thrown an error')
    } catch (error: any) {
      expect(error.message).to.include('empty baseFeePerGas data')
    }
  })
})

describe('fetchFeesFromFeeHistory integration', function () {
  // Mock fetch function that returns sample fee history data with percentiles [10, 50, 90]
  const mockFetch = async (_url: string, options: any): Promise<any> => {
    const body = JSON.parse(options.body)

    if (body.method === 'eth_feeHistory') {
      return {
        ok: true,
        json: async () => ({
          result: {
            baseFeePerGas: [
              '0x6fc23ac00', // 30 gwei
              '0x77359400', // 32 gwei
              '0x7ef40a00', // 34 gwei
              '0x861c4680', // 36 gwei
              '0x8d9ee800' // 38 gwei (next block base fee)
            ],
            reward: [
              ['0x3b9aca00', '0x77359400', '0xb2d05e00'], // [1, 2, 3] gwei for percentiles [10, 50, 90]
              ['0x3b9aca00', '0x77359400', '0xb2d05e00'], // [1, 2, 3] gwei
              ['0x3b9aca00', '0x77359400', '0xb2d05e00'], // [1, 2, 3] gwei
              ['0x3b9aca00', '0x77359400', '0xb2d05e00'] // [1, 2, 3] gwei
            ]
          }
        })
      }
    }

    throw new Error('Unexpected RPC call')
  }

  const mockLog = Object.assign((message: string) => console.log(message), {
    breadcrumb: () => {},
    crash: () => {},
    warn: () => {},
    error: () => {}
  }) as any

  const mockCurrencyInfo = {
    currencyCode: 'BTC'
  } as any

  const mockInitOptions = {} as any

  const mockNetworkInfo = {
    supportsEIP1559: true,
    feeAlgorithm: {
      type: 'eth_feeHistory',
      blocksToAnalyze: 4
    },
    networkAdapterConfigs: [
      {
        type: 'rpc',
        servers: ['https://test-rpc.com']
      }
    ]
  } as any

  it('should calculate fees using percentile-based approach', async function () {
    const result = await fetchFeesFromFeeHistory(
      mockFetch,
      mockCurrencyInfo,
      mockInitOptions,
      mockLog,
      mockNetworkInfo
    )

    expect(result).to.not.equal(undefined)
    if (result == null) return

    // Expected calculations:
    // Next base fee = 2376001536 wei (0x8d9ee800)
    // Adjusted base fee = 2376001536 * 2 = 4752003072 wei
    // Priority fees: 10th percentile = 1 gwei, 50th = 2 gwei, 90th = 3 gwei
    // lowFee (10th percentile): 4752003072 + 1000000000 = 5752003072
    // standardFee (50th percentile): 4752003072 + 2000000000 = 6752003072
    // highFee (90th percentile): 4752003072 + 3000000000 = 7752003072

    expect(result.lowFee).to.equal('5752003072')
    expect(result.standardFeeLow).to.equal('6752003072')
    expect(result.standardFeeHigh).to.equal('6752003072')
    expect(result.highFee).to.equal('7752003072')
  })

  it('should return undefined for non-EIP1559 chains', async function () {
    const nonEip1559NetworkInfo = {
      ...mockNetworkInfo,
      supportsEIP1559: false
    }

    const result = await fetchFeesFromFeeHistory(
      mockFetch,
      mockCurrencyInfo,
      mockInitOptions,
      mockLog,
      nonEip1559NetworkInfo
    )

    expect(result).to.equal(undefined)
  })

  it('should return undefined for chains without eth_feeHistory algorithm', async function () {
    const defaultAlgorithmNetworkInfo = {
      ...mockNetworkInfo,
      feeAlgorithm: { type: 'legacy' }
    }

    const result = await fetchFeesFromFeeHistory(
      mockFetch,
      mockCurrencyInfo,
      mockInitOptions,
      mockLog,
      defaultAlgorithmNetworkInfo
    )

    expect(result).to.equal(undefined)
  })

  it('should return undefined when no RPC config is available', async function () {
    const noRpcNetworkInfo = {
      ...mockNetworkInfo,
      networkAdapterConfigs: [
        {
          type: 'evmscan',
          servers: ['https://api.etherscan.io']
        }
      ]
    }

    const result = await fetchFeesFromFeeHistory(
      mockFetch,
      mockCurrencyInfo,
      mockInitOptions,
      mockLog,
      noRpcNetworkInfo
    )

    expect(result).to.equal(undefined)
  })

  it('should handle RPC errors and return undefined', async function () {
    const errorFetch = async (): Promise<any> => {
      return {
        ok: false,
        text: async () => 'RPC Error'
      }
    }

    const result = await fetchFeesFromFeeHistory(
      errorFetch,
      mockCurrencyInfo,
      mockInitOptions,
      mockLog,
      mockNetworkInfo
    )

    expect(result).to.equal(undefined)
  })
})
