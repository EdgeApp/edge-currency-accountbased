import {
  asArray,
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

export type FilfoxError = ReturnType<typeof asFilfoxError>
export const asFilfoxError = asObject({
  statusCode: asNumber,
  message: asString,
  error: asString
})

export type FilfoxEnvelope<Result> = Result | FilfoxError
export const asFilfoxEnvelope = <Result>(
  asResult: Cleaner<Result>
): Cleaner<FilfoxEnvelope<Result>> => asJSON(asEither(asFilfoxError, asResult))

//
// Nominal Types
//

export type FilfoxMessage = ReturnType<typeof asFilfoxMessage>
export const asFilfoxMessage = asObject({
  cid: asString,
  from: asString,
  height: asNumber,
  method: asString,
  nonce: asNumber,
  reciept: asObject({
    exitCode: asNumber
  }),
  timestamp: asNumber,
  to: asString,
  value: asString
})

//
// Messages
//

export type FilfoxMessagesResult = ReturnType<typeof asFilfoxMessagesResult>
export const asFilfoxMessagesResult = asObject({
  messages: asArray(asFilfoxMessage),
  totalCount: asNumber
})

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

export class Filfox {
  baseUrl: string
  fetch: EdgeFetchFunction

  constructor(baseUrl: string, fetchFn: EdgeFetchFunction) {
    this.baseUrl = baseUrl
    this.fetch = fetchFn
  }

  async getAccountMessages(
    address: string,
    page: number,
    pageSize: number = 20
  ): Promise<FilfoxMessagesResult> {
    const url = new URL(`${this.baseUrl}/address/${address}/messages`)
    const searchParams = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString()
    })
    url.search = searchParams.toString()
    const response = await this.fetch(url.toString(), {
      method: 'GET',
      headers: {
        'content-type': 'application/json'
      }
    })
    const responseText = await response.text()
    const responseBody = asFilfoxEnvelope(asFilfoxMessagesResult)(responseText)

    if ('error' in responseBody)
      throw new Error(
        `Error response code ${responseBody.statusCode}: ${responseBody.message} ${responseBody.error}`
      )

    return responseBody
  }
}
