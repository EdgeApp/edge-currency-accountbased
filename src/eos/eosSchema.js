/**
 * Created by paul on 8/27/17.
 */

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

export const EosTransactionSuperNodeSchema = {
  type: 'object',
  properties: {
    txid: { type: 'string' },
    date: { type: 'string' },
    currencyCode: { type: 'string' },
    blockHeight: { type: 'number' },
    networkFee: { type: 'string' },
    parentNetworkFee: { type: 'string' },
    exchangeAmount: { type: 'string' },
    otherParams: {
      type: 'object',
      properties: {
        fromAddress: { type: 'string' },
        toAddress: { type: 'string' }
      },
      required: [ 'fromAddress', 'toAddress' ]
    },
    required: [
      'txid',
      'date',
      'currencyCode',
      'blockHeight',
      'networkFee',
      'parentNetworkFee',
      'exchangeAmount',
      'otherParams'
    ]
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
