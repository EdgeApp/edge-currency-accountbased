import { base16 } from 'rfc4648'
import { isValidAddress } from 'xrpl'

import { utf8 } from '../common/utf8'

export function convertCurrencyCodeToHex(currencyCode: string): string {
  if (currencyCode.length <= 3) {
    return currencyCode.toUpperCase()
  }

  const hexCode = base16.stringify(utf8.parse(currencyCode)).toUpperCase()

  // Currency codes length 1-3 are used as-is. Length greater than 3 must be converted to hex and padded to 40 characters.
  // If the hex representation exceeds 40 characters, throw an error
  if (hexCode.length > 40) {
    throw new Error(
      `Currency code "${currencyCode}" exceeds maximum length: ${hexCode.length} hex characters (max 40)`
    )
  }

  return hexCode.padEnd(40, '0').toUpperCase()
}

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

  return `${convertCurrencyCodeToHex(currency)}-${issuer}`
}
