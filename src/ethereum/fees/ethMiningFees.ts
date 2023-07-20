import Common from '@ethereumjs/common'
import { Transaction } from '@ethereumjs/tx'
import { add, div, gte, lt, lte, mul, sub } from 'biggystring'
import { EdgeCurrencyInfo, EdgeSpendInfo } from 'edge-core-js/types'

import { decimalToHex, normalizeAddress } from '../../common/utils'
import {
  CalcL1RollupFeeParams,
  EthereumFee,
  EthereumFees,
  EthereumMiningFees,
  EthereumNetworkInfo
} from '../ethereumTypes'

export const ES_FEE_LOW = 'low'
export const ES_FEE_STANDARD = 'standard'
export const ES_FEE_HIGH = 'high'
export const ES_FEE_CUSTOM = 'custom'

const WEI_MULTIPLIER = '1000000000'

export function calcMiningFees(
  spendInfo: EdgeSpendInfo,
  networkFees: EthereumFees,
  currencyInfo: EdgeCurrencyInfo,
  networkInfo: EthereumNetworkInfo
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
      const minGasPrice =
        networkFees.default?.gasPrice?.minGasPrice ??
        networkInfo.defaultNetworkFees.default.gasPrice?.minGasPrice
      if (minGasPrice != null) {
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
      const minGasLimit =
        networkFees.default?.gasLimit?.minGasLimit ??
        networkInfo.defaultNetworkFees.default.gasLimit?.minGasLimit
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

  let networkFeeForGasPrice: EthereumFee = networkFees.default
  let networkFeeForGasLimit: EthereumFee = networkFees.default

  if (typeof spendInfo.spendTargets[0]?.publicAddress === 'string') {
    // If we have incomplete fees from custom fees, calculate as normal
    const targetAddress = normalizeAddress(
      spendInfo.spendTargets[0].publicAddress
    )
    if (typeof networkFees[targetAddress] !== 'undefined') {
      networkFeeForGasLimit = networkFees[targetAddress]
      useGasLimitDefaults = false
      if (typeof networkFeeForGasLimit.gasPrice !== 'undefined') {
        networkFeeForGasPrice = networkFeeForGasLimit
      }
    }
  }

  let useLimit: 'regularTransaction' | 'tokenTransaction' = 'regularTransaction'
  if (
    spendInfo.currencyCode != null &&
    spendInfo.currencyCode !== currencyInfo.currencyCode
  ) {
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
  const out: EthereumMiningFees = {
    gasLimit: customGasLimit ?? gasLimit,
    gasPrice: customGasPrice ?? gasPrice,
    useEstimatedGasLimit: useGasLimitDefaults
  }
  return out
}

const MAX_SIGNATURE_COST = '1040' // (32 + 32 + 1) * 16 max cost for adding r, s, v signatures to raw transaction

// This is a naive (optimistic??) implementation but is good enough as an
// estimate since it isn't possible to calculate this exactly without having
// signatures yet.
export const calcL1RollupFees = (params: CalcL1RollupFeeParams): string => {
  const {
    chainParams,
    data,
    dynamicOverhead,
    fixedOverhead,
    gasPriceL1Wei,
    gasLimit,
    nonce,
    to,
    value = '0x0'
  } = params

  const common = Common.custom(chainParams)
  const tx = Transaction.fromTxData(
    {
      nonce: nonce != null ? decimalToHex(nonce) : undefined,
      gasPrice: decimalToHex(gasPriceL1Wei),
      gasLimit: decimalToHex(gasLimit),
      to,
      value,
      data
    },
    { common }
  )

  const unsignedRawTxData = tx
    .raw()
    .map(buff => buff.toString('hex'))
    .join()
  const unsignedRawTxBytesArray = unsignedRawTxData.match(/(.{1,2})/g)
  if (unsignedRawTxBytesArray == null) {
    throw new Error('Invalid rawTx string')
  }

  let rawTxCost = 0
  for (let i = 0; i < unsignedRawTxBytesArray.length; i++) {
    if (unsignedRawTxBytesArray[i] === '00') {
      rawTxCost += 4 // cost for zero byte
    } else {
      rawTxCost += 16 // cost for non-zero byte
    }
  }

  const gasUsed = add(
    add(rawTxCost.toString(), fixedOverhead),
    MAX_SIGNATURE_COST
  )

  const scalar = div(dynamicOverhead, '1000000', 18)

  const total = mul(mul(gasPriceL1Wei, gasUsed), scalar)

  return total
}
