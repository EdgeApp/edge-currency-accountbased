import type { EdgeToken, EdgeTokenMap } from 'edge-core-js/types'

import {
  asMaybeContractLocation,
  createCosmosTokenId
} from '../../common/tokenHelpers'

interface ThorchainTokenIdOpts {
  /** The plugin's token map, which grows as remote tokens are accepted. */
  builtinTokens: EdgeTokenMap
  currencyCode: string
  nativeDenom: string
}

/**
 * Makes the `createTokenId` method used to accept remote token definitions.
 *
 * THORChain tokens are plain bank denoms, which are always lowercase.
 * A definition is rejected when its denom is malformed or is the native
 * denom, or when its currency code is already taken by the native asset or
 * by another token, since the engine looks tokens up by both.
 */
export const makeThorchainCreateTokenId = (
  opts: ThorchainTokenIdOpts
): ((token: EdgeToken) => string) => {
  const { builtinTokens, currencyCode, nativeDenom } = opts

  return token => {
    const tokenId = createCosmosTokenId(token)
    const { contractAddress = '' } =
      asMaybeContractLocation(token.networkLocation) ?? {}

    if (
      contractAddress !== contractAddress.toLowerCase() ||
      contractAddress === nativeDenom
    ) {
      throw new Error('ErrorInvalidContractAddress')
    }

    const tokenCode = token.currencyCode.toUpperCase()
    const isCodeTaken =
      tokenCode === currencyCode.toUpperCase() ||
      Object.keys(builtinTokens).some(
        knownId =>
          knownId !== tokenId &&
          builtinTokens[knownId].currencyCode.toUpperCase() === tokenCode
      )
    if (isCodeTaken) {
      throw new Error(`Duplicate currency code "${token.currencyCode}"`)
    }

    return tokenId
  }
}
