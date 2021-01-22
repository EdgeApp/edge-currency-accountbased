/**
 * Created by paul on 8/27/17.
 */

import { asBoolean, asMap, asNumber, asObject, asString } from 'cleaners'

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

// export const EosGetBalancesSchema = {
//   type: 'array',
//   items: {
//     type: 'object',
//     properties: {
//       currency: { type: 'string' },
//       value: { type: 'string' }
//     }
//   }
// }

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

// export const EosGetTransactionsSchema = {
//   type: 'array',
//   items: {
//     type: 'object',
//     properties: {
//       type: { type: 'string' },
//       address: { type: 'string' },
//       id: { type: 'string' },
//       outcome: {
//         type: 'object',
//         properties: {
//           result: { type: 'string' },
//           timestamp: { type: 'string' },
//           fee: { type: 'string' },
//           ledgerVersion: { type: 'number' },
//           balanceChanges: {
//             type: 'object'
//           }
//         }
//       }
//     }
//   }
// }
