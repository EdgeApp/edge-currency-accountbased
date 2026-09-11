/**
 * The hostname of Blockscout's hosted API, which indexes many chains behind
 * one origin and bills per API key. Every other Blockscout is an instance
 * someone runs for a single chain, reachable at its own origin without a key.
 */
export const BLOCKSCOUT_PRO_HOST = 'api.blockscout.com'

/**
 * The URL for one evmscan-family command against `server`.
 *
 * The three server shapes differ only in how the chain is named. Etherscan's
 * v2 API multiplexes its chains behind `etherscan.io` and takes `chainid`;
 * Blockscout's hosted API does the same behind `api.blockscout.com` and takes
 * `chain_id`; a self-hosted Blockscout serves one chain from its own origin
 * and takes neither, so its command is the whole query string.
 *
 * `cmd` is the query a caller built, starting with `?`. The multiplexed
 * routes have already opened the query with the chain parameter, so its `?`
 * becomes an `&` there.
 */
export function makeEvmScanUrl(
  server: string,
  cmd: string,
  chainId: number
): string {
  const query = cmd.startsWith('?') ? cmd.replace('?', '&') : cmd

  if (server.includes('etherscan.io')) {
    return `${server}/v2/api?chainid=${chainId}${query}`
  }
  if (server.includes(BLOCKSCOUT_PRO_HOST)) {
    return `${server}/v2/api?chain_id=${chainId}${query}`
  }
  return `${server}/api${cmd}`
}
