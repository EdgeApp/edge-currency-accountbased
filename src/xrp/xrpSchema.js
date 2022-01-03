/**
 * Created by paul on 8/27/17.
 */

export const XrpGetBalancesSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      currency: { type: 'string' },
      value: { type: 'string' }
    }
  }
}

export const XrpOnTransactionSchema = {
  type: 'object',
  properties: {
    Data: {
      type: 'object',
      properties: {
        transaction: {
          type: 'object',
          properties: {
            Account: { type: 'string' },
            Destination: { type: 'string' }
          },
          required: ['Account', 'Destination']
        }
      },
      required: ['transaction']
    }
  },
  required: ['Data']
}
