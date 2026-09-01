import { assert } from 'chai'
import { describe, it } from 'mocha'

import {
  builtinTokens,
  currencyInfo
} from '../../../src/ethereum/info/robinhoodInfo'
import {
  AlchemyAssetTransfer,
  AlchemyTxDetails,
  processAlchemyTransfers
} from '../../../src/ethereum/networkAdapters/AlchemyAdapter'
import { TransactionProcessingContext } from '../../../src/ethereum/networkAdapters/EvmScanAdapter'

const ourAddress = '0x9488eed0543De2A64Dd73d0E8e3bBd87915516B7'
const otherAddress = '0x4ef026964fdec686efb7594835cb681faf44bc25'
const usdcAddress = '0x80e0e24718dbFcad49ECAA6F1e6C89A190586cA8'
const usdcTokenId = '80e0e24718dbfcad49ecaa6f1e6c89a190586ca8'
const walletId = 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='

const nativeContext: TransactionProcessingContext = {
  allTokensMap: builtinTokens,
  currencyInfo,
  forWhichAddress: ourAddress,
  forWhichTokenId: null,
  forWhichWalletId: walletId
}
const usdcContext: TransactionProcessingContext = {
  ...nativeContext,
  forWhichTokenId: usdcTokenId
}

// 21000 gas at 0.01 gwei:
const spendDetails: AlchemyTxDetails = {
  from: ourAddress.toLowerCase(),
  to: otherAddress,
  nonce: '2',
  gas: '21000',
  gasPrice: '10000000',
  gasUsed: '21000'
}
const spendFee = '210000000000'

const makeTransfer = (
  overrides: Partial<AlchemyAssetTransfer> & { hash: string }
): AlchemyAssetTransfer => ({
  blockNum: '0x21ac236',
  uniqueId: `${overrides.hash}:external`,
  from: otherAddress,
  to: ourAddress.toLowerCase(),
  rawContract: { value: '0x38d7ea4c68000', address: null },
  metadata: { blockTimestamp: '2026-08-13T10:10:41.000Z' },
  ...overrides
})

describe('AlchemyAdapter transfer processing', function () {
  it('reports an external receive without a fee', function () {
    const hash =
      '0x70e4950b5991c9419eff70ea2478c7ae55c5c58adcc3da237d5889394f8fdf62'
    const [tx] = processAlchemyTransfers(
      nativeContext,
      [makeTransfer({ hash })],
      new Map()
    )
    assert.equal(tx.txid, hash)
    assert.equal(tx.nativeAmount, '1000000000000000')
    assert.equal(tx.networkFee, '0')
    assert.equal(tx.isSend, false)
    assert.equal(tx.blockHeight, 35308086)
    assert.equal(tx.date, Date.parse('2026-08-13T10:10:41.000Z') / 1000)
    assert.equal(tx.currencyCode, 'ETH')
    assert.deepEqual(tx.ourReceiveAddresses, [ourAddress])
    assert.equal(tx.tokenId, null)
    assert.equal(tx.walletId, walletId)
    assert.isUndefined(tx.parentNetworkFee)
    assert.isUndefined(tx.otherParams?.nonceUsed)
  })

  it('folds the fee into an external spend', function () {
    const hash =
      '0xd5fe57cead105a391eaba43e299d414945d04ab3be7f3d216c0e6c9fea899242'
    const [tx] = processAlchemyTransfers(
      nativeContext,
      [
        makeTransfer({
          hash,
          from: ourAddress.toLowerCase(),
          to: otherAddress,
          rawContract: { value: '0x2386f26fc10000', address: null }
        })
      ],
      new Map([[hash, spendDetails]])
    )
    assert.equal(tx.nativeAmount, '-10000210000000000')
    assert.equal(tx.networkFee, spendFee)
    assert.equal(tx.isSend, true)
    assert.deepEqual(tx.ourReceiveAddresses, [])
    assert.equal(tx.otherParams?.nonceUsed, '2')
    assert.equal(tx.otherParams?.gasUsed, '21000')
    assert.deepEqual(tx.feeRateUsed, {
      gasPrice: '0.01',
      gasUsed: '21000',
      gasLimit: '21000'
    })
  })

  it('nets a self-send to the fee alone, seen from both directions', function () {
    const hash =
      '0x5a329ee023cb675d057ac3a0cf8404a40c6e3267287391ad04d6bdf2f3bc78ae'
    const selfTransfer = makeTransfer({
      hash,
      from: ourAddress.toLowerCase(),
      to: ourAddress.toLowerCase(),
      rawContract: { value: '0x2386f26fc10000', address: null }
    })
    // The fromAddress and toAddress queries both return this transfer:
    const txs = processAlchemyTransfers(
      nativeContext,
      [selfTransfer, { ...selfTransfer }],
      new Map([[hash, { ...spendDetails, to: ourAddress.toLowerCase() }]])
    )
    assert.lengthOf(txs, 1)
    assert.equal(txs[0].nativeAmount, `-${spendFee}`)
    assert.equal(txs[0].networkFee, spendFee)
    assert.equal(txs[0].isSend, true)
    assert.deepEqual(txs[0].ourReceiveAddresses, [])
  })

  it('keeps a zero-value contract call as a fee-only spend', function () {
    const hash =
      '0x63395211dc9af5a8e0711d6e03f21c5f5733f39c8be7a72b6ece5339a925bf4a'
    const [tx] = processAlchemyTransfers(
      nativeContext,
      [
        makeTransfer({
          hash,
          from: ourAddress.toLowerCase(),
          to: usdcAddress.toLowerCase(),
          rawContract: { value: '0x0', address: null }
        })
      ],
      new Map([[hash, { ...spendDetails, to: usdcAddress.toLowerCase() }]])
    )
    assert.equal(tx.nativeAmount, `-${spendFee}`)
    assert.equal(tx.networkFee, spendFee)
    assert.equal(tx.isSend, true)
  })

  it('reports a token receive under the token', function () {
    const hash =
      '0x69ac9c55f7af454eb6ab54991b29a0ed8f1349279ba00acea5d649cf3ed6df5e'
    const [tx] = processAlchemyTransfers(
      usdcContext,
      [
        makeTransfer({
          hash,
          uniqueId: `${hash}:log:40`,
          rawContract: {
            value: '0x5f5e100',
            address: usdcAddress.toLowerCase()
          }
        })
      ],
      new Map()
    )
    assert.equal(tx.currencyCode, 'USDC')
    assert.equal(tx.tokenId, usdcTokenId)
    assert.equal(tx.nativeAmount, '100000000')
    assert.equal(tx.networkFee, '0')
    assert.isUndefined(tx.parentNetworkFee)
    assert.equal(tx.isSend, false)
    assert.deepEqual(tx.ourReceiveAddresses, [ourAddress])
  })

  it('carries the fee of a token spend as parentNetworkFee', function () {
    const hash =
      '0x4dbc35a0faf5bcac05aab891fbd0021867835c228321a4a9e25df000a6f16764'
    const [tx] = processAlchemyTransfers(
      usdcContext,
      [
        makeTransfer({
          hash,
          uniqueId: `${hash}:log:7`,
          from: ourAddress.toLowerCase(),
          to: otherAddress,
          rawContract: {
            value: '0x2faf080',
            address: usdcAddress.toLowerCase()
          }
        })
      ],
      new Map([[hash, { ...spendDetails, to: usdcAddress.toLowerCase() }]])
    )
    assert.equal(tx.nativeAmount, '-50000000')
    assert.equal(tx.networkFee, '0')
    assert.equal(tx.parentNetworkFee, spendFee)
    assert.equal(tx.isSend, true)
  })

  it('leaves the fee off a token pull the wallet did not sign', function () {
    const hash =
      '0x1111111111111111111111111111111111111111111111111111111111111111'
    const [tx] = processAlchemyTransfers(
      usdcContext,
      [
        makeTransfer({
          hash,
          uniqueId: `${hash}:log:3`,
          from: ourAddress.toLowerCase(),
          to: otherAddress,
          rawContract: {
            value: '0x2faf080',
            address: usdcAddress.toLowerCase()
          }
        })
      ],
      new Map([[hash, { ...spendDetails, from: otherAddress }]])
    )
    assert.equal(tx.nativeAmount, '-50000000')
    assert.isUndefined(tx.parentNetworkFee)
    assert.equal(tx.isSend, true)
  })

  it('sums several transfers of one transaction', function () {
    const hash =
      '0x2222222222222222222222222222222222222222222222222222222222222222'
    const [tx] = processAlchemyTransfers(
      usdcContext,
      [
        makeTransfer({
          hash,
          uniqueId: `${hash}:log:1`,
          rawContract: {
            value: '0x5f5e100',
            address: usdcAddress.toLowerCase()
          }
        }),
        makeTransfer({
          hash,
          uniqueId: `${hash}:log:2`,
          rawContract: {
            value: '0x5f5e100',
            address: usdcAddress.toLowerCase()
          }
        })
      ],
      new Map()
    )
    assert.equal(tx.nativeAmount, '200000000')
  })
})
