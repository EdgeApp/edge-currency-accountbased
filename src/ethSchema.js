/**
 * Created by paul on 8/27/17.
 */

export const CurrencyInfoSchema = {
  'type': 'object',
  'properties': {
    'walletTypes': {
      'type': 'array',
      'items': {'type': 'string'}
    },
    'currencyCode': { 'type': 'string' },
    'currencyName': { 'type': 'string' },
    'addressExplorer': { 'type': 'string' },
    'transactionExplorer': { 'type': 'string' },
    'defaultSettings': {
      'type': 'object',
      'properties': {
        'otherSettings': {
          'type': 'object',
          'properties': {
            'etherscanApiServers': {
              'type': 'array',
              'items': {'type': 'string'}
            },
            'superethServers': {
              'type': 'array',
              'items': {'type': 'string'}
            }
          }
        }
      }
    },
    'denominations': {
      'type': 'array',
      'items': {
        'type': 'object',
        'properties': {
          'name': { 'type': 'string' },
          'multiplier': { 'type': 'string' },
          'symbol': { 'type': 'string' }
        },
        'required': [ 'name', 'multiplier' ]
      }
    },
    'symbolImage': { 'type': 'string' },
    'metaTokens': {
      'type': 'array',
      'items': {
        'type': 'object',
        'properties': {
          'currencyCode': { 'type': 'string' },
          'currencyName': { 'type': 'string' },
          'denominations': {
            'type': 'array',
            'items': {
              'type': 'object',
              'properties': {
                'name': { 'type': 'string' },
                'multiplier': { 'type': 'string' },
                'symbol': { 'type': 'string' }
              },
              'required': [ 'name', 'multiplier' ]
            }
          },
          'contractAddress': { 'type': 'string' },
          'symbolImage': { 'type': 'string' }
        },
        'required': [ 'currencyCode', 'currencyName', 'denominations' ]
      }
    }
  },
  'required': [
    'walletTypes',
    'currencyCode',
    'currencyName',
    'defaultSettings',
    'denominations',
    'symbolImage',
    'addressExplorer',
    'transactionExplorer'
  ]
}

export const NetworkFeesSchema = {
  'type': 'object',
  'additionalProperties': {
    'type': 'object',
    'properties': {
      'gasLimit': {
        'type': 'object',
        'properties': {
          'regularTransaction': { 'type': 'string' },
          'tokenTransaction': { 'type': 'string' }
        },
        'required': [ 'regularTransaction', 'tokenTransaction' ]
      },
      'gasPrice': {
        'type': 'object',
        'properties': {
          'lowFee': { 'type': 'string' },
          'standardFeeLow': { 'type': 'string' },
          'standardFeeHigh': { 'type': 'string' },
          'standardFeeLowAmount': { 'type': 'string' },
          'standardFeeHighAmount': { 'type': 'string' },
          'highFee': { 'type': 'string' }
        },
        'required': [ 'lowFee', 'standardFeeLow', 'standardFeeHigh', 'standardFeeLowAmount', 'standardFeeHighAmount', 'highFee' ]
      }
    },
    'required': [ 'gasLimit' ]
  }
}
