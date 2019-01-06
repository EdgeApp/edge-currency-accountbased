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

export const EtherscanGetAccountBalance = {
  type: 'object',
  properties: {
    result: { type: 'string' }
  },
  required: ['result']
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
