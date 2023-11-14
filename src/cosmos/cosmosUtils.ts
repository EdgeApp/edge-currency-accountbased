import { HttpEndpoint } from '@cosmjs/stargate'

import {
  asCosmosInitOptions,
  CosmosInitOptions,
  CosmosNetworkInfo
} from './cosmosTypes'

export const rpcWithApiKey = (
  networkInfo: CosmosNetworkInfo,
  initOptions: CosmosInitOptions
): HttpEndpoint => {
  const apiKeys = asCosmosInitOptions(initOptions) as { [key: string]: string }
  const endpoint = networkInfo.rpcNode
  const headers: { [key: string]: string } = {}
  const regex = /{{(.*?)}}/g
  for (const [key, value] of Object.entries(endpoint.headers)) {
    const match = regex.exec(value)
    if (match != null) {
      headers[key] = apiKeys[match[1]]
    }
  }

  return { url: endpoint.url, headers }
}
