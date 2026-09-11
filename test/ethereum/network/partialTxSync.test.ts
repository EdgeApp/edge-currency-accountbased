import { assert } from 'chai'
import { EdgeTokenId, EdgeTransaction } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import {
  EdgeTransactionsBlockHeightTuple,
  EthereumNetwork
} from '../../../src/ethereum/EthereumNetwork'

const txid =
  '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'
const otherTxid =
  '0x1111111111111111111111111111111111111111111111111111111111111111'

const makeTx = (overrides: Partial<EdgeTransaction> = {}): EdgeTransaction => ({
  blockHeight: 500,
  currencyCode: 'ETH',
  date: 1,
  isSend: false,
  memos: [],
  nativeAmount: '1000',
  networkFee: '0',
  networkFees: [],
  ourReceiveAddresses: [],
  signedTx: '',
  tokenId: null,
  txid,
  walletId: 'w',
  ...overrides
})

interface FakeEngineState {
  syncComplete: boolean
  transactionList: { [tokenId: string]: EdgeTransaction[] }
  txIdMap: { [tokenId: string]: { [txid: string]: number } }
  walletLocalData: {
    blockHeight: number
    highestTxBlockHeight: number
    lastTransactionDate: { [tokenId: string]: number }
    lastTransactionQueryHeight: { [tokenId: string]: number }
  }
}

/**
 * The parts of the engine `processEthereumNetworkUpdate` reaches for, with the
 * calls it makes recorded so a test can assert on them.
 */
function makeFakeEngine(): {
  network: EthereumNetwork
  added: EdgeTransaction[]
  syncedTokenIds: EdgeTokenId[][]
  state: FakeEngineState
} {
  const added: EdgeTransaction[] = []
  const syncedTokenIds: EdgeTokenId[][] = []

  const state: FakeEngineState = {
    syncComplete: false,
    transactionList: {},
    txIdMap: {},
    walletLocalData: {
      blockHeight: 400,
      highestTxBlockHeight: 0,
      lastTransactionDate: {},
      lastTransactionQueryHeight: {}
    }
  }

  // Every field reads through to `state`, so a test that sets one before the
  // call is seeing what the engine sees; a spread would copy `syncComplete`.
  const engine = {
    get syncComplete() {
      return state.syncComplete
    },
    get transactionList() {
      return state.transactionList
    },
    get txIdMap() {
      return state.txIdMap
    },
    get walletLocalData() {
      return state.walletLocalData
    },
    walletLocalDataDirty: false,
    addTransaction(tokenId: EdgeTokenId, tx: EdgeTransaction) {
      added.push(tx)
    },
    currencyEngineCallbacks: { onNewTokens() {} },
    currencyInfo: { pluginId: 'test' },
    log: Object.assign(() => {}, { warn: () => {} }),
    networkInfo: { networkAdapterConfigs: [] },
    sendTransactionEvents() {},
    syncTracker: {
      setHistoryRatios(tokenIds: EdgeTokenId[]) {
        syncedTokenIds.push(tokenIds)
      }
    },
    updateBlockHeight(height: number) {
      state.walletLocalData.blockHeight = height
    },
    walletInfo: { id: 'w' }
  }

  const network = new EthereumNetwork(engine as unknown as EthereumEngine)
  return { network, added, syncedTokenIds, state }
}

const makeUpdate = (
  tuple: EdgeTransactionsBlockHeightTuple
): Parameters<EthereumNetwork['processEthereumNetworkUpdate']>[0] => ({
  tokenTxs: new Map([[null, tuple]]),
  server: 'test'
})

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
