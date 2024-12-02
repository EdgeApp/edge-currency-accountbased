import { assert } from 'chai'
import { EdgeCurrencyInfo, EdgeTokenMap, EdgeTransaction } from 'edge-core-js'
import { describe, it } from 'mocha'

import {
  LiberlandTxProcessingContext,
  processLiberlandTransaction
} from '../src/polkadot/PolkadotEngine'
import { LiberlandTransfer } from '../src/polkadot/polkadotTypes'

const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'LLD',
  displayName: 'Liberland',
  memoOptions: [],
  pluginId: 'liberland',
  walletType: 'wallet:liberland',
  addressExplorer: 'https://liberland.explorer.io/address/%s',
  transactionExplorer: 'https://liberland.explorer.io/tx/%s',
  denominations: [
    {
      name: 'LLD',
      multiplier: '1000000000000000000',
      symbol: 'LLD'
    }
  ]
}

const allTokensMap: EdgeTokenMap = {
  '0x1234567890123456789012345678901234567890': {
    currencyCode: 'LLD',
    displayName: 'Liberland Token',
    denominations: [
      {
        name: 'LLD',
        multiplier: '1000000000000000000'
      }
    ],
    networkLocation: {
      contractAddress: '0x1234567890123456789012345678901234567890'
    }
  }
}

export interface TestCase {
  input: {
    context: LiberlandTxProcessingContext
    tx: LiberlandTransfer
  }
  output: EdgeTransaction
}

export const testCases: TestCase[] = [
  {
    input: {
      context: {
        walletId: 'test-wallet-id',
        walletInfo: {
          keys: {
            publicKey: '0xabc'
          },
          id: '1',
          type: 'wallet:liberland'
        },
        currencyInfo,
        allTokensMap,
        tokenId: null
      },
      tx: {
        id: '0x123',
        fromId: '0xabc',
        toId: '0xdef',
        value: '1000',
        block: {
          number: '100',
          timestamp: '2023-01-01T00:00:00',
          extrinsics: {
            nodes: [
              {
                hash: '0x789',
                events: {
                  nodes: [
                    {
                      id: '0x123'
                    }
                  ]
                }
              }
            ]
          }
        },
        eventIndex: 0
      }
    },
    output: {
      blockHeight: 100,
      confirmations: 'confirmed',
      currencyCode: 'LLD',
      date: 1672531200,
      isSend: true,
      memos: [],
      nativeAmount: '-1000',
      networkFee: '0',
      networkFees: [],
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '0x789',
      walletId: 'test-wallet-id',
      otherParams: {
        explorerPath: 'transfer/0x123'
      }
    }
  },
  {
    input: {
      context: {
        walletId: 'test-wallet-id',
        walletInfo: {
          keys: {
            publicKey: '0xghi'
          },
          id: '2',
          type: 'wallet:liberland'
        },
        currencyInfo,
        allTokensMap,
        tokenId: null
      },
      tx: {
        id: '0x123',
        fromId: '0xjkl',
        toId: '0xghi',
        value: '2000',
        block: {
          number: '200',
          timestamp: '2023-01-02T00:00:00',
          extrinsics: {
            nodes: [
              {
                hash: '0x456',
                events: {
                  nodes: [
                    {
                      id: '0x123'
                    }
                  ]
                }
              }
            ]
          }
        },
        eventIndex: 0
      }
    },
    output: {
      blockHeight: 200,
      confirmations: 'confirmed',
      currencyCode: 'LLD',
      date: 1672617600,
      isSend: false,
      memos: [],
      nativeAmount: '2000',
      networkFee: '0',
      networkFees: [],
      ourReceiveAddresses: ['0xghi'],
      signedTx: '',
      tokenId: null,
      txid: '0x456',
      walletId: 'test-wallet-id',
      otherParams: {
        explorerPath: 'transfer/0x123'
      }
    }
  }
]

describe(`processLiberlandTransaction`, function () {
  for (let index = 0; index < testCases.length; ++index) {
    it(`processLiberlandTransaction test case ${index}`, function () {
      const testCase = testCases[index]
      const edgeTx = processLiberlandTransaction(
        testCase.input.context,
        testCase.input.tx
      )
      assert.equal(
        JSON.stringify(edgeTx, null, 2),
        JSON.stringify(testCase.output, null, 2)
      )
    })
  }
})
