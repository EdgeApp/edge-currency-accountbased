import { Disklet } from 'disklet'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeLog,
  EdgeToken,
  EdgeTokenId,
  EdgeTransaction,
  EdgeTxDatabase,
  makeFakeIo,
  makeMemoryTxDatabase
} from 'edge-core-js'

import { CurrencyEngine } from '../../src/common/CurrencyEngine'
import { PluginEnvironment } from '../../src/common/innerPlugin'
import {
  makeTokenSyncTracker,
  TokenSyncTracker
} from '../../src/common/SyncTracker'
import {
  DATA_STORE_FILE,
  SafeCommonWalletInfo,
  TRANSACTION_STORE_FILE,
  TXID_LIST_FILE,
  TXID_MAP_FILE
} from '../../src/common/types'
import { currencyInfo } from '../../src/ethereum/info/ethereumInfo'
import { fakeLog } from '../fake/fakeLog'
import { makeReadOnlyDisklet } from '../fake/fakeStorage'
import { FakeTools } from '../fake/FakeTools'

/**
 * A `CurrencyEngine` over a real database, with no chain behind it.
 *
 * The transaction store is common code every account-based engine inherits,
 * so driving it through one chain's engine would drag that chain's network in
 * for no gain.
 */

export const TOKEN_ID = 'a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
export const WALLET_ID = Buffer.alloc(32, 0x11).toString('base64')

export const usdc: EdgeToken = {
  currencyCode: 'USDC',
  displayName: 'USD Coin',
  denominations: [{ name: 'USDC', multiplier: '1000000' }],
  networkLocation: { contractAddress: `0x${TOKEN_ID}` }
}

const quietCallbacks: EdgeCurrencyEngineCallbacks = {
  onAddressChanged() {},
  onAddressesChecked() {},
  onBalanceChanged() {},
  onBlockHeightChanged() {},
  onNewTokens() {},
  onSeenTxCheckpoint() {},
  onStakingStatusChanged() {},
  onSubscribeAddresses() {},
  onSyncStatusChanged() {},
  onTokenBalanceChanged() {},
  onTransactions() {},
  onTransactionsChanged() {},
  onTxidsChanged() {},
  onUnactivatedTokenIdsChanged() {},
  onWcNewContractCall() {}
}

/**
 * A bare `CurrencyEngine` -- no chain, no network.
 *
 * The transaction store is common code every account-based engine inherits,
 * so testing it through one real chain's engine would drag that chain's
 * network in for no gain.
 */
export class TestEngine extends CurrencyEngine<
  FakeTools,
  SafeCommonWalletInfo,
  TokenSyncTracker
> {
  /**
   * The base class leaves the shape of `otherData` to its subclasses, and
   * drops it entirely for one that never claims it -- so a test of where it
   * gets stored has to claim it.
   */
  setOtherData(raw: any): void {
    this.otherData = { ...raw }
  }

  // Both are protected, which is right for the plugin surface and useless
  // for a test of the storage they drive.
  async save(): Promise<void> {
    await this.saveWalletLoop()
  }

  async resync(): Promise<void> {
    await this.clearBlockchainCache()
  }
}

export interface Fixture {
  engine: TestEngine
  /** Absent only in the test that checks the engine refuses to start. */
  txDatabase: EdgeTxDatabase | undefined
  /** The wallet's legacy files, writable here so a test can lay them out. */
  disklet: EdgeCurrencyEngineOptions['legacyDisklet']
  /** A second engine over the same storage, which is what a restart is. */
  restart: () => Promise<TestEngine>
}

export async function makeStoreFixture(
  opts: {
    txDatabase?: EdgeTxDatabase | undefined
    /** Transactions already on disk, as an older version would have left them. */
    legacyTxs?: EdgeTransaction[]
    /** Engine state already on disk, likewise. */
    legacyState?: object
    /** The log every engine this fixture makes writes to. */
    log?: EdgeLog
    /** The legacy files, shared with an earlier fixture to restart over them. */
    disklet?: Disklet
    /** Wraps the legacy disklet each engine gets, to watch or break it. */
    wrapDisklet?: (disklet: Disklet) => Disklet
  } = {}
): Promise<Fixture> {
  const fakeIo = makeFakeIo()
  const disklet = opts.disklet ?? fakeIo.disklet

  if (opts.legacyState != null) {
    await disklet.setText(DATA_STORE_FILE, JSON.stringify(opts.legacyState))
  }

  if (opts.legacyTxs != null) {
    const txs = opts.legacyTxs
    await disklet.setText(TRANSACTION_STORE_FILE, JSON.stringify({ '': txs }))
    await disklet.setText(
      TXID_LIST_FILE,
      JSON.stringify({ '': txs.map(tx => tx.txid) })
    )
    await disklet.setText(
      TXID_MAP_FILE,
      JSON.stringify({
        '': Object.fromEntries(txs.map((tx, i) => [tx.txid, i]))
      })
    )
  }
  const txDatabase =
    'txDatabase' in opts
      ? opts.txDatabase
      : await makeMemoryTxDatabase({
          walletId: WALLET_ID,
          pluginId: 'ethereum'
        })

  const env = {
    currencyInfo,
    io: fakeIo,
    log: fakeLog,
    builtinTokens: { [TOKEN_ID]: usdc }
  } as unknown as PluginEnvironment<{}>

  const walletInfo: SafeCommonWalletInfo = {
    id: WALLET_ID,
    type: 'wallet:ethereum',
    keys: { publicKey: '0xabc' }
  }

  const engineOptions = (): EdgeCurrencyEngineOptions => ({
    callbacks: quietCallbacks,
    customTokens: { [TOKEN_ID]: usdc },
    enabledTokenIds: [TOKEN_ID],
    log: opts.log ?? fakeLog,
    txDatabase,
    userSettings: {},
    // Read-only, as the core hands it out: every path runs without writing.
    legacyDisklet: (opts.wrapDisklet ?? (d => d))(makeReadOnlyDisklet(disklet)),
    walletLocalEncryptedDisklet: makeReadOnlyDisklet(disklet),
    walletSettings: {}
  })

  const make = async (): Promise<TestEngine> => {
    const engine = new TestEngine(
      env,
      new FakeTools(),
      walletInfo,
      engineOptions(),
      makeTokenSyncTracker
    )
    await engine.loadEngine()
    return engine
  }

  return { engine: await make(), txDatabase, disklet, restart: make }
}

export function db(fixture: Fixture): EdgeTxDatabase {
  if (fixture.txDatabase == null) throw new Error('This fixture has none')
  return fixture.txDatabase
}

export function makeTx(
  overrides: Partial<EdgeTransaction> & { tokenId: EdgeTokenId }
): EdgeTransaction {
  return {
    currencyCode: overrides.tokenId == null ? 'ETH' : 'USDC',
    nativeAmount: '-1000000000000000',
    networkFees: [],
    networkFee: '21000000000000',
    blockHeight: 19000000,
    date: 1717243200,
    txid: '0xdeadbeef',
    signedTx: '',
    memos: [],
    ourReceiveAddresses: [],
    isSend: true,
    walletId: WALLET_ID,
    ...overrides
  }
}
