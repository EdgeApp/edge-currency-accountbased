export const OneGetTransactionSchema = {
  type: 'object',
  properties: {
    // type: 'object',
    blockHash: { type: 'string' },
    blockNumber: { type: 'string' },
    from: { type: 'string' },
    timestamp: { type: 'string' },
    gas: { type: 'string' },
    gasPrice: { type: 'string' },
    hash: { type: 'string' },
    input: { type: 'string' },
    nonce: { type: 'string' },
    to: { type: 'string' },
    transactionIndex: { type: 'string' },
    value: { type: 'string' },
    shardID: { type: 'number' },
    toShardID: { type: 'number' },
    v: { type: 'string' },
    r: { type: 'string' },
    s: { type: 'string' }
  },
  required: [
    'blockHash',
    'blockNumber',
    'from',
    'to',
    'timestamp',
    'hash',
    'value',
    'gas',
    'gasPrice'
  ]
}
