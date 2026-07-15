import { assert } from 'chai'
import { EdgeTransaction } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { CosmosEngine } from '../../src/cosmos/engine/CosmosEngine'

const makeFakeEngine = (captured: EdgeTransaction[]): any => ({
  networkInfo: { nativeDenom: 'cacao' },
  tokenIdFromDenom: () => null,
  getCurrencyCode: () => 'CACAO',
  walletInfo: { keys: { bech32Address: 'maya1sender' } },
  walletId: 'test-wallet',
  addTransaction: (_tokenId: unknown, tx: EdgeTransaction) => captured.push(tx)
})

describe('processCosmosTransaction failed transactions', function () {
  it('records a fee-only failed send without double-counting the fee', function () {
    const captured: EdgeTransaction[] = []
    CosmosEngine.prototype.processCosmosTransaction.call(
      makeFakeEngine(captured),
      'CADADEA87F920A0650FD438A40D415FD61EA8FD80390D4821F8758C19C0A9380',
      1782920131,
      '',
      // The burned fee is the entire balance change from the coin events:
      { denom: 'cacao', amount: '-2000000000' },
      '',
      17270898,
      undefined, // failed actions pass no fee to subtract...
      true // ...and are flagged failed
    )
    assert.equal(captured.length, 1)
    const tx = captured[0]
    // The outflow is the burned fee exactly once, not fee-from-events plus
    // fee-from-getMidgardTransactionFee (-4000000000).
    assert.equal(tx.nativeAmount, '-2000000000')
    assert.equal(tx.networkFee, '2000000000')
    assert.equal(tx.confirmations, 'failed')
    assert.equal(tx.isSend, true)
  })

  it('still subtracts the fee for successful mainnet sends', function () {
    const captured: EdgeTransaction[] = []
    CosmosEngine.prototype.processCosmosTransaction.call(
      makeFakeEngine(captured),
      'A66DA0A6961300000000000000000000000000000000000000000000000000',
      1782920131,
      '',
      { denom: 'cacao', amount: '-12128369999999' },
      '',
      17270898,
      {
        amount: [{ denom: 'cacao', amount: '2000000000' }],
        gasLimit: BigInt(0),
        payer: '',
        granter: ''
      },
      false
    )
    assert.equal(captured.length, 1)
    const tx = captured[0]
    assert.equal(tx.nativeAmount, '-12130369999999') // amount + fee
    assert.equal(tx.networkFee, '2000000000')
    assert.equal(tx.confirmations, undefined)
  })
})
