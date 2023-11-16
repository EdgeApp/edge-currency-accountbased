import { JsonRpcRequest, JsonRpcSuccessResponse } from '@cosmjs/json-rpc'
import { HttpEndpoint, StargateClient } from '@cosmjs/stargate'
import {
  RpcClient,
  Tendermint34Client,
  Tendermint37Client,
  TendermintClient
} from '@cosmjs/tendermint-rpc'
import { EdgeFetchFunction } from 'edge-core-js/types'

import {
  asCosmosInitOptions,
  CosmosInitOptions,
  CosmosNetworkInfo
} from './cosmosTypes'
import { Asset } from './info/proto/thorchainrune/thorchain/v1/common/common'

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

const createRpcClient = (
  fetch: EdgeFetchFunction,
  endpoint: HttpEndpoint
): RpcClient => {
  const { url, headers } = endpoint

  return {
    execute: async (
      request: JsonRpcRequest
    ): Promise<JsonRpcSuccessResponse> => {
      const opts = {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      }
      const res = await fetch(url, opts)
      const json = await res.json()
      return json
    },
    disconnect: () => {}
  }
}

const createTendermintClient = async (
  rpc: RpcClient
): Promise<TendermintClient> => {
  const tm37Client = await Tendermint37Client.create(rpc)
  const version = (await tm37Client.status()).nodeInfo.version
  if (version.startsWith('0.37.')) {
    return tm37Client
  } else {
    const tm34Client = await Tendermint34Client.create(rpc)
    return tm34Client
  }
}

export const createStargateClient = async (
  fetch: EdgeFetchFunction,
  endpoint: HttpEndpoint
): Promise<StargateClient> => {
  return await StargateClient.create(
    await createTendermintClient(createRpcClient(fetch, endpoint))
  )
}

// from THORSwap
export const assetFromString = (assetString: string): Asset => {
  const [chain, ...symbolArray] = assetString.split('.') as [
    string,
    ...Array<string | undefined>
  ]
  const synth = assetString.includes('/')
  const symbol = symbolArray.join('.')
  const ticker = symbol?.split('-')?.[0]

  return { chain, symbol, ticker, synth }
}
