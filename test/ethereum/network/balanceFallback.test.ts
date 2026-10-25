import { assert } from 'chai'
import { EdgeTokenId } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import { EthereumNetwork } from '../../../src/ethereum/EthereumNetwork'
import { NetworkAdapter } from '../../../src/ethereum/networkAdapters/networkAdapterTypes'

interface Calls {
  batch: number
  single: EdgeTokenId[]
  txs: EdgeTokenId[]
  warnings: string[]
}

/**
 * An `EthereumNetwork` whose balance and history fetches are recorded rather
 * than sent, with one adapter that advertises batch token balances.
 */
function makeNetwork(batchFails: boolean): {
  network: EthereumNetwork
  calls: Calls
} {
  const calls: Calls = { batch: 0, single: [], txs: [], warnings: [] }
  const engine = {
    enabledTokenIds: ['token1'],
    networkInfo: { networkAdapterConfigs: [] },
    walletInfo: { id: 'w' },
    warn(message: string) {
      calls.warnings.push(message)
    }
  }

  const network = new EthereumNetwork(engine as unknown as EthereumEngine)
  network.networkAdapters = [
    { fetchTokenBalances: async () => ({}) } as unknown as NetworkAdapter
  ]
  network.acquireTokenBalances = async () => {
    calls.batch++
    if (batchFails) throw new Error('call revert exception')
  }
  network.acquireTokenBalance = async tokenId => {
    calls.single.push(tokenId)
  }
  network.acquireTxs = async tokenId => {
    calls.txs.push(tokenId)
  }
  return { network, calls }
}

describe('EthereumNetwork.acquireUpdates balance queries', function () {
  it('uses only the batch query when it succeeds', async function () {
    const { network, calls } = makeNetwork(false)

    await network.acquireUpdates()

    assert.strictEqual(calls.batch, 1)
    assert.deepEqual(calls.single, [])
    assert.deepEqual(calls.txs, [null, 'token1'])
  })

  it('checks each token individually when the batch query fails', async function () {
    const { network, calls } = makeNetwork(true)

    await network.acquireUpdates()

    assert.strictEqual(calls.batch, 1)
    assert.deepEqual(calls.single, [null, 'token1'])
    assert.deepEqual(calls.txs, [null, 'token1'])
    assert.strictEqual(calls.warnings.length, 1)
    assert.include(calls.warnings[0], 'call revert exception')
  })
})
