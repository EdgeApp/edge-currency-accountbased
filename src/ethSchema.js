/**
 * Created by paul on 8/27/17.
 */

export const CurrencyInfoScheme = {
  'type': 'object',
  'properties': {
    'walletTypes': {
      'type': 'array',
      'items': {'type': 'string'}
    },
    'currencyCode': { 'type': 'string' },
    'currencyName': { 'type': 'string' },
    'defaultSettings': {
      'type': 'object',
      'properties': {
        'addressExplorer': { 'type': 'string' },
        'transactionExplorer': { 'type': 'string' },
        'denomCurrencyCode': { 'type': 'string' },
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
      },
      'required': [ 'addressExplorer', 'transactionExplorer', 'denomCurrencyCode' ]
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
    'symbolImage'
  ]
}
