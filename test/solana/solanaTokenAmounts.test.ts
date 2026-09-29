import { PublicKey } from '@solana/web3.js'
import { assert } from 'chai'
import { describe, it } from 'mocha'

import { SolanaEngine } from '../../src/solana/SolanaEngine'
import routedSwapFixture from './fixtures/solanaRoutedSwap.json'

// A real mainnet SOL to JUP swap that the aggregator routed SOL -> USDC -> JUP
// through the wallet's own USDC account: USDC went in and back out, so its
// balance is unchanged, while a new JUP account received the output.
const WALLET = routedSwapFixture.accountKeys[0]
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const JUP_MINT = 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'

const makeFakeEngine = (): any => ({
  base58PublicKey: WALLET,
  allTokensMap: { [USDC_MINT]: {}, [JUP_MINT]: {} },
  tools: {
    tokenProgramPublicKey: new PublicKey(
      'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
    ),
    token2022ProgramPublicKey: new PublicKey(
      'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
    )
  }
})

const makeTx = (): any => ({
  slot: routedSwapFixture.slot,
  blockTime: routedSwapFixture.blockTime,
  transaction: {
    signatures: [routedSwapFixture.signature],
    message: {
      staticAccountKeys: routedSwapFixture.accountKeys.map(
        key => new PublicKey(key)
      )
    }
  },
  meta: routedSwapFixture.meta
})

describe('Solana token amounts', function () {
  it('skips a token account the swap route leaves unchanged', function () {
    const amounts = SolanaEngine.prototype.parseTxAmounts.call(
      makeFakeEngine(),
      makeTx(),
      new PublicKey(WALLET)
    )

    assert.deepEqual(amounts, [
      // 365510993 - 451015361 = -85504368, which covers the fee:
      { amount: '-85504368', networkFee: '0' },
      {
        amount: '29666120',
        networkFee: '0',
        parentNetworkFee: undefined,
        tokenId: JUP_MINT
      }
    ])
  })
})
