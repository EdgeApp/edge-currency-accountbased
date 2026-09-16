import { assert } from 'chai'
import { describe, it } from 'mocha'

import {
  asEvmScanTokenTransaction,
  asEvmScanTransaction,
  asNativeInterfaceTransaction,
  mergeEdgeTransactions,
  processEvmScanTransaction,
  TransactionProcessingContext
} from '../../../src/ethereum/networkAdapters/EvmScanAdapter'
import { allTokensMapFixture } from './allTokensMapFixture'
import { currencyInfoFixture } from './currencyInfoFixture'

const ourAddress = '0x8feec0972935bb18402d0031d448135f7e0a2813'
const context: TransactionProcessingContext = {
  allTokensMap: allTokensMapFixture,
  currencyInfo: currencyInfoFixture,
  forWhichAddress: ourAddress,
  forWhichTokenId: null,
  forWhichWalletId: 'walletId'
}

// Captured 2026-09-16 from Etherscan V2 (chainid 5042): a LI.FI swap that
// sent no value and had 2.5 USDC pulled through Arc's USDC interface.
const txlistRow = asEvmScanTransaction({
  blockNumber: '21227906',
  timeStamp: '1789597507',
  hash: '0xf4a0765860d75ae2cf15bdcf9bef80cdc63aeef1e32114a7cf6388c9a449957a',
  nonce: '1',
  from: ourAddress,
  to: '0xa4072583658fae592a3506a42431cb6316a8d40b',
  value: '0',
  gas: '1061060',
  gasPrice: '21000000000',
  gasUsed: '289223',
  isError: '0',
  confirmations: '6660'
})
const tokentxRow = asEvmScanTokenTransaction({
  blockNumber: '21227906',
  timeStamp: '1789597507',
  hash: '0xf4a0765860d75ae2cf15bdcf9bef80cdc63aeef1e32114a7cf6388c9a449957a',
  nonce: '1',
  from: ourAddress,
  to: '0xa4072583658fae592a3506a42431cb6316a8d40b',
  value: '2500000',
  gas: '1061060',
  gasPrice: '21000000000',
  gasUsed: '289223',
  confirmations: '6660',
  contractAddress: '0x3600000000000000000000000000000000000000',
  tokenName: 'USDC',
  tokenSymbol: 'USDC',
  tokenDecimal: '6'
})

describe('EvmScanAdapter native ERC-20 interface transfers', function () {
  it('counts an interface pull once, with the fee once', function () {
    const fee = '6073683000000000'
    const regular = processEvmScanTransaction(context, txlistRow, '0')
    const pulled = processEvmScanTransaction(
      context,
      asNativeInterfaceTransaction(tokentxRow, '1000000000000'),
      '0'
    )
    assert.equal(pulled.nativeAmount, '-2500000000000000000')
    assert.equal(pulled.networkFee, '0')

    const [tx] = mergeEdgeTransactions([regular, pulled])
    assert.equal(tx.nativeAmount, '-2506073683000000000')
    assert.equal(tx.networkFee, fee)
    assert.equal(tx.isSend, true)
  })
})
