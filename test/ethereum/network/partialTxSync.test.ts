import { assert } from 'chai'
import { describe, it } from 'mocha'

import {
  makeFakeEngine,
  makeTx,
  makeUpdate,
  otherTxid,
  txid
} from './fakeNetworkEngine'

/**
 * A `partial` tuple is a history pass whose internal-transaction source
 * failed, so its rows carry the external half of every transaction and none
 * of the internal half. Those rows are still worth applying, but the pass is
 * not a complete view of the range it covered, so it must neither report the
 * asset synced nor close the window it queried. A chain whose only
 * internal-transaction source is down therefore holds its wallets at the
 * ratio they reached, which is the honest reading: the history really is
 * incomplete, and the missing rows merge in once the source answers.
 */
describe('processEthereumNetworkUpdate with a failed internal-tx source', function () {
  it('withholds the synced flag, so the ratio stays honest', function () {
    const { network, syncedTokenIds } = makeFakeEngine()

    network.processEthereumNetworkUpdate(
      makeUpdate({
        blockHeight: 400,
        edgeTransactions: [makeTx()],
        partial: true
      })
    )

    assert.deepEqual(syncedTokenIds, [[]])
  })

  it('keeps the query window open for the missing internal rows', function () {
    const { network, state } = makeFakeEngine()

    network.processEthereumNetworkUpdate(
      makeUpdate({
        blockHeight: 400,
        edgeTransactions: [makeTx()],
        partial: true
      })
    )

    assert.isUndefined(state.walletLocalData.lastTransactionQueryHeight[''])
    assert.isUndefined(state.walletLocalData.lastTransactionDate[''])
  })

  it('leaves a known confirmed transaction alone', function () {
    const { network, added, state } = makeFakeEngine()
    state.transactionList[''] = [makeTx({ nativeAmount: '900' })]
    state.txIdMap[''] = { [txid.toLowerCase().replace('0x', '')]: 0 }

    network.processEthereumNetworkUpdate(
      makeUpdate({
        blockHeight: 400,
        edgeTransactions: [makeTx()],
        partial: true
      })
    )

    assert.lengthOf(added, 0)
  })

  it('still applies a transaction it has never seen', function () {
    const { network, added, state } = makeFakeEngine()
    state.transactionList[''] = [makeTx({ nativeAmount: '900' })]
    state.txIdMap[''] = { [txid.toLowerCase().replace('0x', '')]: 0 }

    network.processEthereumNetworkUpdate(
      makeUpdate({
        blockHeight: 400,
        edgeTransactions: [makeTx(), makeTx({ txid: otherTxid })],
        partial: true
      })
    )

    assert.lengthOf(added, 1)
    assert.equal(added[0].txid, otherTxid)
  })

  it('still advances the query window on a complete pass', function () {
    const { network, added, syncedTokenIds, state } = makeFakeEngine()

    network.processEthereumNetworkUpdate(
      makeUpdate({ blockHeight: 400, edgeTransactions: [makeTx()] })
    )

    assert.deepEqual(syncedTokenIds, [[null]])
    assert.lengthOf(added, 1)
    assert.equal(state.walletLocalData.lastTransactionQueryHeight[''], 400)
  })
})
