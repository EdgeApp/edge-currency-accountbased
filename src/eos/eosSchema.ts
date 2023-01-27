import { ABIDef } from '@greymass/eosio'
import {
  asArray,
  asBoolean,
  asNumber,
  asObject,
  asOptional,
  asString,
  asTuple,
  asValue
} from 'cleaners'

export const asGetAccountActivationQuote = asObject({
  amount: asString,
  currencyCode: asString,
  expireTime: asNumber,
  paymentAddress: asString
})

export const asGetActivationSupportedCurrencies = asObject({
  result: asObject(asBoolean)
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

export const asEosTransactionSuperNodeSchema = asObject({
  act: asObject({
    data: asObject({
      from: asString,
      to: asString,
      amount: asNumber,
      symbol: asString,
      memo: asOptional(asString)
    })
  }),
  trx_id: asString,
  '@timestamp': asString,
  block_num: asNumber
})

export const asEosTransfer = asObject({
  account: asString,
  name: asValue('transfer'),
  authorization: asTuple(
    asObject({
      actor: asString,
      permission: asValue('active')
    })
  ),
  data: asObject({
    from: asString,
    to: asString,
    quantity: asString,
    memo: asOptional(asString)
  })
})

export type EosTransfer = ReturnType<typeof asEosTransfer>

export const asEosOtherParams = asObject({
  actions: asArray(asEosTransfer),
  signatures: asArray(asString)
})

export type EosOtherParams = ReturnType<typeof asEosOtherParams>

export const transferAbi: ABIDef = {
  structs: [
    {
      base: '',
      name: 'transfer',
      fields: [
        { name: 'from', type: 'name' },
        { name: 'to', type: 'name' },
        { name: 'quantity', type: 'asset' },
        { name: 'memo', type: 'string' }
      ]
    }
  ],
  actions: [{ name: 'transfer', type: 'transfer', ricardian_contract: '' }]
}
