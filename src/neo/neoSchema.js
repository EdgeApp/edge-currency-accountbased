export const NeoTransactonOnline = {
  type: 'object',
  properties: {
    txid: { type: 'string' },
    size: { type: 'number' },
    type: { type: 'string' },
    version: { type: 'number' },
    attributes: { type: 'array' },
    vin: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          txid: { type: 'string' },
          vout: { type: 'number' }
        }
      }
    },
    vout: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          n: { type: 'number' },
          asset: { type: 'string' },
          value: { type: 'number' },
          address: { type: 'string' }
        }
      }
    },
    sys_fee: { type: 'number' },
    net_fee: { type: 'number' },
    scripts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          invocation: { type: 'string' },
          verification: { type: 'string' }
        }
      }
    },
    blockhash: { type: 'string' },
    confirmations: { type: 'number' },
    blockTime: { type: 'number' }
  }
}
