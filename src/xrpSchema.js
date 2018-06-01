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

export const GetServerInfoSchema = {
  type: 'object',
  properties: {
    buildVersion: {type: 'string'},
    validatedLedger: {
      type: 'object',
      properties: {
        age: {type: 'number'},
        baseFeeXRP: {type: 'string'},
        hash: {type: 'string'},
        ledgerVersion: {type: 'number'}
      }
    }
  }
}

export const GetBalancesSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      currency: {type: 'string'},
      value: {type: 'string'}
    }
  }
}

export const GetTransactionsSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      type: {type: 'string'},
      address: {type: 'string'},
      id: {type: 'string'},
      outcome: {
        type: 'object',
        properties: {
          result: {type: 'string'},
          timestamp: {type: 'string'},
          fee: {type: 'string'},
          ledgerVersion: {type: 'number'},
          balanceChanges: {
            type: 'object'
          }
        }
      }
    }
  }
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
