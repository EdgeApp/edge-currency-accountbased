import { assert } from 'chai'
import { describe, it } from 'mocha'

import {
  makeFakeEngine,
  makeTx,
  makeUpdate,
  otherTxid
} from './fakeNetworkEngine'

/**
 * `highestTxBlockHeight` is the checkpoint a change-server sync waits for:
 * the engine keeps syncing until it reaches the block the server reported. A
 * pass's start block only shows the history below it was covered, so the
 * checkpoint also has to reach the newest transaction a complete pass
 * delivered. Otherwise the sync keeps polling for a full lookback window
 * after it already found the activity.
 */
describe('processEthereumNetworkUpdate checkpoint', function () {
  it('reaches the newest transaction of a complete pass', function () {
    const { network, state } = makeFakeEngine()

    network.processEthereumNetworkUpdate(
      makeUpdate({
        blockHeight: 400,
        edgeTransactions: [
          makeTx({ blockHeight: 450 }),
          makeTx({ blockHeight: 500, txid: otherTxid })
        ]
      })
    )

    assert.equal(state.walletLocalData.highestTxBlockHeight, 500)
  })

  it('holds a partial pass at its start block', function () {
    const { network, state } = makeFakeEngine()

    network.processEthereumNetworkUpdate(
      makeUpdate({
        blockHeight: 400,
        edgeTransactions: [makeTx({ blockHeight: 500 })],
        partial: true
      })
    )

    assert.equal(state.walletLocalData.highestTxBlockHeight, 400)
  })

  it('raises the wallet height to a newer transaction', function () {
    const { network, state } = makeFakeEngine()
    state.walletLocalData.blockHeight = 450

    network.processEthereumNetworkUpdate(
      makeUpdate({
        blockHeight: 400,
        edgeTransactions: [makeTx({ blockHeight: 500 })]
      })
    )

    assert.equal(state.walletLocalData.blockHeight, 500)
  })
})
