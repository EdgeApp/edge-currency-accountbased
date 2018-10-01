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
      'type': 'object'
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

export const MakeSpendSchema = {
  'type': 'object',
  'properties': {
    'currencyCode': { 'type': 'string' },
    'networkFeeOption': { 'type': 'string' },
    'spendTargets': {
      'type': 'array',
      'items': {
        'type': 'object',
        'properties': {
          'currencyCode': { 'type': 'string' },
          'publicAddress': { 'type': 'string' },
          'nativeAmount': { 'type': 'string' },
          'destMetadata': { 'type': 'object' }
        },
        'required': [
          'publicAddress'
        ]
      }
    }
  },
  'required': [ 'spendTargets' ]
}

export const CustomTokenSchema = {
  'type': 'object',
  'properties': {
    'currencyCode': {'type': 'string'},
    'currencyName': {'type': 'string'},
    'multiplier': {'type': 'string'},
    'contractAddress': {'type': 'string'}
  },
  'required': ['currencyCode', 'currencyName', 'multiplier', 'contractAddress']
}
