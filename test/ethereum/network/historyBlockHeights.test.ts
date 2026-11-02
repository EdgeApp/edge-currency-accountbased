import { assert } from 'chai'
import { EdgeTokenId, EdgeTransaction } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import { BlockscoutAdapter } from '../../../src/ethereum/networkAdapters/BlockscoutAdapter'
import { EvmScanAdapter } from '../../../src/ethereum/networkAdapters/EvmScanAdapter'
import { NetworkAdapter } from '../../../src/ethereum/networkAdapters/networkAdapterTypes'
import {
  makeFakeEngine,
  makeTx,
  makeUpdate,
  otherTxid
} from './fakeNetworkEngine'

/** Answers an explorer adapter's regular-transaction queries with `rows` */
function serveRows(adapter: object, rows: EdgeTransaction[]): void {
  Object.assign(adapter, {
    async getAllTxsEthscan(
      startBlock: number,
      tokenId: EdgeTokenId,
      asTransaction: unknown,
      options: { searchRegularTxs?: boolean }
    ) {
      return {
        allTransactions: options.searchRegularTxs === true ? rows : [],
        server: 'canned'
      }
    }
  })
}

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

/**
 * An update's `blockHeight` replaces the wallet's height outright, so only
 * block-height queries may set it. A history page's newest transaction can be
 * days old, or missing when the page is empty, which used to pull the
 * wallet's height back (or to 0) until the next height poll.
 */
describe('history results', function () {
  const params = { startBlock: 400, startDate: 0, tokenId: null }

  it('leave the chain height out of an Etherscan page', async function () {
    const adapter = new EvmScanAdapter(
      { networkInfo: {} } as unknown as EthereumEngine,
      { type: 'evmscan', servers: ['https://api.etherscan.io'] }
    )
    serveRows(adapter, [makeTx({ blockHeight: 500 })])

    const update = await adapter.fetchTxs?.(params)

    assert.isUndefined(update?.blockHeight)
    assert.equal(update?.tokenTxs?.get(null)?.blockHeight, 400)
  })

  it('leave the chain height out of empty Blockscout pages', async function () {
    const adapter = new BlockscoutAdapter(
      {
        initOptions: {},
        networkInfo: {},
        warn() {}
      } as unknown as EthereumEngine,
      { type: 'blockscout', servers: ['https://robinhoodchain.blockscout.com'] }
    )
    serveRows(adapter, [])

    const history = await adapter.fetchTxs?.(params)
    const internal = await adapter.fetchInternalTxs?.(params)

    assert.isUndefined(history?.blockHeight)
    assert.isUndefined(internal?.blockHeight)
  })

  it('leave the wallet height alone when internal rows merge in', async function () {
    const { network, state } = makeFakeEngine()
    state.walletLocalData.blockHeight = 600
    const adapter = {
      fetchTxs: async () =>
        makeUpdate({ blockHeight: 540, edgeTransactions: [makeTx()] }),
      fetchInternalTxs: async () =>
        makeUpdate({ blockHeight: 540, edgeTransactions: [] })
    }
    network.networkAdapters = [adapter as unknown as NetworkAdapter]

    await network.acquireTxs(null)

    assert.equal(state.walletLocalData.blockHeight, 600)
  })
})
