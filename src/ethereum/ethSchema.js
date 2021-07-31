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
