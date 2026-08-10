import { assert } from 'chai'
import { describe, it } from 'mocha'

import { CosmosFee } from '../../src/cosmos/cosmosTypes'
import { MidgardEngine } from '../../src/cosmos/engine/MidgardEngine'

// `makeMidgardFee` is protected, so reach it the same way the engine's
// subclasses do — through the prototype, with only the state it touches.
const makeMidgardFee = (nativeDenom: string, networkFee: string): CosmosFee =>
  // eslint-disable-next-line @typescript-eslint/dot-notation
  MidgardEngine.prototype['makeMidgardFee'].call(
    { networkInfo: { nativeDenom } },
    networkFee
  )

describe('makeMidgardFee', function () {
  it('adds the declared gas fee to the chain fee so a max spend fits', function () {
    // MAYAChain's NativeTransactionFee for a MsgSend:
    const fee = makeMidgardFee('cacao', '2000000000')

    // The signer pays the flat fee AND the declared gas fee. Reporting only
    // the flat 2000000000 put a max spend one base unit over the balance,
    // which the chain accepted at CheckTx and then reverted as
    // "insufficient funds" while the app reported success.
    assert.equal(fee.networkFee, '2000000001')
    assert.deepEqual(fee.gasFeeCoin, { denom: 'cacao', amount: '1' })
    assert.equal(fee.gasLimit, '60000000')
  })

  it('uses the wallet denom for the gas fee coin', function () {
    const fee = makeMidgardFee('rune', '2000000')

    assert.equal(fee.networkFee, '2000001')
    assert.deepEqual(fee.gasFeeCoin, { denom: 'rune', amount: '1' })
  })

  it('still reports the gas fee when the chain quotes no flat fee', function () {
    const fee = makeMidgardFee('cacao', '0')

    assert.equal(fee.networkFee, '1')
  })
})
