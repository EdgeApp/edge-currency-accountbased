import { asMaybe, asObject, asString } from 'cleaners'
import { EdgeMetaToken, EdgeTokenMap } from 'edge-core-js'

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
 * Downgrades EdgeToken objects to the legacy EdgeMetaToken format.
 */
export function makeMetaTokens(tokens: EdgeTokenMap): EdgeMetaToken[] {
  const out: EdgeMetaToken[] = []
  for (const tokenId of Object.keys(tokens)) {
    const { currencyCode, displayName, denominations, networkLocation } =
      tokens[tokenId]

    const cleanLocation = asMaybeContractLocation(networkLocation)
    if (cleanLocation == null) continue
    out.push({
      currencyCode,
      currencyName: displayName,
      denominations,
      contractAddress: cleanLocation.contractAddress
    })
  }
  return out
}
