import { assert } from 'chai'
import { EdgeTxDatabase, makeFakeIo, makeMemoryTxDatabase } from 'edge-core-js'
import { describe, it } from 'mocha'

import {
  DATA_STORE_FILE,
  TRANSACTION_STORE_FILE,
  TXID_LIST_FILE,
  TXID_MAP_FILE
} from '../../src/common/types'
import { ZANO_CHAIN_EPOCH, ZanoEngine } from '../../src/zano/ZanoEngine'
import { ZanoTools } from '../../src/zano/ZanoTools'
import { FAKE_ZANO_ADDRESS, makeFakeZanoEngine } from '../fake/fakeZanoEngine'

const STORAGE_PATH = 'wallet-1-storage'

/** One wallet's storage: its legacy files and its database. */
interface Storage {
  disklet: ReturnType<typeof makeFakeIo>['disklet']
  txDatabase: EdgeTxDatabase
}

async function makeStorage(): Promise<Storage> {
  return {
    disklet: makeFakeIo().disklet,
    txDatabase: await makeMemoryTxDatabase({
      walletId: 'zano-wallet',
      pluginId: 'zano'
    })
  }
}

interface Launch {
  /** Native-asset balances the engine reported to the core, in order. */
  balances: string[]
  engine: ZanoEngine
  /** Storage paths the native `deleteWallet` removed from disk. */
  deleted: string[]
  /** Wallet files on the fake native disk. */
  files: Set<string>
  /** Runs the lifecycle's `onStart`, as the first network sync does. */
  start: () => Promise<void>
  /** Flushes the dirty wallet-local data, as the save loop does. */
  save: () => Promise<void>
}

/** Loads the wallet in `storage`, as one app launch does. */
async function launch(
  storage: Storage,
  files: Set<string> = new Set([STORAGE_PATH])
): Promise<Launch> {
  const balances: string[] = []
  const deleted: string[] = []
  // Like the SDK, `deleteWallet` resolves names against the folder that
  // `init` sets, and reports OK even when it removed nothing:
  let initialized = false
  const tools = {
    zano: {
      deleteWallet: async (path: string) => {
        if (initialized && files.delete(path)) deleted.push(path)
        return { result: { return_code: 'OK' } }
      },
      getVersion: async () => '2.2.3.601',
      init: async () => {
        initialized = true
        return {}
      },
      isWalletExist: async (path: string) => files.has(path),
      stopWallet: async () => {},
      startWallet: async () => {
        files.add(STORAGE_PATH)
        return { wallet_id: 7, wi: { address: FAKE_ZANO_ADDRESS } }
      }
    }
  } as unknown as ZanoTools

  const engine = await makeFakeZanoEngine({
    disklet: storage.disklet,
    txDatabase: storage.txDatabase,
    onTokenBalanceChanged: (tokenId, balance) => balances.push(balance),
    tools
  })
  const raw = engine as any

  return {
    balances,
    engine,
    deleted,
    files,
    start: async () => {
      raw.sendKeysToNative({ mnemonic: 'seed', storagePath: STORAGE_PATH })
      await raw.nativeId.get()
    },
    save: async () => {
      await raw.saveWalletLoop()
    }
  }
}

/** Leaves wallet-local data as a pre-HF7 build wrote it. */
async function seedPreEpochWallet(
  disklet: ReturnType<typeof makeFakeIo>['disklet']
): Promise<void> {
  await disklet.setText(
    DATA_STORE_FILE,
    JSON.stringify({
      blockHeight: 3_840_000,
      totalBalances: { '': '111556000000' },
      otherData: { transactionQueryOffset: 42 }
    })
  )
}

/** Stores a transaction the abandoned chain mined, above the restart. */
async function seedPreEpochTransaction(
  disklet: ReturnType<typeof makeFakeIo>['disklet']
): Promise<void> {
  const txid = 'abandoned'
  await disklet.setText(
    TRANSACTION_STORE_FILE,
    JSON.stringify({
      '': [
        {
          blockHeight: 3_839_000,
          currencyCode: 'ZANO',
          date: 1_700_000_000,
          nativeAmount: '1000000000000',
          networkFee: '10000000000',
          ourReceiveAddresses: [],
          signedTx: '',
          tokenId: null,
          txid,
          walletId: ''
        }
      ]
    })
  )
  await disklet.setText(TXID_LIST_FILE, JSON.stringify({ '': [txid] }))
  await disklet.setText(TXID_MAP_FILE, JSON.stringify({ '': { [txid]: 0 } }))
}

describe('ZanoEngine chain epoch', () => {
  it('rebuilds a wallet from before the current epoch', async () => {
    const storage = await makeStorage()
    const { disklet } = storage
    await seedPreEpochWallet(disklet)

    const first = await launch(storage)
    const raw = first.engine as any
    // The cached history and query cursor are dropped at load:
    assert.equal(raw.walletLocalData.blockHeight, 0)
    assert.equal(raw.otherData.transactionQueryOffset, 0)
    // The cached balance is replaced by the cleared one:
    assert.deepEqual(first.balances, ['111556000000', '0'])

    // The native wallet file is deleted before the wallet reopens:
    await first.start()
    assert.deepEqual(first.deleted, [STORAGE_PATH])
    assert.equal(raw.otherData.chainEpoch, ZANO_CHAIN_EPOCH)
  })

  it('drops the cached transactions', async () => {
    // The fake engine has a seen-tx checkpoint, so the base load leaves
    // the imported transactions unread, as it does for any synced wallet:
    const storage = await makeStorage()
    const { disklet } = storage
    await seedPreEpochWallet(disklet)
    await seedPreEpochTransaction(disklet)

    const first = await launch(storage)
    assert.deepEqual(await first.engine.getTransactions({ tokenId: null }), [])
    assert.deepEqual(await storage.txDatabase.getTxs(), [])
    // And the file it was imported from, so it cannot come back:
    let missing = false
    await disklet.getText(TRANSACTION_STORE_FILE).catch(() => (missing = true))
    assert.equal(missing, true)
  })

  it('rebuilds only once', async () => {
    const storage = await makeStorage()
    const { disklet } = storage
    await seedPreEpochWallet(disklet)

    const first = await launch(storage)
    await first.start()
    await first.save()

    const second = await launch(storage, first.files)
    await second.start()
    assert.deepEqual(second.deleted, [])
    assert.equal((second.engine as any).otherData.chainEpoch, ZANO_CHAIN_EPOCH)
  })

  it('rebuilds again when killed before the native delete', async () => {
    // The load-time cache clear is saved to disk before `onStart` runs.
    // A kill in that window must not record the wallet as rebuilt, since
    // its native file still holds the pre-epoch chain.
    const storage = await makeStorage()
    const { disklet } = storage
    await seedPreEpochWallet(disklet)

    const first = await launch(storage)
    await first.save()

    const second = await launch(storage, first.files)
    await second.start()
    assert.deepEqual(second.deleted, [STORAGE_PATH])
  })

  it('rebuilds again when the native delete leaves the file', async () => {
    const storage = await makeStorage()
    const { disklet } = storage
    await seedPreEpochWallet(disklet)

    const first = await launch(storage)
    const raw = first.engine as any
    raw.tools.zano.deleteWallet = async () => ({
      result: { return_code: 'OK' }
    })
    await first.start()
    assert.equal(raw.otherData.chainEpoch, 0)
    await first.save()

    const second = await launch(storage, first.files)
    await second.start()
    assert.deepEqual(second.deleted, [STORAGE_PATH])
    assert.equal((second.engine as any).otherData.chainEpoch, ZANO_CHAIN_EPOCH)
  })

  it('keeps the epoch through a user resync', async () => {
    const storage = await makeStorage()
    const { disklet } = storage
    await seedPreEpochWallet(disklet)

    const first = await launch(storage)
    await first.start()
    await first.save()

    // A manual resync clears `otherData`; the next start restamps it, so
    // the following launch does not rebuild a second time:
    const raw = first.engine as any
    await first.engine.resyncBlockchain()
    await raw.nativeId.get()
    await first.engine.killEngine()
    assert.deepEqual(first.deleted, [STORAGE_PATH, STORAGE_PATH])
    await first.save()

    const second = await launch(storage, first.files)
    await second.start()
    assert.deepEqual(second.deleted, [])
  })

  it('logs the native library version once', async () => {
    const storage = await makeStorage()
    const { disklet } = storage
    const lines: string[] = []
    const first = await launch(storage)
    const raw = first.engine as any
    raw.log = Object.assign((message: string) => lines.push(message), {
      warn: () => {},
      error: () => {}
    })

    await first.start()
    raw.nativeId.stop()
    await raw.nativeId.get()
    assert.deepEqual(
      lines.filter(line => line.startsWith('Zano native library')),
      ['Zano native library 2.2.3.601']
    )
  })
})
