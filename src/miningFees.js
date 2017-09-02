/**
 * Created by paul on 8/26/17.
 */

import type { EthereumFees, EthereumFee, EthereumCalcedFees } from './ethTypes.js'
import type { AbcSpendInfo } from 'airbitz-core-types'
import { normalizeAddress } from './ethUtils.js'
import { bns } from 'biggystring'

export const ES_FEE_LOW = 'low'
export const ES_FEE_STANDARD = 'standard'
export const ES_FEE_HIGH = 'high'
export const ES_FEE_CUSTOM = 'custom'

export function calcMiningFee (spendInfo: AbcSpendInfo, networkFees:EthereumFees):EthereumCalcedFees {
  const targetAddress = normalizeAddress(spendInfo.spendTargets[0].publicAddress)
  let networkFeeForGasPrice:EthereumFee = networkFees['default']
  let networkFeeForGasLimit:EthereumFee = networkFees['default']

  if (typeof networkFees[targetAddress] !== 'undefined') {
    networkFeeForGasLimit = networkFees[targetAddress]
    if (typeof networkFeeForGasLimit.gasPrice !== 'undefined') {
      networkFeeForGasPrice = networkFeeForGasLimit
    }
  }

  let useLimit = 'regularTransaction'
  if (spendInfo.currencyCode && spendInfo.currencyCode !== 'ETH') {
    useLimit = 'tokenTransaction'
  }

  let networkFeeOption = 'standard'
  if (typeof spendInfo.networkFeeOption === 'string') {
    networkFeeOption = spendInfo.networkFeeOption
  }

  const gasLimit = networkFeeForGasLimit.gasLimit[useLimit]
  let gasPrice
  let nativeAmount = spendInfo.spendTargets[0].nativeAmount
  if (useLimit === 'tokenTransaction') {
    // Small hack. Abctimate the relative value of token to ethereum as 10%
    nativeAmount = bns.div(nativeAmount, '10')
  }
  switch (networkFeeOption) {
    case ES_FEE_LOW:
      gasPrice = networkFeeForGasPrice.gasPrice.lowFee
      break
    case ES_FEE_STANDARD:
      if (bns.gte(nativeAmount, networkFeeForGasPrice.gasPrice.standardFeeHighAmount)) {
        gasPrice = networkFeeForGasPrice.gasPrice.standardFeeHigh
        break
      }
      if (bns.lte(nativeAmount, networkFeeForGasPrice.gasPrice.standardFeeLowAmount)) {
        gasPrice = networkFeeForGasPrice.gasPrice.standardFeeLow
        break
      }

      // Scale the fee by the amount the user is sending scaled between standardFeeLowAmount and standardFeeHighAmount
      const lowHighAmountDiff = bns.sub(networkFeeForGasPrice.gasPrice.standardFeeHighAmount, networkFeeForGasPrice.gasPrice.standardFeeLowAmount)
      const lowHighFeeDiff = bns.sub(networkFeeForGasPrice.gasPrice.standardFeeHigh, networkFeeForGasPrice.gasPrice.standardFeeLow)

      // How much above the lowFeeAmount is the user sending
      const amountDiffFromLow = bns.sub(nativeAmount, networkFeeForGasPrice.gasPrice.standardFeeLowAmount)

      // Add this much to the low fee = (amountDiffFromLow * lowHighFeeDiff) / lowHighAmountDiff)
      const temp1 = bns.mul(amountDiffFromLow, lowHighFeeDiff)
      const addFeeToLow = bns.div(temp1, lowHighAmountDiff)
      gasPrice = bns.add(networkFeeForGasPrice.gasPrice.standardFeeLow, addFeeToLow)
      break
    case ES_FEE_HIGH:
      gasPrice = networkFeeForGasPrice.gasPrice.highFee
      break
    case ES_FEE_CUSTOM:
      break
    default:
      throw new Error('Invalid networkFeeOption:' + networkFeeOption)
  }
  return { gasLimit, gasPrice }
}
