import { isValidAddress } from 'xrpl'

export const makeTokenId = ({
  issuer,
  currency
}: {
  issuer: string
  currency: string
}): string => {
  if (!isValidAddress(issuer)) {
    throw new Error('InvalidTokenIssuerError')
  }

  return `${currency}-${issuer}`
}

/**
 * Routines copied from https://github.com/florent-uzio/xrpl.js-demo.git
 */

// https://xrpl.org/currency-formats.html#nonstandard-currency-codes
const NON_STANDARD_CODE_LENGTH = 40

export const convertCurrencyCodeToHex = (currencyCode: string): string => {
  if (currencyCode.length > 3) {
    return Buffer.from(currencyCode, 'ascii')
      .toString('hex')
      .toUpperCase()
      .padEnd(NON_STANDARD_CODE_LENGTH, '0')
  }
  return currencyCode
}
