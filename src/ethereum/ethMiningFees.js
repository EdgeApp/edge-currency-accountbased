/**
 * Created by paul on 8/26/17.
 * @flow
 */

import { bns } from 'biggystring'
import type { EdgeCurrencyInfo, EdgeSpendInfo } from 'edge-core-js/types'

import { normalizeAddress } from '../common/utils.js'
import type {
  EthereumCalcedFees,
  EthereumFee,
  EthereumFees
} from './ethTypes.js'

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
  if (
    spendInfo.spendTargets &&
    spendInfo.spendTargets.length &&
    spendInfo.spendTargets[0].publicAddress
  ) {
    const { customNetworkFee } = spendInfo || {}
    if (spendInfo.networkFeeOption === ES_FEE_CUSTOM && customNetworkFee) {
      const { gasLimit, gasPrice } = customNetworkFee
      const {
        gasLimit: { minGasLimit },
        gasPrice: { minGasPrice }
      } = currencyInfo.defaultSettings.otherSettings.defaultNetworkFees.default
      const minGasPriceGwei = bns.div(minGasPrice, WEI_MULTIPLIER)
      if (
        bns.lt(gasLimit, minGasLimit) ||
        bns.lt(gasPrice, minGasPriceGwei) ||
        isNaN(gasLimit) ||
        isNaN(gasPrice) ||
        /^\s*$/.test(gasLimit) ||
        /^\s*$/.test(gasPrice)
      ) {
        const e = new Error(
          `Gas Limit: ${minGasLimit} Gas Price (Gwei): ${minGasPriceGwei}`
        )
        e.name = 'ErrorBelowMinimumFee'
        throw e
      }

      const gasPriceWei = bns.mul(gasPrice, WEI_MULTIPLIER)
      return { gasLimit, gasPrice: gasPriceWei, useDefaults: false }
    }
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
      spendInfo.currencyCode &&
      spendInfo.currencyCode !== currencyInfo.currencyCode
    ) {
      useLimit = 'tokenTransaction'
    }

    let networkFeeOption = 'standard'
    if (typeof spendInfo.networkFeeOption === 'string') {
      networkFeeOption = spendInfo.networkFeeOption
    }

    const gasLimit = networkFeeForGasLimit.gasLimit[useLimit]
    let gasPrice = ''
    if (!spendInfo.spendTargets[0].nativeAmount) {
      throw new Error('ErrorInvalidNativeAmount')
    }
    let nativeAmount = spendInfo.spendTargets[0].nativeAmount
    if (useLimit === 'tokenTransaction') {
      // Small hack. Edgetimate the relative value of token to ethereum as 10%
      nativeAmount = bns.div(nativeAmount, '10')
    }
    if (!networkFeeForGasPrice.gasPrice) {
      throw new Error('ErrorInvalidGasPrice')
    }
    const gasPriceObj = networkFeeForGasPrice.gasPrice
    switch (networkFeeOption) {
      case ES_FEE_LOW:
        gasPrice = gasPriceObj.lowFee
        break
      case ES_FEE_STANDARD: {
        if (
          bns.gte(
            nativeAmount,
            networkFeeForGasPrice.gasPrice.standardFeeHighAmount
          )
        ) {
          gasPrice = gasPriceObj.standardFeeHigh
          break
        }
        if (bns.lte(nativeAmount, gasPriceObj.standardFeeLowAmount)) {
          if (!networkFeeForGasPrice.gasPrice) {
            throw new Error('ErrorInvalidGasPrice')
          }
          gasPrice = networkFeeForGasPrice.gasPrice.standardFeeLow
          break
        }

        // Scale the fee by the amount the user is sending scaled between standardFeeLowAmount and standardFeeHighAmount
        const lowHighAmountDiff = bns.sub(
          gasPriceObj.standardFeeHighAmount,
          gasPriceObj.standardFeeLowAmount
        )
        const lowHighFeeDiff = bns.sub(
          gasPriceObj.standardFeeHigh,
          gasPriceObj.standardFeeLow
        )

        // How much above the lowFeeAmount is the user sending
        const amountDiffFromLow = bns.sub(
          nativeAmount,
          gasPriceObj.standardFeeLowAmount
        )

        // Add this much to the low fee = (amountDiffFromLow * lowHighFeeDiff) / lowHighAmountDiff)
        const temp1 = bns.mul(amountDiffFromLow, lowHighFeeDiff)
        const addFeeToLow = bns.div(temp1, lowHighAmountDiff)
        gasPrice = bns.add(gasPriceObj.standardFeeLow, addFeeToLow)
        break
      }

      case ES_FEE_HIGH:
        gasPrice = networkFeeForGasPrice.gasPrice.highFee
        break
      default:
        throw new Error(`Invalid networkFeeOption`)
    }
    const out: EthereumCalcedFees = { gasLimit, gasPrice, useDefaults }
    return out
  } else {
    throw new Error('ErrorInvalidSpendInfo')
  }
}
