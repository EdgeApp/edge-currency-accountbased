import { EncodeObject } from '@cosmjs/proto-signing'
import { assert } from 'chai'
import { describe, it } from 'mocha'

import { CosmosFee } from '../../src/cosmos/cosmosTypes'
import { MayachainEngine } from '../../src/cosmos/engine/MayachainEngine'
import { ThorchainEngine } from '../../src/cosmos/engine/ThorchainEngine'

const MSG_SEND: EncodeObject = { typeUrl: '/types.MsgSend', value: {} }

interface FeeCalculator {
  calculateFee: (opts: { messages: EncodeObject[] }) => Promise<CosmosFee>
}

/**
 * Calls an engine's `calculateFee` with only the state it touches: the network
 * info, the init options `rpcWithApiKey` cleans, and a fetch that answers with
 * the chain's constants endpoint payload.
 */
const calculateFee = async (
  enginePrototype: object,
  nativeDenom: string,
  constants: unknown
): Promise<CosmosFee> => {
  // Created FROM the prototype so the inherited `makeMidgardFee` resolves.
  const engine: FeeCalculator = Object.assign(Object.create(enginePrototype), {
    networkInfo: {
      nativeDenom,
      transactionFeeConnectionInfo: { url: 'https://example.test', headers: {} }
    },
    tools: { initOptions: {} },
    engineFetch: async () => ({
      status: 200,
      json: async () => constants
    })
  })
  return await engine.calculateFee({ messages: [MSG_SEND] })
}

describe('Midgard calculateFee', function () {
  it('MAYAChain adds the declared gas fee it actually collects', async function () {
    const fee = await calculateFee(MayachainEngine.prototype, 'cacao', {
      int_64_values: {
        NativeTransactionFee: 2000000000,
        OutboundTransactionFee: 2000000000
      }
    })

    // mayanode runs the stock cosmos-sdk `DeductFeeDecorator`, so the signer
    // pays the flat fee AND the declared gas fee. Reporting the flat fee alone
    // put a max send one base unit over the balance, which the chain accepted
    // and then reverted as "insufficient funds".
    assert.equal(fee.networkFee, '2000000001')
    assert.deepEqual(fee.gasFeeCoin, { denom: 'cacao', amount: '1' })
    assert.equal(fee.gasLimit, '60000000')
  })

  it('THORChain reports the flat fee alone, since the declared fee is ignored', async function () {
    const fee = await calculateFee(ThorchainEngine.prototype, 'rune', {
      native_outbound_fee_rune: '2000000',
      native_tx_fee_rune: '2000000'
    })

    // thornode's ante chain has no `DeductFeeDecorator`; live sends declare an
    // empty fee and are accepted. Adding the declared unit here would
    // over-report the fee and leave a base unit behind on a max send.
    assert.equal(fee.networkFee, '2000000')
    assert.deepEqual(fee.gasFeeCoin, { denom: 'rune', amount: '1' })
  })
})
