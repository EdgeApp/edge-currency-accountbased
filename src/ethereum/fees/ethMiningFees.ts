import { Common } from '@ethereumjs/common'
import { TransactionFactory } from '@ethereumjs/tx'
import { add, div, gt, gte, lt, lte, min, mul, sub } from 'biggystring'
import { EdgeSpendInfo, EdgeToken } from 'edge-core-js/types'
import { ethers } from 'ethers'
import { base16 } from 'rfc4648'

import { asyncWaterfall } from '../../common/promiseUtils'
import { decimalToHex, normalizeAddress } from '../../common/utils'
import NODE_INTERFACE_ABI from '../abi/NODE_INTERFACE_ABI.json'
import {
  asMaybeEvmOverrideGasLimitLocation,
  CalcOptimismRollupFeeParams,
  EthereumFee,
  EthereumMiningFees,
  EthereumNetworkInfo,
  EthereumTxOtherParams
} from '../ethereumTypes'

export const ES_FEE_LOW = 'low'
export const ES_FEE_STANDARD = 'standard'
export const ES_FEE_HIGH = 'high'
export const ES_FEE_CUSTOM = 'custom'

const WEI_MULTIPLIER = '1000000000'

export function calcMiningFees(
  networkInfo: EthereumNetworkInfo,
  spendInfo: EdgeSpendInfo,
  edgeToken: EdgeToken | null,
  currentBaseFeeWei: string | undefined
): EthereumMiningFees {
  let useGasLimitDefaults = true
  let customGasLimit, customGasPrice

  const { customNetworkFee } = spendInfo ?? {}
  if (
    spendInfo.networkFeeOption === ES_FEE_CUSTOM &&
    customNetworkFee != null
  ) {
    const { gasLimit, gasPrice } = customNetworkFee

    if (
      (isNaN(gasLimit) || gasLimit === '') &&
      (isNaN(gasPrice) || gasPrice === '')
    ) {
      const e = new Error(
        `Custom Fee must have at least gasLimit or gasPrice specified`
      )
      e.name = 'ErrorBelowMinimumFee'
      throw e
    }

    if (gasPrice != null && gasPrice !== '') {
      let minGasPrice = networkInfo.networkFees.default.gasPrice?.minGasPrice
      if (minGasPrice != null) {
        if (currentBaseFeeWei != null) {
          minGasPrice = min(minGasPrice, currentBaseFeeWei)
        }
        const gasPriceInWei = mul(gasPrice, WEI_MULTIPLIER)
        if (lt(gasPriceInWei, minGasPrice) || /^\s*$/.test(gasPrice)) {
          const e = new Error(
            `Gas price ${gasPriceInWei} wei below minimum ${minGasPrice} wei`
          )
          e.name = 'ErrorBelowMinimumFee'
          throw e
        }
      }

      customGasPrice = mul(gasPrice, WEI_MULTIPLIER)
    }

    if (gasLimit != null && gasLimit !== '') {
      const minGasLimit = networkInfo.networkFees.default.gasLimit?.minGasLimit
      if (
        (minGasLimit != null && lt(gasLimit, minGasLimit)) ||
        /^\s*$/.test(gasLimit)
      ) {
        const e = new Error(
          `Gas limit ${gasLimit} below minimum ${minGasLimit}`
        )
        e.name = 'ErrorBelowMinimumFee'
        throw e
      }
      customGasLimit = gasLimit

      // Set to false since we have a custom gasLimit
      useGasLimitDefaults = false
    }
  }

  if (customGasLimit != null && customGasPrice != null) {
    return {
      gasLimit: customGasLimit,
      gasPrice: customGasPrice,
      useEstimatedGasLimit: false
    }
  }

  let networkFeeForGasPrice: EthereumFee = networkInfo.networkFees.default
  let networkFeeForGasLimit: EthereumFee = networkInfo.networkFees.default

  if (typeof spendInfo.spendTargets[0]?.publicAddress === 'string') {
    // If we have incomplete fees from custom fees, calculate as normal
    const targetAddress = normalizeAddress(
      spendInfo.spendTargets[0].publicAddress
    )
    if (typeof networkInfo.networkFees[targetAddress] !== 'undefined') {
      networkFeeForGasLimit = networkInfo.networkFees[targetAddress]
      useGasLimitDefaults = false
      if (typeof networkFeeForGasLimit.gasPrice !== 'undefined') {
        networkFeeForGasPrice = networkFeeForGasLimit
      }
    }
  }

  let useLimit: 'regularTransaction' | 'tokenTransaction' = 'regularTransaction'
  if (spendInfo.tokenId !== null) {
    useLimit = 'tokenTransaction'
  }

  let networkFeeOption = 'standard'
  if (
    typeof spendInfo.networkFeeOption === 'string' &&
    spendInfo.networkFeeOption !== ES_FEE_CUSTOM
  ) {
    networkFeeOption = spendInfo.networkFeeOption
  }

  const gasLimit =
    networkFeeForGasLimit.gasLimit != null
      ? networkFeeForGasLimit.gasLimit[useLimit]
      : '21000'
  let gasPrice = ''
  if (spendInfo.spendTargets[0].nativeAmount == null) {
    throw new Error('ErrorInvalidNativeAmount')
  }
  let nativeAmount = spendInfo.spendTargets[0].nativeAmount
  if (useLimit === 'tokenTransaction') {
    // Small hack. Edgetimate the relative value of token to ethereum as 10%
    nativeAmount = div(nativeAmount, '10')
  }
  if (networkFeeForGasPrice.gasPrice == null) {
    throw new Error('ErrorInvalidGasPrice')
  }
  const gasPriceObj = networkFeeForGasPrice.gasPrice
  switch (networkFeeOption) {
    case ES_FEE_LOW:
      gasPrice = gasPriceObj.lowFee
      break
    case ES_FEE_STANDARD: {
      if (
        gte(nativeAmount, networkFeeForGasPrice.gasPrice.standardFeeHighAmount)
      ) {
        gasPrice = gasPriceObj.standardFeeHigh
        break
      }

      if (lte(nativeAmount, gasPriceObj.standardFeeLowAmount)) {
        if (networkFeeForGasPrice.gasPrice == null) {
          throw new Error('ErrorInvalidGasPrice')
        }
        gasPrice = networkFeeForGasPrice.gasPrice.standardFeeLow
        break
      }

      // Scale the fee by the amount the user is sending scaled between standardFeeLowAmount and standardFeeHighAmount
      const lowHighAmountDiff = sub(
        gasPriceObj.standardFeeHighAmount,
        gasPriceObj.standardFeeLowAmount
      )
      const lowHighFeeDiff = sub(
        gasPriceObj.standardFeeHigh,
        gasPriceObj.standardFeeLow
      )

      // How much above the lowFeeAmount is the user sending
      const amountDiffFromLow = sub(
        nativeAmount,
        gasPriceObj.standardFeeLowAmount
      )

      // Add this much to the low fee = (amountDiffFromLow * lowHighFeeDiff) / lowHighAmountDiff)
      const temp1 = mul(amountDiffFromLow, lowHighFeeDiff)
      const addFeeToLow = div(temp1, lowHighAmountDiff)
      gasPrice = add(gasPriceObj.standardFeeLow, addFeeToLow)
      break
    }

    case ES_FEE_HIGH:
      gasPrice = networkFeeForGasPrice.gasPrice.highFee
      break
    default:
      throw new Error(`Invalid networkFeeOption`)
  }

  const { overrideGasLimit } =
    asMaybeEvmOverrideGasLimitLocation(edgeToken?.networkLocation) ?? {}
  if (overrideGasLimit != null) {
    useGasLimitDefaults = false
  }

  const out: EthereumMiningFees = {
    gasLimit: customGasLimit ?? overrideGasLimit ?? gasLimit,
    gasPrice: customGasPrice ?? gasPrice,
    useEstimatedGasLimit: useGasLimitDefaults
  }
  return out
}

const MAX_SIGNATURE_COST = 1040 // (32 + 32 + 1) * 16 max cost for adding r, s, v signatures to raw transaction

// This is a naive (optimistic??) implementation but is good enough as an
// estimate since it isn't possible to calculate this exactly without having
// signatures yet.
export const calcOptimismRollupFees = (
  params: CalcOptimismRollupFeeParams
): string => {
  const {
    baseFee,
    baseFeeScalar,
    blobBaseFee,
    blobBaseFeeScalar,
    chainParams,
    data,
    gasLimit,
    nonce,
    to,
    value = '0x0'
  } = params

  const common = Common.custom(chainParams)
  // @ethereumjs/util v9 tightened address/value/data inputs from `string` to
  // template-literal `0x${string}`; these runtime values arrive as
  // 0x-prefixed hex strings from upstream callers.
  const tx = TransactionFactory.fromTxData(
    {
      nonce: nonce != null ? decimalToHex(nonce) : undefined,
      gasPrice: decimalToHex(baseFee),
      gasLimit: decimalToHex(gasLimit),
      to: to as `0x${string}`,
      value: value as `0x${string}`,
      data: data == null ? undefined : (data as `0x${string}`)
    },
    { common }
  )

  // Fee calculation formula from https://specs.optimism.io/protocol/exec-engine.html#ecotone-l1-cost-fee-changes-eip-4844-da

  const txRaw = tx.raw()
  const byteGroups = flatMap(txRaw)
  const unsignedRawTxData = byteGroups
    .map(bytes => {
      if (bytes == null) return ''
      return base16.stringify(bytes).toLowerCase()
    })
    .join()
  const unsignedRawTxBytesArray = unsignedRawTxData.match(/(.{1,2})/g)
  if (unsignedRawTxBytesArray == null) {
    throw new Error('Invalid rawTx string')
  }

  let txCompressedSize = 0
  for (let i = 0; i < unsignedRawTxBytesArray.length; i++) {
    if (unsignedRawTxBytesArray[i] === '00') {
      txCompressedSize += 4 // cost for zero byte
    } else {
      txCompressedSize += 16 // cost for non-zero byte
    }
  }

  txCompressedSize = txCompressedSize + MAX_SIGNATURE_COST

  const totalBaseFee = mul(baseFeeScalar, baseFee)
  const totalBlobFee = mul(blobBaseFeeScalar, blobBaseFee)
  const weightedGasPrice = add(mul('16', totalBaseFee), totalBlobFee)

  const total = div(
    mul(txCompressedSize.toString(), weightedGasPrice),
    '16000000',
    0
  )

  return total
}

type NestedArray<T> = Array<T | NestedArray<T>>

function flatMap<T>(items: NestedArray<T>, destinationItems: T[] = []): T[] {
  items.forEach(item => {
    if (item == null) return
    if (Array.isArray(item)) {
      return flatMap(item, destinationItems)
    }
    destinationItems.push(item)
  })
  return destinationItems
}

export interface FeeParams {
  gasPrice: string
  minerTip?: string
}

/**
 * Returns gas parameters needed to build a transaction based on the transaction
 * type (legacy or EIP-1559 transaction).
 *
 * @param transactionType The EIP-2718 8-bit uint transaction type
 * @param gasPrice The gas price string value
 * @param fetchBaseFeePerGas An async function which retrieves the
 * current network base fee
 * @returns An object containing the gas parameters for the transaction (hex values)
 */
export async function getFeeParamsByTransactionType(
  transactionType: number,
  gasPrice: string,
  baseFeePerGas: string = gasPrice
): Promise<FeeParams> {
  if (transactionType < 2) {
    return { gasPrice: mul('1', gasPrice, 16) }
  } else {
    // maxFeePerGas is synonymous to gasPrice as a decimal
    const maxFeePerGas = gasPrice

    // Miner tip is assumed to be the difference in base-fee and max-fee
    let minerTip = sub(maxFeePerGas, baseFeePerGas)

    // Insure miner tip is never negative or zero
    if (lte(minerTip, '0')) {
      // We cannot assume tip to be a diff, so assume 10% of the max-fee
      minerTip = div(maxFeePerGas, '10', 0)
    }

    return {
      gasPrice: mul('1', maxFeePerGas, 16),
      minerTip: mul('1', minerTip, 16)
    }
  }
}

// Copied from https://github.com/OffchainLabs/arbitrum-tutorials/blob/master/packages/gas-estimation/scripts/exec.ts
export const calcArbitrumRollupFees = async (params: {
  rpcServers: string[]
  nodeInterfaceAddress: string
  destinationAddress: string
  txData: string
}): Promise<{
  l1Gas: string
  l1GasPrice: string
}> => {
  const { rpcServers, nodeInterfaceAddress, destinationAddress, txData } =
    params

  const getFee = async (
    rpcUrl: string
  ): Promise<{
    l1Gas: string
    l1GasPrice: string
  }> => {
    const baseL2Provider = new ethers.providers.StaticJsonRpcProvider(rpcUrl)
    const nodeInterface = new ethers.Contract(
      nodeInterfaceAddress,
      NODE_INTERFACE_ABI,
      baseL2Provider
    )

    const gasEstimateComponents =
      await nodeInterface.callStatic.gasEstimateL1Component(
        destinationAddress,
        false,
        txData,
        {
          blockTag: 'latest'
        }
      )

    return {
      l1Gas: gasEstimateComponents.gasEstimateForL1.toString(),
      l1GasPrice: gasEstimateComponents.baseFee.toString()
    }
  }

  const out = await asyncWaterfall(
    rpcServers.map(rpcUrl => async () => await getFee(rpcUrl))
  )

  return out
}

/**
 * The L1 gas figure follows the L1 base fee, which can move several times over
 * within one L1 block, so a cached figure only spares the repeat reads while a
 * spend is being edited. A limit below the current figure fails with
 * "intrinsic gas too low".
 */
const ARBITRUM_L1_GAS_CACHE_MS = 30000

/**
 * Wraps `calcArbitrumRollupFees` to reuse the last figure for the same
 * destination and data for 30 seconds. Each engine holds its own, so an entry
 * never crosses wallets or chains.
 */
export const makeArbitrumRollupFeeCache = (): typeof calcArbitrumRollupFees => {
  let cached:
    | {
        key: string
        expiresAt: number
        l1Gas: string
        l1GasPrice: string
      }
    | undefined

  return async params => {
    const key = JSON.stringify([params.destinationAddress, params.txData])
    if (cached != null && cached.key === key && Date.now() < cached.expiresAt) {
      return { l1Gas: cached.l1Gas, l1GasPrice: cached.l1GasPrice }
    }

    const out = await calcArbitrumRollupFees(params)
    cached = { key, expiresAt: Date.now() + ARBITRUM_L1_GAS_CACHE_MS, ...out }
    return out
  }
}

/**
 * The live plain-transfer figure moves a few percent a minute, so twice the
 * quoted figure covers any spend signed soon after its quote.
 */
const ARBITRUM_L1_GAS_RAISE_CAP = '2'

/**
 * A spend keeps the gas limit it was built with, however long it waits to be
 * signed, so the L1 gas in that limit can fall behind the chain. Raises the
 * limit to the figure the chain wants right now. A lower figure changes nothing
 * because the chain refunds gas the transaction does not use.
 *
 * The raise stops at `ARBITRUM_L1_GAS_RAISE_CAP` times the figure the spend
 * was built with, so a bad reading cannot run the fee far past the quote.
 *
 * A max send leaves no room for a higher limit: the node rejects a transaction
 * whose gas and value cost more than the balance. The raise is skipped when the
 * new limit at the transaction's gas price would cost more than `gasBudget`.
 */
export const refreshArbitrumL1Gas = async (params: {
  rpcServers: string[]
  nodeInterfaceAddress: string
  otherParams: EthereumTxOtherParams
  /** The native balance less the value the transaction moves. */
  gasBudget: string
}): Promise<void> => {
  const { rpcServers, nodeInterfaceAddress, otherParams, gasBudget } = params
  const { arbitrumL1Gas, data, gas, gasPrice, to, tokenRecipientAddress } =
    otherParams
  if (arbitrumL1Gas == null) return

  const { l1Gas } = await calcArbitrumRollupFees({
    rpcServers,
    nodeInterfaceAddress,
    destinationAddress: tokenRecipientAddress ?? to[0],
    txData: data ?? '0x'
  })
  if (lte(l1Gas, arbitrumL1Gas)) return

  const raisedL1Gas = min(l1Gas, mul(arbitrumL1Gas, ARBITRUM_L1_GAS_RAISE_CAP))
  const raisedGas = add(sub(gas, arbitrumL1Gas), raisedL1Gas)
  if (gt(mul(raisedGas, gasPrice), gasBudget)) return

  otherParams.gas = raisedGas
  otherParams.arbitrumL1Gas = raisedL1Gas
}
