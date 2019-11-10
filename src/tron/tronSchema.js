export const TronApiNodeInfo = {
  type: 'object',
  properties: {
    blockID: { type: 'string' },
    block_header: {
      type: 'object',
      properties: {
        raw_data: {
          type: 'object',
          number: { type: 'number' },
          txTrieRoot: { type: 'string' },
          witness_address: { type: 'string' },
          parentHash: { type: 'string' },
          version: { type: 'number' },
          timestamp: { type: 'number' }
        },
        required: ['number'],
        witness_signature: { type: 'string' }
      }
    }
  },
  required: ['blockID', 'block_header']
}

export const TronApiAccountBalance = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          balance: { type: 'number' },
          free_net_usage: { type: 'number' },
          trc20: { type: 'array' }
        },
        required: ['balance']
      }
    }
  }
}

export const TronApiGetTransactions = {
  type: 'object',
  properties: {
    data: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          raw_data: {
            type: 'object',
            properties: {
              contract: {
                type: 'array',
                items: {
                  type: 'object',
                  parameter: {
                    type: 'object',
                    properties: {
                      value: {
                        type: 'object',
                        properties: {
                          amount: { type: 'number' },
                          owner_address: { type: 'string' },
                          to_address: { type: 'string' }
                        },
                        required: ['amount', 'owner_address', 'to_address']
                      }
                    },
                    required: ['value']
                  }
                  // type: { type: 'string' }
                }
                // required: ['parameter']
              }
            },
            required: ['contract']
          }
        }
      }
    },
    required: ['raw_data']
  },
  required: ['data']
}

export const TxInfoSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    fee: { type: 'number' },
    blockNumber: { type: 'number' },
    blocktimeStamp: { type: 'number' },
    contractResult: { type: 'array' },
    receipt: { type: 'object' }
  },
  required: ['blockNumber']
}
