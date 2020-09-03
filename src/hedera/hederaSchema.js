/**
 * Created by Austin Bonander <austin@launchbadge.com> on 9/30/19.
 */
export const HederaGetServerInfoSchema = {
  type: 'object',
  properties: {
    buildVersion: { type: 'string' },
    validatedLedger: {
      type: 'object',
      properties: {
        age: { type: 'number' },
        baseFeeXRP: { type: 'string' },
        hash: { type: 'string' },
        ledgerVersion: { type: 'number' }
      }
    }
  }
}

export const HederaGetAccountSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      currency: { type: 'string' },
      value: { type: 'string' }
    }
  }
}

export const HederaGetTransactionsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      type: { type: 'string' },
      address: { type: 'string' },
      id: { type: 'string' },
      outcome: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          timestamp: { type: 'string' },
          fee: { type: 'string' },
          ledgerVersion: { type: 'number' },
          balanceChanges: {
            type: 'object'
          }
        }
      }
    }
  }
}
