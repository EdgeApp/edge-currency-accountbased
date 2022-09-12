

import { asArray, asObject, asOptional, asString } from 'cleaners'

import { safeErrorMessage } from './utils'

export const asCurrencyCodeOptions = asObject({
  currencyCode: asOptional(asString)
})

/**
 * Does the same tests that the old JSON schema used to do,
 * but with better error reporting.
 */
export function checkEdgeSpendInfo(raw: any): void {
  try {
    asPartialSpendInfo(raw)
  } catch (e) {
    throw new TypeError(`Invalid EdgeSpendInfo: ${safeErrorMessage(e)}`)
  }
}

export function checkCustomToken(raw: any): void {
  try {
    asCustomToken(raw)
  } catch (e) {
    throw new TypeError(`Invalid CustomToken: ${safeErrorMessage(e)}`)
  }
}

const asPartialSpendInfo = asObject({
  currencyCode: asOptional(asString),
  networkFeeOption: asOptional(asString),
  spendTargets: asArray(
    asObject({
      currencyCode: asOptional(asString),
      publicAddress: asString,
      nativeAmount: asOptional(asString, '0')
    })
  )
})

const asCustomToken = asObject({
  currencyCode: asString,
  currencyName: asString,
  multiplier: asString,
  contractAddress: asString
})
