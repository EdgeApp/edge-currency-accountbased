/**
 * Created by paul on 8/27/17.
 */

export const XrpGetServerInfoSchema = {
  type: 'object',
  properties: {
    buildVersion: {type: 'string'},
    validatedLedger: {
      type: 'object',
      properties: {
        age: {type: 'number'},
        baseFeeXRP: {type: 'string'},
        hash: {type: 'string'},
        ledgerVersion: {type: 'number'}
      }
    }
  }
}

export const XrpGetBalancesSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      currency: {type: 'string'},
      value: {type: 'string'}
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
          required: [ 'Account', 'Destination' ]
        }
      },
      required: [ 'transaction' ]
    }
  },
  required: [ 'Data' ]
}

export const XrpGetTransactionsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      type: {type: 'string'},
      address: {type: 'string'},
      id: {type: 'string'},
      outcome: {
        type: 'object',
        properties: {
          result: {type: 'string'},
          timestamp: {type: 'string'},
          fee: {type: 'string'},
          ledgerVersion: {type: 'number'},
          balanceChanges: {
            type: 'object'
          }
        }
      }
    }
  }
}
