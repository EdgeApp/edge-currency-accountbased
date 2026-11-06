import { Asset, Horizon, StrKey } from '@stellar/stellar-sdk'
import { add, mul, sub } from 'biggystring'
import { EdgeToken } from 'edge-core-js/types'

import {
  asStellarNetworkLocation,
  StellarNetworkLocation
} from './stellarTypes'

/**
 * Stellar asset codes are 1-12 letters or digits.
 * Codes up to 4 characters are credit_alphanum4, longer ones credit_alphanum12.
 */
const ASSET_CODE_REGEX = /^[a-zA-Z0-9]{1,12}$/

/**
 * Names a Stellar asset the way Horizon does: `CODE-ISSUER`.
 */
export function makeTokenId(location: StellarNetworkLocation): string {
  const { code, issuer } = location
  if (!ASSET_CODE_REGEX.test(code)) {
    throw new Error('InvalidTokenCodeError')
  }
  if (!StrKey.isValidEd25519PublicKey(issuer)) {
    throw new Error('InvalidTokenIssuerError')
  }
  return `${code}-${issuer}`
}

/**
 * Builds the SDK asset an Edge token stands for.
 */
export function getTokenAsset(token: EdgeToken): Asset {
  const { code, issuer } = asStellarNetworkLocation(token.networkLocation)
  return new Asset(code, issuer)
}

/**
 * The XLM an account must keep, in stroops: two base entries plus one per
 * subentry (trustlines, offers, signers, data) it owns, counting entries it
 * sponsors for others and not entries others sponsor for it.
 */
export function getAccountReserve(
  account: Pick<
    Horizon.AccountResponse,
    'subentry_count' | 'num_sponsoring' | 'num_sponsored'
  >,
  entryReserve: string
): string {
  const entries = sub(
    add(
      add('2', String(account.subentry_count)),
      String(account.num_sponsoring)
    ),
    String(account.num_sponsored)
  )
  return mul(entries, entryReserve)
}
