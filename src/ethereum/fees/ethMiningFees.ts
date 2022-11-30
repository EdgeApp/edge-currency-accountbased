import { add, div, gte, lt, lte, mul, sub } from 'biggystring'
import { EdgeCurrencyInfo, EdgeSpendInfo } from 'edge-core-js/types'

import { normalizeAddress } from '../../common/utils'
import { EthereumCalcedFees, EthereumFee, EthereumFees } from '../ethTypes'

export const ES_FEE_LOW = 'low'
export const ES_FEE_STANDARD = 'standard'
export const ES_FEE_HIGH = 'high'
export const ES_FEE_CUSTOM = 'custom'

const WEI_MULTIPLIER = '1000000000'

export function calcMiningFee(
  spendInfo: EdgeSpendInfo,
  networkFees: EthereumFees,
  currencyInfo: EdgeCurrencyInfo
): EthereumCalcedFees {
  let useDefaults = true
  let customGasLimit, customGasPrice
  if (
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    spendInfo.spendTargets &&
    spendInfo.spendTargets.length > 0 &&
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    spendInfo.spendTargets[0].publicAddress
  ) {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    const { customNetworkFee } = spendInfo || {}
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
          currencyInfo.defaultSettings.otherSettings.defaultNetworkFees.default
            .gasPrice.minGasPrice
        const minGasPriceGwei = div(minGasPrice, WEI_MULTIPLIER)
        if (lt(gasPrice, minGasPriceGwei) || /^\s*$/.test(gasPrice)) {
          const e = new Error(
            `Gas Limit: ${gasLimit} Gas Price (Gwei): ${gasPrice}`
          )
          e.name = 'ErrorBelowMinimumFee'
          throw e
        }

        customGasPrice = mul(gasPrice, WEI_MULTIPLIER)
      }

      if (gasLimit != null && gasLimit !== '') {
        const minGasLimit =
          networkFees.default?.gasLimit?.minGasLimit ??
          currencyInfo.defaultSettings.otherSettings.defaultNetworkFees.default
            .gasLimit.minGasLimit
        if (lt(gasLimit, minGasLimit) || /^\s*$/.test(gasLimit)) {
          const e = new Error(
            `Gas Limit: ${gasLimit} Gas Price (Gwei): ${gasPrice}`
          )
          e.name = 'ErrorBelowMinimumFee'
          throw e
        }
        customGasLimit = gasLimit

        // useDefaults should be named useGasLimitDefaults since it only affects the gasLimit
        // Set to false since we have a custom gasLimit
        useDefaults = false
      }
    }

    if (customGasLimit != null && customGasPrice != null) {
      return {
        gasLimit: customGasLimit,
        gasPrice: customGasPrice,
        useDefaults: false
      }
    }

    // If we have incomplete fees from custom fees, calculate as normal
    const targetAddress = normalizeAddress(
      spendInfo.spendTargets[0].publicAddress
    )
    let networkFeeForGasPrice: EthereumFee = networkFees.default
    let networkFeeForGasLimit: EthereumFee = networkFees.default

    if (typeof networkFees[targetAddress] !== 'undefined') {
      networkFeeForGasLimit = networkFees[targetAddress]
      useDefaults = false
      if (typeof networkFeeForGasLimit.gasPrice !== 'undefined') {
        networkFeeForGasPrice = networkFeeForGasLimit
      }
    }

    let useLimit = 'regularTransaction'
    if (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      spendInfo.currencyCode &&
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

    // @ts-expect-error
    const gasLimit = networkFeeForGasLimit.gasLimit[useLimit]
    let gasPrice = ''
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!spendInfo.spendTargets[0].nativeAmount) {
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
          gte(
            nativeAmount,
            networkFeeForGasPrice.gasPrice.standardFeeHighAmount
          )
        ) {
          gasPrice = gasPriceObj.standardFeeHigh
          break
        }

        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (lte(nativeAmount, gasPriceObj.standardFeeLowAmount)) {
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (!networkFeeForGasPrice.gasPrice) {
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
    const out: EthereumCalcedFees = {
      gasLimit: customGasLimit ?? gasLimit,
      gasPrice: customGasPrice ?? gasPrice,
      useDefaults
    }
    return out
  } else {
    throw new Error('ErrorInvalidSpendInfo')
  }
}
