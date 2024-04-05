import { expect } from 'chai'
import { EdgeCurrencyInfo, EdgeMemo } from 'edge-core-js'
import { describe, it } from 'mocha'

import { validateMemos } from '../../src/common/validateMemos'

describe('validateMemos', function () {
  function callValidateMemos(
    memos: EdgeMemo[],
    extraInfo: Partial<EdgeCurrencyInfo>
  ): void {
    return validateMemos(
      {
        spendTargets: [],
        tokenId: null,
        memos
      },
      {
        addressExplorer: '',
        currencyCode: 'MTC',
        denominations: [],
        displayName: 'Memo Test Coin',
        pluginId: 'memoTest',
        transactionExplorer: '',
        walletType: 'wallet:memoTest',
        ...extraInfo
      }
    )
  }

  it('rejects multiple memos', function () {
    expect(() =>
      callValidateMemos(
        [
          { type: 'hex', value: '' },
          { type: 'hex', value: '' }
        ],
        { memoOptions: [{ type: 'hex' }] }
      )
    ).to.throw('Memo Test Coin only supports one memo')
  })

  it('accepts multiple memos', function () {
    callValidateMemos(
      [
        { type: 'text', value: '' },
        { type: 'hex', value: '' }
      ],
      {
        memoOptions: [{ type: 'hex' }, { type: 'text' }],
        multipleMemos: true
      }
    )
  })

  it('validates hex memos', function () {
    const extraInfo: Partial<EdgeCurrencyInfo> = {
      memoOptions: [
        {
          type: 'hex',
          memoName: 'data',
          minBytes: 2,
          maxBytes: 4
        }
      ]
    }

    // Good:
    callValidateMemos([{ type: 'hex', value: '1234' }], extraInfo)
    callValidateMemos([{ type: 'hex', value: '123456' }], extraInfo)
    callValidateMemos([{ type: 'hex', value: '12345678' }], extraInfo)

    // Bad:
    expect(() =>
      callValidateMemos([{ type: 'hex', value: '0xff' }], extraInfo)
    ).throws('Memo Test Coin data: is not valid hexadecimal')
    expect(() =>
      callValidateMemos([{ type: 'hex', value: 'ff' }], extraInfo)
    ).throws('Memo Test Coin data: cannot be shorter than 2 bytes')
    expect(() =>
      callValidateMemos([{ type: 'hex', value: 'ff12345678' }], extraInfo)
    ).throws('Memo Test Coin data: cannot be longer than 4 bytes')
    expect(() =>
      callValidateMemos([{ type: 'text', value: 'hello' }], extraInfo)
    ).throws('Memo Test Coin data: cannot be type text')
  })

  it('validates number memos', function () {
    const extraInfo: Partial<EdgeCurrencyInfo> = {
      memoOptions: [
        {
          type: 'number',
          memoName: 'tag',
          maxValue: '256'
        }
      ]
    }

    // Good:
    callValidateMemos([{ type: 'number', value: '255' }], extraInfo)
    callValidateMemos([{ type: 'number', value: '256' }], extraInfo)

    // Bad:
    expect(() =>
      callValidateMemos([{ type: 'number', value: '257' }], extraInfo)
    ).throws('Memo Test Coin tag: cannot be greater than 256')
    expect(() =>
      callValidateMemos([{ type: 'number', value: '1b' }], extraInfo)
    ).throws('Memo Test Coin tag: is not a valid number')
    expect(() =>
      callValidateMemos([{ type: 'number', value: '1.0' }], extraInfo)
    ).throws('Memo Test Coin tag: is not a valid number')
    expect(() =>
      callValidateMemos([{ type: 'number', value: '-1' }], extraInfo)
    ).throws('Memo Test Coin tag: is not a valid number')
    expect(() =>
      callValidateMemos([{ type: 'hex', value: '12345678' }], extraInfo)
    ).throws('Memo Test Coin tag: cannot be type hex')
  })

  it('validates string memos', function () {
    const extraInfo: Partial<EdgeCurrencyInfo> = {
      memoOptions: [
        {
          type: 'text',
          memoName: 'message',
          maxLength: 6
        }
      ]
    }

    // Good:
    callValidateMemos([{ type: 'text', value: '' }], extraInfo)
    callValidateMemos([{ type: 'text', value: 'hello' }], extraInfo)
    callValidateMemos([{ type: 'text', value: '1234' }], extraInfo)
    callValidateMemos([{ type: 'text', value: '0x1234' }], extraInfo)

    // Bad:
    expect(() =>
      callValidateMemos([{ type: 'text', value: 'hello!!' }], extraInfo)
    ).throws('Memo Test Coin message: cannot be longer than 6 characters')
    expect(() =>
      callValidateMemos([{ type: 'hex', value: '1234' }], extraInfo)
    ).throws('Memo Test Coin message: cannot be type hex')
    expect(() =>
      callValidateMemos([{ type: 'number', value: '12345678' }], extraInfo)
    ).throws('Memo Test Coin message: cannot be type number')
  })
})
