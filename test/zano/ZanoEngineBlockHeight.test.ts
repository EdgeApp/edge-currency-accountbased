import { assert } from 'chai'
import { EdgeTransaction } from 'edge-core-js'
import { describe, it } from 'mocha'
import type { WalletStatus } from 'zano-native'

import { ZanoEngine } from '../../src/zano/ZanoEngine'
import { ZanoTools } from '../../src/zano/ZanoTools'
import { makeFakeZanoEngine } from '../fake/fakeZanoEngine'

/** A synced wallet: the daemon's block count is one above the chain tip. */
const TIP = 3_000_000

function makeStatus(opts: {
  daemonHeight: number
  progress?: number
  walletHeight: number
}): WalletStatus {
  return {
    current_daemon_height: opts.daemonHeight,
    current_wallet_height: opts.walletHeight,
    is_daemon_connected: true,
    is_in_long_refresh: false,
    progress: opts.progress ?? 100,
    wallet_state: 2
  } as unknown as WalletStatus
}

function makeTx(blockHeight: number): EdgeTransaction {
  return {
    blockHeight,
    confirmations: 'unconfirmed',
    currencyCode: 'ZANO',
    date: 1750000000,
    isSend: false,
    memos: [],
    nativeAmount: '1000000000000',
    networkFee: '0',
    networkFees: [],
    ourReceiveAddresses: [],
    signedTx: '',
    tokenId: null,
    txid: 'tip-block-tx',
    walletId: 'wallet-1'
  }
}

/**
 * Drives `syncNetwork` against a stubbed wallet status. Everything the synced
 * branch reaches for after the height update is stubbed out, so the assertions
 * see only what the status' two height fields produced.
 */
const FAKE_PRIVATE_KEYS = {
  zanoMnemonic: 'test mnemonic',
  zanoStoragePath: '/tmp/zano-test'
}

async function makeEngine(status: WalletStatus): Promise<ZanoEngine> {
  const tools = {
    zano: {
      getWalletStatus: async () => status,
      whitelistAssets: async () => {}
    }
  } as unknown as ZanoTools
  const engine = await makeFakeZanoEngine({ tools })

  engine.engineOn = true
  ;(engine as any).nativeId = { get: async () => 0 }
  ;(engine as any).queryBalance = async () => {}
  ;(engine as any).queryTransactions = async () => {}
  ;(engine as any).storeWalletFile = async () => {}

  return engine
}

describe('ZanoEngine block height', function () {
  it('reports the chain tip, not the daemon block count', async function () {
    // `current_daemon_height` is the daemon's `getinfo` height, which counts
    // blocks, while `current_wallet_height` is a block height. Taking the
    // larger of the two raw values put the wallet one block past the tip.
    const engine = await makeEngine(
      makeStatus({ daemonHeight: TIP + 1, walletHeight: TIP })
    )

    await engine.syncNetwork({ privateKeys: FAKE_PRIVATE_KEYS })

    assert.equal(engine.walletLocalData.blockHeight, TIP)
  })

  it('counts a transaction in the tip block as one confirmation', async function () {
    // The user-visible symptom: a fresh transfer opened at "2 of 10".
    const engine = await makeEngine(
      makeStatus({ daemonHeight: TIP + 1, walletHeight: TIP })
    )
    engine.addTransaction(null, makeTx(TIP))

    await engine.syncNetwork({ privateKeys: FAKE_PRIVATE_KEYS })

    const tx = (engine as any).transactionList[''][0] as EdgeTransaction
    assert.equal(tx.confirmations, 1)
  })

  it('uses the daemon tip while the wallet catches up', async function () {
    // A wallet mid-scan is behind the chain, so the tip still comes from the
    // daemon, and it is still the tip rather than the count.
    const engine = await makeEngine(
      makeStatus({
        daemonHeight: TIP + 1,
        progress: 50,
        walletHeight: TIP - 5000
      })
    )

    await engine.syncNetwork({ privateKeys: FAKE_PRIVATE_KEYS })

    assert.equal(engine.walletLocalData.blockHeight, TIP)
  })

  it('floors the block height at zero for a disconnected daemon', async function () {
    // A daemon that never answered reports a height of zero, which must not
    // become a negative block height.
    const engine = await makeEngine(
      makeStatus({ daemonHeight: 0, progress: 0, walletHeight: 0 })
    )

    await engine.syncNetwork({ privateKeys: FAKE_PRIVATE_KEYS })

    assert.equal(engine.walletLocalData.blockHeight, 0)
  })
})
