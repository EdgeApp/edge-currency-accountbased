import { ServiceKeys } from './types'
import { pickRandom } from './utils'

/**
 * Retrieves a random service key (API key) for a given host index.
 *
 * @param serviceKeys - An object mapping host strings to arrays of API keys
 * @param index - The host string to look up (typically obtained from getServiceKeyIndex)
 * @returns A randomly selected API key string, or undefined if no keys are available for the given index
 *
 * @example
 * ```typescript
 * const serviceKeys = {
 *   'api.example.com': ['key1', 'key2', 'key3']
 * }
 * const key = getRandomServiceKey(serviceKeys, 'api.example.com')
 * // Returns one of: 'key1', 'key2', or 'key3'
 * ```
 */
export function getRandomServiceKey(
  serviceKeys: ServiceKeys,
  index: string
): string | undefined {
  const keys = serviceKeys[index]
  if (keys == null || keys.length === 0) return undefined
  return pickRandom(keys, 1)[0]
}

/**
 * Extracts the host from a URL string to use as an index for ServiceKeys.
 *
 * This function normalizes URLs by constructing a proper URL object, which handles
 * both full URLs and host-only strings. The host is used as the key to look up
 * service keys in the ServiceKeys object.
 *
 * The reason for this function is to define the index or key for the
 * ServiceKey object from a URL string to determine the relevant API keys for
 * the service provider.
 *
 * @param urlString - A URL string or host string (e.g., 'https://api.example.com' or 'api.example.com')
 * @returns The host portion of the URL (e.g., 'api.example.com')
 *
 * @example
 * ```typescript
 * getServiceKeyIndex('https://api.example.com/path') // Returns 'api.example.com'
 * getServiceKeyIndex('api.example.com') // Returns 'api.example.com'
 * ```
 */
export function getServiceKeyIndex(urlString: string): string {
  const url = new URL(urlString, `https://${urlString}`)
  return url.host
}
