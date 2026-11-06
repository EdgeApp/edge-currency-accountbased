import { Asset, StrKey } from '@stellar/stellar-sdk'
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
