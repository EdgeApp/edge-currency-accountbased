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
    act: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            to: { type: 'string' },
            quantity: { type: 'string' },
            hex_data: { type: 'string' },
            memo: { type: 'string' }
          },
          required: ['from', 'to', 'quantity']
        }
      },
      required: ['data']
    },
    trx_id: { type: 'string' },
    block_time: { type: 'string' },
    block_num: { type: 'number' },
    required: [
      'act',
      'trx_id',
      'block_time',
      'block_num'
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
