// @flow

import { asArray, asObject, asOptional, asString } from 'cleaners'

export const CurrencyInfoSchema = {
  type: 'object',
  properties: {
    walletTypes: {
      type: 'array',
      items: { type: 'string' }
    },
    currencyCode: { type: 'string' },
    currencyName: { type: 'string' },
    addressExplorer: { type: 'string' },
    transactionExplorer: { type: 'string' },
    defaultSettings: {
      type: 'object'
    },
    denominations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          multiplier: { type: 'string' },
          symbol: { type: 'string' }
        },
        required: ['name', 'multiplier']
      }
    },
    metaTokens: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          currencyCode: { type: 'string' },
          currencyName: { type: 'string' },
          denominations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                multiplier: { type: 'string' },
                symbol: { type: 'string' }
              },
              required: ['name', 'multiplier']
            }
          },
          contractAddress: { type: 'string' }
        },
        required: ['currencyCode', 'currencyName', 'denominations']
      }
    }
  },
  required: [
    'walletTypes',
    'currencyCode',
    'currencyName',
    'defaultSettings',
    'denominations',
    'addressExplorer',
    'transactionExplorer'
  ]
}

export const asCurrencyCodeOptions = asObject({
  currencyCode: asOptional(asString)
})

/**
 * Does the same tests that the old JSON schema used to do,
 * but with better error reporting.
 */
export function checkEdgeSpendInfo(raw: any): void {
  try {
    asPartialSpendInfo(raw)
  } catch (error) {
    throw new TypeError('Invalid EdgeSpendInfo: ' + error.message)
  }
}

export function checkCustomToken(raw: any): void {
  try {
    asCustomToken(raw)
  } catch (error) {
    throw new TypeError('Invalid CustomToken: ' + error.message)
  }
}

const asPartialSpendInfo = asObject({
  currencyCode: asOptional(asString),
  networkFeeOption: asOptional(asString),
  spendTargets: asArray(
    asObject({
      currencyCode: asOptional(asString),
      publicAddress: asString,
      nativeAmount: asOptional(asString, '0')
    })
  )
})

const asCustomToken = asObject({
  currencyCode: asString,
  currencyName: asString,
  multiplier: asString,
  contractAddress: asString
})
