import { ServiceKeys } from './types'
import { pickRandom } from './utils'

export function getRandomServiceKey(
  serviceKeys: ServiceKeys,
  index: string
): string | undefined {
  const keys = serviceKeys[index]
  if (keys == null || keys.length === 0) return undefined
  return pickRandom(keys, 1)[0]
}

export function getServiceKeyIndex(urlString: string): string {
  const url = new URL(urlString, `https://${urlString}`)
  return url.host
}
