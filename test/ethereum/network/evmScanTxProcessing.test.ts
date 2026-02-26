import { assert } from 'chai'
import { asEither } from 'cleaners'
import { EdgeTransaction } from 'edge-core-js'
import { describe, it } from 'mocha'

import { currencyInfo } from '../../../src/ethereum/info/ethereumInfo'
import {
  asEvmScanInternalTransaction,
  asEvmScanTransaction,
  processEvmScanTransaction,
  TransactionProcessingContext
} from '../../../src/ethereum/networkAdapters/EvmScanAdapter'
import { allTokensMapFixture } from './allTokensMapFixture'

export interface TestCase {
  input: {
    context: TransactionProcessingContext
    rawTx: unknown
    l1RollupFee: string
  }
  output: EdgeTransaction
}

export const testCases: TestCase[] = [
  {
    input: {
      context: {
        allTokensMap: allTokensMapFixture,
        currencyInfo: currencyInfo,
        forWhichAddress: '0x036639F209f2Ebcde65a3f7896d05a4941d20373',
        forWhichTokenId: null,
        forWhichWalletId: 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='
      },
      rawTx: {
        blockNumber: '15698713',
        timeStamp: '1665175967',
        hash: '0xfc179c9125a00203639b69578cfcb8aca9c681f00e8f3828dbd7826a1f86dc16',
        nonce: '0',
        blockHash:
          '0x9d63d07f89956ab9ee617db3cb9d52d88d4e166c17da7c59f9b67d4cddd3750c',
        transactionIndex: '120',
        from: '0x036639f209f2ebcde65a3f7896d05a4941d20373',
        to: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        value: '0',
        gas: '500000',
        gasPrice: '5088740116',
        isError: '0',
        txreceipt_status: '1',
        input:
          '0x095ea7b30000000000000000000000007d2768de32b0b80b7a3454c06bdac94a69ddc7a9ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        contractAddress: '',
        cumulativeGasUsed: '14909624',
        gasUsed: '48668',
        confirmations: '3893272',
        methodId: '0x095ea7b3',
        functionName: 'approve(address _spender, uint256 _value)'
      },
      l1RollupFee: '0'
    },
    output: {
      blockHeight: 15698713,
      currencyCode: 'ETH',
      date: 1665175967,
      feeRateUsed: {
        gasPrice: '5.088740116',
        gasUsed: '48668',
        gasLimit: '500000'
      },
      isSend: true,
      memos: [],
      nativeAmount: '-247658803965488',
      networkFee: '247658803965488',
      networkFees: [],
      otherParams: {
        from: ['0x036639f209f2ebcde65a3f7896d05a4941d20373'],
        to: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
        gas: '500000',
        gasPrice: '5088740116',
        gasUsed: '48668',
        isFromMakeSpend: false,
        nonceUsed: '0'
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '0xfc179c9125a00203639b69578cfcb8aca9c681f00e8f3828dbd7826a1f86dc16',
      walletId: 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='
    }
  },
  {
    input: {
      context: {
        allTokensMap: allTokensMapFixture,
        currencyInfo: currencyInfo,
        forWhichAddress: '0x036639F209f2Ebcde65a3f7896d05a4941d20373',
        forWhichTokenId: null,
        forWhichWalletId: 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='
      },
      rawTx: {
        blockNumber: '15698713',
        timeStamp: '1665175967',
        hash: '0xfc179c9125a00203639b69578cfcb8aca9c681f00e8f3828dbd7826a1f86dc16',
        nonce: '0',
        blockHash:
          '0x9d63d07f89956ab9ee617db3cb9d52d88d4e166c17da7c59f9b67d4cddd3750c',
        transactionIndex: '120',
        from: '0x036639f209f2ebcde65a3f7896d05a4941d20373',
        to: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        value: '0',
        gas: '500000',
        gasPrice: '5088740116',
        isError: '0',
        txreceipt_status: '1',
        input:
          '0x095ea7b30000000000000000000000007d2768de32b0b80b7a3454c06bdac94a69ddc7a9ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        contractAddress: '',
        cumulativeGasUsed: '14909624',
        gasUsed: '48668',
        confirmations: '3893272',
        methodId: '0x095ea7b3',
        functionName: 'approve(address _spender, uint256 _value)'
      },
      l1RollupFee: '0'
    },
    output: {
      blockHeight: 15698713,
      currencyCode: 'ETH',
      date: 1665175967,
      feeRateUsed: {
        gasPrice: '5.088740116',
        gasUsed: '48668',
        gasLimit: '500000'
      },
      isSend: true,
      memos: [],
      nativeAmount: '-247658803965488',
      networkFee: '247658803965488',
      networkFees: [],
      otherParams: {
        from: ['0x036639f209f2ebcde65a3f7896d05a4941d20373'],
        to: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
        gas: '500000',
        gasPrice: '5088740116',
        gasUsed: '48668',
        isFromMakeSpend: false,
        nonceUsed: '0'
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '0xfc179c9125a00203639b69578cfcb8aca9c681f00e8f3828dbd7826a1f86dc16',
      walletId: 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='
    }
  },
  {
    input: {
      context: {
        allTokensMap: allTokensMapFixture,
        currencyInfo: currencyInfo,
        forWhichAddress: '0x036639F209f2Ebcde65a3f7896d05a4941d20373',
        forWhichTokenId: null,
        forWhichWalletId: 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='
      },
      rawTx: {
        blockNumber: '15698713',
        timeStamp: '1665175967',
        hash: '0xfc179c9125a00203639b69578cfcb8aca9c681f00e8f3828dbd7826a1f86dc16',
        nonce: '0',
        blockHash:
          '0x9d63d07f89956ab9ee617db3cb9d52d88d4e166c17da7c59f9b67d4cddd3750c',
        transactionIndex: '120',
        from: '0x036639f209f2ebcde65a3f7896d05a4941d20373',
        to: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        value: '0',
        gas: '500000',
        gasPrice: '5088740116',
        isError: '0',
        txreceipt_status: '1',
        input:
          '0x095ea7b30000000000000000000000007d2768de32b0b80b7a3454c06bdac94a69ddc7a9ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        contractAddress: '',
        cumulativeGasUsed: '14909624',
        gasUsed: '48668',
        confirmations: '3893272',
        methodId: '0x095ea7b3',
        functionName: 'approve(address _spender, uint256 _value)'
      },
      l1RollupFee: '0'
    },
    output: {
      blockHeight: 15698713,
      currencyCode: 'ETH',
      date: 1665175967,
      feeRateUsed: {
        gasPrice: '5.088740116',
        gasUsed: '48668',
        gasLimit: '500000'
      },
      isSend: true,
      memos: [],
      nativeAmount: '-247658803965488',
      networkFee: '247658803965488',
      networkFees: [],
      otherParams: {
        from: ['0x036639f209f2ebcde65a3f7896d05a4941d20373'],
        to: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
        gas: '500000',
        gasPrice: '5088740116',
        gasUsed: '48668',
        isFromMakeSpend: false,
        nonceUsed: '0'
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '0xfc179c9125a00203639b69578cfcb8aca9c681f00e8f3828dbd7826a1f86dc16',
      walletId: 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='
    }
  },
  {
    input: {
      context: {
        allTokensMap: allTokensMapFixture,
        currencyInfo: currencyInfo,
        forWhichAddress: '0x036639F209f2Ebcde65a3f7896d05a4941d20373',
        forWhichTokenId: null,
        forWhichWalletId: 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='
      },
      rawTx: {
        blockNumber: '15698713',
        timeStamp: '1665175967',
        hash: '0xfc179c9125a00203639b69578cfcb8aca9c681f00e8f3828dbd7826a1f86dc16',
        nonce: '0',
        blockHash:
          '0x9d63d07f89956ab9ee617db3cb9d52d88d4e166c17da7c59f9b67d4cddd3750c',
        transactionIndex: '120',
        from: '0x036639f209f2ebcde65a3f7896d05a4941d20373',
        to: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
        value: '0',
        gas: '500000',
        gasPrice: '5088740116',
        isError: '0',
        txreceipt_status: '1',
        input:
          '0x095ea7b30000000000000000000000007d2768de32b0b80b7a3454c06bdac94a69ddc7a9ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        contractAddress: '',
        cumulativeGasUsed: '14909624',
        gasUsed: '48668',
        confirmations: '3893272',
        methodId: '0x095ea7b3',
        functionName: 'approve(address _spender, uint256 _value)'
      },
      l1RollupFee: '0'
    },
    output: {
      blockHeight: 15698713,
      currencyCode: 'ETH',
      date: 1665175967,
      feeRateUsed: {
        gasPrice: '5.088740116',
        gasUsed: '48668',
        gasLimit: '500000'
      },
      isSend: true,
      memos: [],
      nativeAmount: '-247658803965488',
      networkFee: '247658803965488',
      networkFees: [],
      otherParams: {
        from: ['0x036639f209f2ebcde65a3f7896d05a4941d20373'],
        to: ['0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'],
        gas: '500000',
        gasPrice: '5088740116',
        gasUsed: '48668',
        isFromMakeSpend: false,
        nonceUsed: '0'
      },
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '0xfc179c9125a00203639b69578cfcb8aca9c681f00e8f3828dbd7826a1f86dc16',
      walletId: 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='
    }
  }
]

describe(`processEvmScanTransaction`, function () {
  for (let index = 0; index < testCases.length; ++index) {
    it(`processEvmScanTransaction test case ${index}`, function () {
      const testCase = testCases[index]
      const cleanTx = asEither(
        asEvmScanTransaction,
        asEvmScanInternalTransaction
      )(testCase.input.rawTx)
      const l1RollupFee = testCase.input.l1RollupFee
      const edgeTx = processEvmScanTransaction(
        testCase.input.context,
        cleanTx,
        l1RollupFee
      )
      assert.equal(
        JSON.stringify(edgeTx, null, 2),
        JSON.stringify(testCase.output, null, 2)
      )
    })
  }
})
