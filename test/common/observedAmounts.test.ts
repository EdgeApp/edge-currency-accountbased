// The Ethereum modules load from `EthereumNetwork` in the app. Entering at
// `EvmScanAdapter` instead reaches `BlockscoutAdapter`, which extends it,
// before it has finished defining itself -- so load them the app's way first:
import '../../src/ethereum/EthereumNetwork'

import { expect } from 'chai'
import { describe, it } from 'mocha'

import {
  builtinTokens,
  currencyInfo
} from '../../src/ethereum/info/ethereumInfo'
import {
  asEvmScanTokenTransaction,
  asEvmScanTransaction,
  processEvmScanTransaction,
  TransactionProcessingContext
} from '../../src/ethereum/networkAdapters/EvmScanAdapter'
import { db, makeStoreFixture, TOKEN_ID, WALLET_ID } from './txStoreFixture'

/**
 * What a *stored* amount means for a transaction nobody here authored.
 *
 * The rule is unambiguous for a send this wallet built: the engine knows what
 * it spent. For an observed transaction, "how the balance moved" needs
 * ownership resolved at ingest -- and for an account-based chain it already
 * is, because the explorer is queried per address, so `from` is the whole
 * answer. These drive the real EVM processing code into the real store and
 * check the number that comes back out.
 *
 * The number includes the network fee on the chain asset. That is what every
 * engine in both plugin families reports, and it is what reconciles against a
 * balance.
 */

const US = '0x036639F209f2Ebcde65a3f7896d05a4941d20373'
const THEM = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599'

const GAS_PRICE = '20000000000'
const GAS_USED = '21000'
/** 20 gwei x 21000 gas. */
const FEE = '420000000000000'

function context(tokenId: string | null): TransactionProcessingContext {
  return {
    allTokensMap: builtinTokens,
    currencyInfo,
    forWhichAddress: US,
    forWhichTokenId: tokenId,
    forWhichWalletId: WALLET_ID
  }
}

describe('observed transaction amounts', function () {
  it('records a send as the whole balance movement', async function () {
    const fixture = await makeStoreFixture()
    const tx = processEvmScanTransaction(
      context(null),
      asEvmScanTransaction({
        blockNumber: '19000000',
        timeStamp: '1717243200',
        hash: '0xsend',
        from: US.toLowerCase(),
        to: THEM,
        value: '1000000000000000000',
        nonce: '7',
        gasPrice: GAS_PRICE,
        gas: '21000',
        gasUsed: GAS_USED
      }),
      '0'
    )
    fixture.engine.addTransaction(null, tx)
    await fixture.engine.save()

    const [stored] = await db(fixture).getTxs()

    // One ether out plus the fee, which is what left the balance:
    expect(stored.nativeAmounts.get(null)).equals('-1000420000000000000')
    expect(stored.networkFees.get(null)).equals(FEE)
    expect(stored.isSend).equals(true)
  })

  it('records a receive without inventing a fee', async function () {
    const fixture = await makeStoreFixture()
    const tx = processEvmScanTransaction(
      context(null),
      asEvmScanTransaction({
        blockNumber: '19000001',
        timeStamp: '1717243260',
        hash: '0xreceive',
        from: THEM,
        to: US.toLowerCase(),
        value: '500000000000000000',
        nonce: '2',
        gasPrice: GAS_PRICE,
        gas: '21000',
        gasUsed: GAS_USED
      }),
      '0'
    )
    fixture.engine.addTransaction(null, tx)
    await fixture.engine.save()

    const [stored] = await db(fixture).getTxs()

    // The sender paid the gas, so none of it moved this balance:
    expect(stored.nativeAmounts.get(null)).equals('500000000000000000')
    expect(stored.networkFees.get(null)).equals('0')
    expect(stored.isSend).equals(false)
    expect(stored.ourReceiveAddresses).deep.equals([US])
  })

  it('keeps a token amount clear of the fee that paid for it', async function () {
    const fixture = await makeStoreFixture()
    const tx = processEvmScanTransaction(
      context(TOKEN_ID),
      asEvmScanTokenTransaction({
        blockNumber: '19000002',
        timeStamp: '1717243320',
        hash: '0xtoken',
        from: US.toLowerCase(),
        to: THEM,
        value: '5000000',
        nonce: '8',
        gasPrice: GAS_PRICE,
        gas: '60000',
        gasUsed: GAS_USED,
        confirmations: '10',
        contractAddress: `0x${TOKEN_ID}`,
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        tokenDecimal: '6'
      }),
      '0'
    )
    fixture.engine.addTransaction(TOKEN_ID, tx)
    await fixture.engine.save()

    const [stored] = await db(fixture).getTxs()

    // The token moved five USDC; the gas came out of the chain asset, so it
    // belongs to that asset's fee and not to this amount.
    expect(stored.nativeAmounts.get(TOKEN_ID)).equals('-5000000')
    expect(stored.networkFees.get(TOKEN_ID)).equals('0')
    expect(stored.networkFees.get(null)).equals(FEE)

    // And no amount is invented for the asset that only paid:
    expect(stored.nativeAmounts.has(null)).equals(false)
  })

  it('carries a failed transaction as failed', async function () {
    const fixture = await makeStoreFixture()
    const tx = processEvmScanTransaction(
      context(null),
      asEvmScanTransaction({
        blockNumber: '19000003',
        timeStamp: '1717243380',
        hash: '0xfailed',
        from: US.toLowerCase(),
        to: THEM,
        value: '0',
        nonce: '9',
        gasPrice: GAS_PRICE,
        gas: '21000',
        gasUsed: GAS_USED,
        isError: '1'
      }),
      '0'
    )
    fixture.engine.addTransaction(null, tx)
    await fixture.engine.save()

    // The chain's verdict, which no stored height implies -- a reverted
    // transaction still has a block and still cost its gas.
    const engine = await fixture.restart()
    expect(engine.transactionList[''][0].confirmations).equals('failed')
    expect(engine.transactionList[''][0].nativeAmount).equals(`-${FEE}`)
  })
})
