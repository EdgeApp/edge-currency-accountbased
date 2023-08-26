import {
  asEither,
  asJSON,
  asNumber,
  asObject,
  asString,
  Cleaner
} from 'cleaners'
import { EdgeFetchFunction } from 'edge-core-js/types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

//
// Response Templates
//

export interface RpcOkResponse<Result> {
  result: Result
}
export const asRpcOkResponse = <Result>(
  asResult: Cleaner<Result>
): Cleaner<RpcOkResponse<Result>> =>
  asObject({
    id: asNumber,
    jsonrpc: asString,
    result: asResult
  })

export type RpcError = ReturnType<typeof asRpcError>
export const asRpcError = asObject({
  id: asNumber,
  jsonrpc: asString,
  error: asObject({
    code: asNumber,
    message: asString
  })
})

export type RpcEnvelope<Result> = RpcOkResponse<Result> | RpcError
export const asRpcEnvelope = <Result>(
  asResult: Cleaner<Result>
): Cleaner<RpcEnvelope<Result>> =>
  asJSON(asEither(asRpcError, asRpcOkResponse(asResult)))

//
// ChainHead
//

export type RpcChainHeadResponse = ReturnType<typeof asRpcChainHeadResponse>
export const asRpcChainHeadResponse = asObject({
  Height: asNumber
})

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

export class RpcExtra {
  baseUrl: string
  fetch: EdgeFetchFunction

  constructor(baseUrl: string, fetchFn: EdgeFetchFunction) {
    this.baseUrl = baseUrl
    this.fetch = fetchFn
  }

  async getChainHead(): Promise<RpcOkResponse<RpcChainHeadResponse>> {
    const nonce = Math.floor(Math.random() * 10 ** 8)
    const response = await this.fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        id: nonce,
        jsonrpc: '2.0',
        method: 'Filecoin.ChainHead',
        params: null
      })
    })
    const responseText = await response.text()
    const responseBody = asRpcEnvelope(asRpcChainHeadResponse)(responseText)

    if ('error' in responseBody)
      throw new Error(
        `Error response code ${responseBody.error.code}: ${responseBody.error.message}`
      )

    return responseBody
  }
}
