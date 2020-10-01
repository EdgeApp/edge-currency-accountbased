/**
 * Created by paul on 8/27/17.
 */

export const EtherscanGetBlockHeight = {
  type: 'object',
  properties: {
    result: { type: 'string' }
  },
  required: ['result']
}

export const EtherscanGetAccountNonce = {
  type: 'object',
  properties: {
    result: { type: 'string' }
  },
  required: ['result']
}

export const SuperEthGetUnconfirmedTransactions = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      block_height: { type: 'number' },
      fees: { type: 'number' },
      received: { type: 'string' },
      addresses: {
        type: 'array',
        items: { type: 'string' }
      },
      inputs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['addresses']
        }
      },
      outputs: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            addresses: {
              type: 'array',
              items: { type: 'string' }
            }
          },
          required: ['addresses']
        }
      }
    },
    required: ['fees', 'received', 'addresses', 'inputs', 'outputs']
  }
}

export const NetworkFeesSchema = {
  type: 'object',
  additionalProperties: {
    type: 'object',
    properties: {
      gasLimit: {
        type: 'object',
        properties: {
          regularTransaction: { type: 'string' },
          tokenTransaction: { type: 'string' }
        },
        required: ['regularTransaction', 'tokenTransaction']
      },
      gasPrice: {
        type: 'object',
        properties: {
          lowFee: { type: 'string' },
          standardFeeLow: { type: 'string' },
          standardFeeHigh: { type: 'string' },
          standardFeeLowAmount: { type: 'string' },
          standardFeeHighAmount: { type: 'string' },
          highFee: { type: 'string' }
        },
        required: [
          'lowFee',
          'standardFeeLow',
          'standardFeeHigh',
          'standardFeeLowAmount',
          'standardFeeHighAmount',
          'highFee'
        ]
      }
    },
    required: ['gasLimit']
  }
}

export const EthGasStationSchema = {
  type: 'object',
  properties: {
    safeLow: { type: 'number' },
    average: { type: 'number' },
    fastest: { type: 'number' }
  },
  required: ['safeLow', 'average', 'fastest']
}

export const CustomTokenSchema = {
  type: 'object',
  properties: {
    currencyCode: { type: 'string' },
    currencyName: { type: 'string' },
    multiplier: { type: 'string' },
    contractAddress: { type: 'string' }
  },
  required: ['currencyCode', 'currencyName', 'multiplier', 'contractAddress']
}

export const BlockChairStatsSchema = {
  type: 'object',
  properties: {
    data: {
      type: 'object',
      properties: {
        blocks: { type: 'number' }
      }
    }
  },
  required: ['data']
}

export const AmberdataRpcSchema = {
  type: 'object',
  properties: {
    result: { type: 'string' }
  },
  required: ['result']
}
