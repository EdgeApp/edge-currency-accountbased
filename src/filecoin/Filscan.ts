import {
  asArray,
  asEither,
  asJSON,
  asMaybe,
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

export interface FilscanOkResponse<Result> {
  result: Result
}
export const asFilscanOkResponse = <Result>(
  asResult: Cleaner<Result>
): Cleaner<FilscanOkResponse<Result>> =>
  asObject({
    result: asResult
  })

export type FilscanError = ReturnType<typeof asFilscanError>
export const asFilscanError = asObject({
  code: asNumber,
  message: asString
})

export type FilscanEnvelope<Result> = FilscanOkResponse<Result> | FilscanError
export const asFilscanEnvelope = <Result>(
  asResult: Cleaner<Result>
): Cleaner<FilscanEnvelope<Result>> =>
  asJSON(asEither(asFilscanError, asFilscanOkResponse(asResult)))

//
// Nominal Types
//

export type FilscanMessage = ReturnType<typeof asFilscanMessage>
export const asFilscanMessage = asObject({
  height: asNumber,
  block_time: asNumber,
  cid: asString,
  from: asString,
  to: asString,
  value: asString,
  exit_code: asString,
  method_name: asString
})

//
// Account Info
//

export type FilscanAccountInfoResult = ReturnType<
  typeof asFilscanAccountInfoResponse
>
export const asFilscanAccountInfoResponse = asObject({
  account_type: asString,
  account_info: asObject({
    account_basic: asObject({
      account_id: asString,
      account_address: asString,
      account_type: asString,
      account_balance: asString,
      nonce: asNumber,
      code_cid: asString,
      create_time: asString,
      latest_transfer_time: asString
    })
  })
})

//
// Messages
//

export type FilscanMessagesResult = ReturnType<typeof asFilscanMessagesResult>
export const asFilscanMessagesResult = asObject({
  messages_by_account_id_list: asMaybe(asArray(asFilscanMessage), () => []),
  total_count: asNumber
})

//
// Message Details
//

export type FilscanMessageDetailsResult = ReturnType<
  typeof asFilscanMessageDetailsResult
>
export const asFilscanMessageDetailsResult = asObject({
  MessageDetails: asObject({
    message_basic: asObject({
      height: asNumber,
      block_time: asNumber,
      cid: asString,
      from: asString,
      to: asString,
      value: asString,
      exit_code: asString,
      method_name: asString
    }),
    blk_cids: asArray(asString),
    consume_list: asArray(
      asObject({
        from: asString,
        to: asString,
        value: asString,
        consume_type: asString
      })
    ),
    version: asNumber,
    nonce: asNumber,
    gas_fee_cap: asString,
    gas_premium: asString,
    gas_limit: asNumber,
    gas_used: asString,
    base_fee: asString,
    all_gas_fee: asString,
    // params_detail: asNull
    // returns_detail: asNull
    eth_message: asString
  })
})

// -----------------------------------------------------------------------------
// Implementation
// -----------------------------------------------------------------------------

export class Filscan {
  baseUrl: string
  fetch: EdgeFetchFunction

  constructor(baseUrl: string, fetchFn: EdgeFetchFunction) {
    this.baseUrl = baseUrl
    this.fetch = fetchFn
  }

  async getAccountInfo(accountId: string): Promise<FilscanAccountInfoResult> {
    const response = await this.fetch(`${this.baseUrl}/AccountInfoByID`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        account_id: accountId
      })
    })
    const responseText = await response.text()
    const responseBody = asFilscanEnvelope(asFilscanAccountInfoResponse)(
      responseText
    )

    if (!('result' in responseBody))
      throw new Error(
        `Error response code ${responseBody.code}: ${responseBody.message}`
      )

    return responseBody.result
  }

  async getAccountMessages(
    accountId: string,
    index: number,
    limit: number = 20
  ): Promise<FilscanMessagesResult> {
    const response = await this.fetch(`${this.baseUrl}/MessagesByAccountID`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        account_id: accountId,
        address: '',
        filters: {
          index,
          page: 0,
          limit,
          method_name: ''
        }
      })
    })
    const responseText = await response.text()
    const responseBody = asFilscanEnvelope(asFilscanMessagesResult)(
      responseText
    )

    if (!('result' in responseBody))
      throw new Error(
        `Error response code ${responseBody.code}: ${responseBody.message}`
      )

    return responseBody.result
  }

  async getMessageDetails(
    messageCid: string
  ): Promise<FilscanMessageDetailsResult> {
    const response = await this.fetch(`${this.baseUrl}/MessageDetails`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        message_cid: messageCid
      })
    })
    const responseText = await response.text()
    const responseBody = asFilscanEnvelope(asFilscanMessageDetailsResult)(
      responseText
    )

    if (!('result' in responseBody))
      throw new Error(
        `Error response code ${responseBody.code}: ${responseBody.message}`
      )

    return responseBody.result
  }
}
