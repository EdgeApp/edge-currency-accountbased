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

export const BinanceApiGetTransactions = {
  type: 'object',
  properties: {
    tx: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blockHeight: { type: 'number' },
          timeStamp: { type: 'string' },
          txHash: { type: 'string' },
          fromAddr: { type: 'string' },
          toAddr: { type: 'string' },
          value: { type: 'string' },
          txFee: { type: 'string' },
          txAsset: { type: 'string' },
          memo: { type: 'string' }
        },
        required: [
          'blockHeight',
          'timeStamp',
          'txHash',
          'fromAddr',
          'toAddr',
          'value',
          'txFee',
          'txAsset',
          'memo'
        ]
      }
    }
  },
  required: ['tx']
}
