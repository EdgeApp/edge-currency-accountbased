/**
 * Created by paul on 8/27/17.
 */

import {
  asArray,
  asBoolean,
  asMap,
  asNumber,
  asObject,
  asOptional,
  asString
} from 'cleaners'

export const asGetAccountActivationQuote = asObject({
  amount: asString,
  currencyCode: asString,
  expireTime: asNumber,
  paymentAddress: asString
})

export const asGetActivationSupportedCurrencies = asObject({
  result: asMap(asBoolean)
})

export const asGetActivationCost = asObject({
  cpu: asNumber,
  net: asNumber,
  ram: asNumber
})

export const asHyperionTransaction = asObject({
  trx_id: asString,
  '@timestamp': asString,
  block_num: asNumber,
  act: asObject({
    authorization: asOptional(
      asArray(
        asObject({
          actor: asString,
          permission: asString
        })
      )
    ),
    data: asObject({
      from: asString,
      to: asString,
      amount: asNumber,
      symbol: asString,
      memo: asString
    })
  })
})

export const asHyperionGetTransactionResponse = asObject({
  actions: asArray(asHyperionTransaction)
})

export const asDfuseGetKeyAccountsResponse = asObject({
  account_names: asArray(asString)
})

export const asDfuseTransaction = asObject({
  trace: asObject({
    block: asObject({
      num: asNumber,
      timestamp: asString
    }),
    id: asString,
    matchingActions: asArray(
      asObject({
        json: asObject({
          from: asString,
          memo: asString,
          quantity: asString,
          to: asString
        }),
        authorization: asArray(
          asObject({
            actor: asString,
            permission: asString
          })
        )
      })
    )
  })
})

export const asDfuseGetTransactionsResponse = asObject({
  data: asObject({
    searchTransactionsBackward: asObject({
      results: asArray(asDfuseTransaction)
    })
  })
})

export const asDfuseGetTransactionsErrorResponse = asObject({
  errors: asArray(
    asObject({
      message: asString,
      extensions: asObject({
        code: asString,
        terminal: asBoolean
      })
    })
  )
})

export const dfuseGetTransactionsQueryString = `
query ($query: String!, $limit: Int64, $low: Int64, $high: Int64) {
  searchTransactionsBackward(query: $query, lowBlockNum: $low, highBlockNum: $high, limit: $limit) {
    results {
      trace {
        block {
          num
          timestamp
        }
        id
        matchingActions {
          json
        }
      }
    }
  }
}
`

// note that transfers are regular EOS transactions
export const EosTransactionSuperNodeSchema = {
  type: 'object',
  properties: {
    act: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            amount: { type: 'number' },
            symbol: { type: 'string' },
            memo: { type: 'string' }
          },
          required: ['from', 'to', 'amount'],
          authorization: { type: 'object' }
        }
      },
      required: ['data']
    },
    trx_id: { type: 'string' },
    '@timestamp': { type: 'string' },
    block_num: { type: 'number' },
    required: ['act', 'trx_id', '@timestamp', 'block_num']
  }
}
