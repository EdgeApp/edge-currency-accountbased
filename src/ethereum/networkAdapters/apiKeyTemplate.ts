import { EthereumEngine } from '../EthereumEngine'
import { asEthereumInitKeys } from '../ethereumTypes'

/**
 * Replaces a `{{initOptionKey}}` placeholder in a server URL with the matching
 * value from the engine's init options. Throws when the option is missing or
 * not a string, so callers can drop that server from their list.
 */
export function resolveServerApiKey(
  url: string,
  ethEngine: EthereumEngine
): string {
  const regex = /{{(.*?)}}/g
  const match = regex.exec(url)
  if (match == null) return url

  const cleanKey = asEthereumInitKeys(match[1])
  const apiKey = ethEngine.initOptions[cleanKey]
  if (typeof apiKey === 'string') {
    return url.replace(match[0], apiKey)
  }
  if (apiKey == null) {
    throw new Error(
      `Missing ${cleanKey} in 'initOptions' for ${ethEngine.currencyInfo.pluginId}`
    )
  }
  throw new Error('Incorrect apikey type for RPC')
}
