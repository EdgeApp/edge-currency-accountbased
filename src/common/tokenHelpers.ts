import { gt, lt } from 'biggystring'
import { asMaybe, asObject, asString } from 'cleaners'
import { EdgeToken } from 'edge-core-js/types'

/**
 * The `networkLocation` field is untyped,
 * but many currency plugins will put a contract address in there.
 */
export const asMaybeContractLocation = asMaybe(
  asObject({
    contractAddress: asString
  })
)

/**
 * Validates common things about a token, such as its currency code.
 * Throws an exception if the token is wrong.
 */
export const validateToken = (token: EdgeToken): void => {
  if (!isCurrencyCode(token.currencyCode)) {
    throw new Error(`Invalid currency code "${token.currencyCode}"`)
  }

  // We cannot validate the display name, since it's for humans.
  // Names like "AAVE Interest Bearing BAT" and "0x" would break
  // the old length heuristic we had.

  for (const denomination of token.denominations) {
    if (!isCurrencyCode(denomination.name)) {
      throw new Error(`Invalid denomination name "${denomination.name}"`)
    }

    if (
      lt(denomination.multiplier, '1') ||
      gt(denomination.multiplier, '100000000000000000000000000000000')
    ) {
      throw new Error('ErrorInvalidMultiplier')
    }
  }
}

/**
 * Validates a currency code.
 * Accepts any non-empty string that does not contain leading or trailing whitespace.
 * Some weird but valid examples include:
 * T, BUSD.e, xBOO, 1INCH, BADGER, BSC-USD, $CWIF, DOGE MEME, etc.
 */
export const isCurrencyCode = (code: string): boolean => {
  return typeof code === 'string' && code.length > 0 && code.trim() === code
}
