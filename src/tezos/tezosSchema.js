export const XtzTransactionSchema = {
  type: 'object',
  properties: {
    // type: 'object',
    block_hash: { type: 'string' },
    hash: { type: 'string' },
    network_hash: { type: 'string' },
    type: {
      type: 'object',
      properties: {
        kind: { type: 'string' },
        operations: { type: 'any' },
        source: {
          type: 'object',
          properties: {
            tz: { type: 'string' }
          },
          required: ['tz']
        }
      },
      required: ['kind', 'operations', 'source']
    }
  },
  required: ['block_hash', 'hash', 'network_hash', 'type']
}
