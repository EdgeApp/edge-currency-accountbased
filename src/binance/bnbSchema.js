/**
 * Created by paul on 8/27/17.
 */

export const BinanceApiNodeInfo = {
  type: 'object',
  properties: {
    sync_info: {
      type: 'object',
      properties: {
        latest_block_hash: { type: 'string' },
        latest_app_hash: { type: 'string' },
        latest_block_height: { type: 'number' },
        latest_block_time: { type: 'string' },
        catching_up: { type: 'boolean' }
      }
    }
  },
  required: ['sync_info']
}

export const BinanceApiAccountBalance = {
  type: 'object',
  properties: {
    address: { type: 'string' },
    balances: {
      type: 'array',
      items: {
        free: { type: 'string' },
        frozen: { type: 'string' },
        locked: { type: 'string' },
        symbol: { type: 'string' }
      }
    }
  },
  required: ['balances', 'address']
}

// export const EtherscanGetAccountNonce = EtherscanGetAccountBalance

export const EtherscanGetTransactions = {
  type: 'object',
  properties: {
    result: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blockNumber: { type: 'string' },
          timeStamp: { type: 'string' },
          hash: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          nonce: { type: 'string' },
          value: { type: 'string' },
          gas: { type: 'string' },
          gasPrice: { type: 'string' },
          cumulativeGasUsed: { type: 'string' },
          gasUsed: { type: 'string' },
          confirmations: { type: 'string' }
        },
        required: [
          'blockNumber',
          'timeStamp',
          'hash',
          'from',
          'to',
          'nonce',
          'value',
          'gas',
          'gasPrice',
          'cumulativeGasUsed',
          'gasUsed',
          'confirmations'
        ]
      }
    }
  },
  required: ['result']
}

export const EtherscanGetTokenTransactions = {
  type: 'object',
  properties: {
    result: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blockNumber: { type: 'string' },
          timeStamp: { type: 'string' },
          hash: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          nonce: { type: 'string' },
          value: { type: 'string' },
          gas: { type: 'string' },
          gasPrice: { type: 'string' },
          cumulativeGasUsed: { type: 'string' },
          gasUsed: { type: 'string' },
          confirmations: { type: 'string' },
          contractAddress: { type: 'string' },
          tokenName: { type: 'string' },
          tokenSymbol: { type: 'string' },
          tokenDecimal: { type: 'string' }
        },
        required: [
          'blockNumber',
          'timeStamp',
          'hash',
          'from',
          'to',
          'nonce',
          'value',
          'gas',
          'gasPrice',
          'cumulativeGasUsed',
          'gasUsed',
          'confirmations',
          'contractAddress',
          'tokenName',
          'tokenSymbol',
          'tokenDecimal'
        ]
      }
    }
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
