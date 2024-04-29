import { assert } from 'chai'
import { EdgeTransaction } from 'edge-core-js'
import { describe, it } from 'mocha'

import { mergeEdgeTransactions } from '../../../src/ethereum/networkAdapters/EvmScanAdapter'

const abeAddress = '0x0000000000000000000000000000000000000abe'
const bobAddress = '0x0000000000000000000000000000000000000b0b'

describe(`mergeEdgeTransactions for native currency transactions`, function () {
  // This is just the starter template EdgeTransaction object:
  const templateTx: EdgeTransaction = {
    blockHeight: 123456789,
    currencyCode: 'ETH',
    date: 123456789,
    feeRateUsed: {
      gasPrice: '1.0',
      gasUsed: '48668',
      gasLimit: '500000'
    },
    isSend: true,
    memos: [],
    nativeAmount: '0',
    networkFee: '0',
    otherParams: {
      from: [abeAddress],
      to: [bobAddress],
      gas: '500000',
      gasPrice: '5088740116',
      gasUsed: '48668',
      isFromMakeSpend: false
    },
    ourReceiveAddresses: [],
    signedTx: '',
    tokenId: null,
    txid: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    walletId: ''
  }

  // When the internal transaction refunds some amount back to the recipient:
  it(`will merge internal transaction refunding`, function () {
    const regularTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '-10042',
      networkFee: '42'
    }
    const internalTx = {
      ...templateTx,
      isSend: false,
      nativeAmount: '100',
      networkFee: '42',
      ourReceiveAddresses: [bobAddress]
    }
    const result = mergeEdgeTransactions([regularTx, internalTx])
    const expected = [
      {
        ...templateTx,
        isSend: true,
        nativeAmount: '-9942',
        networkFee: '42',
        ourReceiveAddresses: [bobAddress]
      }
    ]
    assert.deepEqual(result, expected)
  })

  // When the internal transaction gives more back then sent:
  it(`will merge internal transaction receiving of funds`, function () {
    const regularTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '-10042',
      networkFee: '42'
    }
    const internalTx = {
      ...templateTx,
      isSend: false,
      nativeAmount: '20042',
      networkFee: '42',
      ourReceiveAddresses: [bobAddress]
    }
    const result = mergeEdgeTransactions([regularTx, internalTx])
    const expected = [
      {
        ...templateTx,
        isSend: false,
        nativeAmount: '10000',
        networkFee: '42',
        ourReceiveAddresses: [bobAddress]
      }
    ]
    assert.deepEqual(result, expected)
  })

  it(`will not merge internal transaction of a different currency`, function () {
    const regularTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '-10042',
      networkFee: '42'
    }
    const internalTx = {
      ...templateTx,
      isSend: false,
      nativeAmount: '100',
      networkFee: '42',
      currencyCode: 'WBTC',
      tokenId: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'
    }
    const result = mergeEdgeTransactions([regularTx, internalTx])
    const expected = [regularTx, internalTx]
    assert.deepEqual(result, expected)
  })

  it(`will throw on mismatching networkFee`, function () {
    const regularTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '-10042',
      networkFee: '42',
      ourReceiveAddresses: [bobAddress]
    }
    const internalTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '100',
      networkFee: '0'
    }
    assert.throws(
      () => mergeEdgeTransactions([regularTx, internalTx]),
      `Failed to merge transaction '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789:': Mismatch networkFee`
    )
  })
})

describe(`mergeEdgeTransactions for token transactions`, function () {
  const templateTx: EdgeTransaction = {
    blockHeight: 123456789,
    currencyCode: 'WBTC',
    date: 123456789,
    feeRateUsed: {
      gasPrice: '1.0',
      gasUsed: '48668',
      gasLimit: '500000'
    },
    isSend: true,
    memos: [],
    nativeAmount: '0',
    networkFee: '0',
    parentNetworkFee: '0',
    otherParams: {
      from: [abeAddress],
      to: [bobAddress],
      gas: '500000',
      gasPrice: '5088740116',
      gasUsed: '48668',
      isFromMakeSpend: false
    },
    ourReceiveAddresses: [],
    signedTx: '',
    tokenId: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    txid: '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
    walletId: ''
  }

  // When the internal transaction refunds some amount back to the recipient:
  it(`will merge internal transaction refunding`, function () {
    const regularTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '-10042',
      parentNetworkFee: '42'
    }
    const internalTx = {
      ...templateTx,
      isSend: false,
      nativeAmount: '100',
      parentNetworkFee: '42',
      ourReceiveAddresses: [bobAddress]
    }
    const result = mergeEdgeTransactions([regularTx, internalTx])
    const expected = [
      {
        ...templateTx,
        isSend: true,
        nativeAmount: '-9942',
        parentNetworkFee: '42',
        ourReceiveAddresses: [bobAddress]
      }
    ]
    assert.deepEqual(result, expected)
  })

  // When the internal transaction gives more back then sent:
  it(`will merge internal transaction receiving of funds`, function () {
    const regularTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '-10042',
      parentNetworkFee: '42'
    }
    const internalTx = {
      ...templateTx,
      isSend: false,
      nativeAmount: '20042',
      parentNetworkFee: '42',
      ourReceiveAddresses: [bobAddress]
    }
    const result = mergeEdgeTransactions([regularTx, internalTx])
    const expected = [
      {
        ...templateTx,
        isSend: false,
        nativeAmount: '10000',
        parentNetworkFee: '42',
        ourReceiveAddresses: [bobAddress]
      }
    ]
    assert.deepEqual(result, expected)
  })

  it(`will not merge internal transaction of a different currency`, function () {
    const regularTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '-10042',
      parentNetworkFee: '42'
    }
    const internalTx = {
      ...templateTx,
      isSend: false,
      nativeAmount: '100',
      parentNetworkFee: '42',
      currencyCode: 'USDC',
      tokenId: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
    }
    const result = mergeEdgeTransactions([regularTx, internalTx])
    const expected = [regularTx, internalTx]
    assert.deepEqual(result, expected)
  })

  it(`will throw on mismatching parentNetworkFee`, function () {
    const regularTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '-10042',
      parentNetworkFee: '42',
      ourReceiveAddresses: [bobAddress]
    }
    const internalTx = {
      ...templateTx,
      isSend: true,
      nativeAmount: '100',
      parentNetworkFee: '0'
    }
    assert.throws(
      () => mergeEdgeTransactions([regularTx, internalTx]),
      `Failed to merge transaction '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789:0x2260fac5e5542a773aa44fbcfedf7c193bc2c599': Mismatch parentNetworkFee`
    )
  })
})
