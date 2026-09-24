import { expect } from 'chai'
import { Disklet, makeMemoryDisklet } from 'disklet'
import { EdgeLog, EdgeTxDatabase, makeMemoryTxDatabase } from 'edge-core-js'
import { afterEach, describe, it } from 'mocha'

import {
  diskletImportConfig,
  IMPORT_KEY
} from '../../src/common/importFromDisklet'
import {
  DATA_STORE_FILE,
  TRANSACTION_STORE_FILE,
  TXID_LIST_FILE,
  TXID_MAP_FILE
} from '../../src/common/types'
import { makeStoreFixture, makeTx, TOKEN_ID, WALLET_ID } from './txStoreFixture'

/**
 * A wallet's JSON files, moved into its rows once, before the engine loads.
 */

interface Line {
  level: 'info' | 'warn' | 'error'
  text: string
}

function makeRecordingLog(): { log: EdgeLog; lines: Line[] } {
  const lines: Line[] = []
  const record =
    (level: Line['level']) =>
    (...args: unknown[]): void => {
      lines.push({ level, text: args.map(String).join(' ') })
    }
  const log = Object.assign(record('info'), {
    breadcrumb: () => {},
    crash: () => {},
    warn: record('warn'),
    error: record('error')
  })
  return { log, lines }
}

/** Only the lines this import writes. */
const importLines = (lines: Line[]): Line[] =>
  lines.filter(
    line =>
      line.text.startsWith('Imported ') ||
      line.text.startsWith('Could not import ')
  )

/** A disklet that throws on any read, to prove nothing reads it. */
const noReads = (disklet: Disklet): Disklet => ({
  ...disklet,
  getText: async path => {
    throw new Error(`Read ${path}`)
  },
  getData: async path => {
    throw new Error(`Read ${path}`)
  },
  list: async path => {
    throw new Error(`Listed ${path ?? ''}`)
  }
})

async function hasMarker(txDatabase: EdgeTxDatabase): Promise<boolean> {
  const [result] = await txDatabase.getRows([
    { table: 'meta', keys: [IMPORT_KEY] }
  ])
  return result.rows[0] != null
}

async function freshDatabase(): Promise<EdgeTxDatabase> {
  return await makeMemoryTxDatabase({
    walletId: WALLET_ID,
    pluginId: 'ethereum'
  })
}

/** The four files, as an engine before the database left them. */
async function writeLegacyFiles(
  disklet: Disklet,
  lists: { [key: string]: unknown[] },
  state?: object
): Promise<void> {
  const ids = Object.fromEntries(
    Object.entries(lists).map(([key, txs]) => [
      key,
      txs.map(tx => (tx as { txid: string }).txid)
    ])
  )
  await disklet.setText(TRANSACTION_STORE_FILE, JSON.stringify(lists))
  await disklet.setText(TXID_LIST_FILE, JSON.stringify(ids))
  await disklet.setText(
    TXID_MAP_FILE,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(ids).map(([key, list]) => [
          key,
          Object.fromEntries(list.map((txid, i) => [txid, i]))
        ])
      )
    )
  )
  if (state != null) {
    await disklet.setText(DATA_STORE_FILE, JSON.stringify(state))
  }
}

const legacyTxs = [
  makeTx({ tokenId: null, txid: '0xa', date: 1717000003 }),
  makeTx({ tokenId: null, txid: '0xb', date: 1717000002 }),
  makeTx({ tokenId: null, txid: '0xc', date: 1717000001 })
]

const legacyState = {
  blockHeight: 18000000,
  lastAddressQueryHeight: 17999000,
  otherData: { lastQueryCursor: 'abc' }
}

afterEach(function () {
  diskletImportConfig.chunkSize = 250
  diskletImportConfig.beforeChunk = undefined
})

describe('importFromDisklet', function () {
  it('imports every transaction, the state and its otherData', async function () {
    const disklet = makeMemoryDisklet()
    await writeLegacyFiles(disklet, { '': legacyTxs }, legacyState)
    const txDatabase = await freshDatabase()
    const { log, lines } = makeRecordingLog()

    const { engine } = await makeStoreFixture({ disklet, txDatabase, log })

    // As many as the file held:
    expect(engine.getNumTransactions({ tokenId: null })).equals(3)
    expect(engine.walletLocalData.blockHeight).equals(18000000)
    expect(engine.otherData).deep.equals({ lastQueryCursor: 'abc' })
    expect(await hasMarker(txDatabase)).equals(true)
    // One counted line, at warn, which is what reaches a real log backend:
    expect(importLines(lines)).deep.equals([
      { level: 'warn', text: 'Imported 3 transactions from disk' }
    ])
  })

  it('reads no file once the marker is there', async function () {
    const disklet = makeMemoryDisklet()
    await writeLegacyFiles(disklet, { '': legacyTxs }, legacyState)
    const txDatabase = await freshDatabase()
    await makeStoreFixture({ disklet, txDatabase })

    const { log, lines } = makeRecordingLog()
    const { engine } = await makeStoreFixture({
      disklet,
      txDatabase,
      log,
      wrapDisklet: noReads
    })
    expect(engine.getNumTransactions({ tokenId: null })).equals(3)
    expect(engine.walletLocalData.blockHeight).equals(18000000)
    expect(importLines(lines)).deep.equals([])
  })

  it('marks a wallet with no files, so it never looks again', async function () {
    const txDatabase = await freshDatabase()
    const { log, lines } = makeRecordingLog()
    await makeStoreFixture({ txDatabase, log })
    expect(await hasMarker(txDatabase)).equals(true)
    expect(importLines(lines)).deep.equals([])

    const { engine } = await makeStoreFixture({
      txDatabase,
      wrapDisklet: noReads
    })
    expect(engine.getNumTransactions({ tokenId: null })).equals(0)
  })

  it('finishes on the next start after a kill mid-import', async function () {
    const disklet = makeMemoryDisklet()
    await writeLegacyFiles(disklet, { '': legacyTxs }, legacyState)
    const txDatabase = await freshDatabase()

    diskletImportConfig.chunkSize = 1
    diskletImportConfig.beforeChunk = async index => {
      if (index === 1) throw new Error('killed')
    }
    let error: unknown
    await makeStoreFixture({ disklet, txDatabase }).catch(e => (error = e))
    expect(String(error)).includes('killed')
    expect(await hasMarker(txDatabase)).equals(false)
    expect((await txDatabase.getTxs()).length).equals(1)

    diskletImportConfig.beforeChunk = undefined
    const { engine } = await makeStoreFixture({ disklet, txDatabase })
    expect(await hasMarker(txDatabase)).equals(true)
    expect((await txDatabase.getTxs()).length).equals(3)
    expect(engine.getNumTransactions({ tokenId: null })).equals(3)
    expect(engine.walletLocalData.blockHeight).equals(18000000)
  })

  it('leaves the state the engine wrote after a partial import', async function () {
    const disklet = makeMemoryDisklet()
    await writeLegacyFiles(disklet, { '': legacyTxs }, legacyState)
    const txDatabase = await freshDatabase()

    diskletImportConfig.chunkSize = 1
    diskletImportConfig.beforeChunk = async index => {
      if (index === 1) throw new Error('killed')
    }
    await makeStoreFixture({ disklet, txDatabase }).catch(() => {})

    // What the killed session's engine wrote, newer than any file:
    await txDatabase.putRows([
      {
        table: 'meta',
        rows: [
          { id: 'wallet', wallet: { ...legacyState, blockHeight: 19000000 } }
        ]
      }
    ])
    diskletImportConfig.beforeChunk = undefined
    const { engine } = await makeStoreFixture({ disklet, txDatabase })
    expect(engine.walletLocalData.blockHeight).equals(19000000)
  })

  it('imports nothing after a resync, even with the marker lost', async function () {
    const disklet = makeMemoryDisklet()
    await writeLegacyFiles(disklet, { '': legacyTxs }, legacyState)
    const txDatabase = await freshDatabase()
    const fixture = await makeStoreFixture({ disklet, txDatabase })

    // The fixture's disklet is read-only, so this writes no file:
    await fixture.engine.resync()
    expect((await txDatabase.getTxs()).length).equals(0)
    expect(await txDatabase.findRows('txDetail', {})).deep.equals([])
    // And all four are gone:
    expect(await disklet.list('txEngineFolder')).deep.equals({})

    const engine = await fixture.restart()
    expect(engine.getNumTransactions({ tokenId: null })).equals(0)

    // What a table version bump does to the marker and the state:
    await txDatabase.removeRows([
      { table: 'meta', keys: [IMPORT_KEY, 'wallet'] }
    ])
    const bumped = await fixture.restart()
    expect(bumped.getNumTransactions({ tokenId: null })).equals(0)
    expect(bumped.otherData).deep.equals({})
    expect(bumped.walletLocalData.blockHeight).equals(0)
  })

  it('starts through a torn transaction file, and reads it no more', async function () {
    const disklet = makeMemoryDisklet()
    await writeLegacyFiles(disklet, { '': legacyTxs }, legacyState)
    await disklet.setText(TRANSACTION_STORE_FILE, '{"": [{"txid": "0xa", "nat')
    const txDatabase = await freshDatabase()
    const { log, lines } = makeRecordingLog()

    const { engine } = await makeStoreFixture({ disklet, txDatabase, log })

    // The other files imported; the torn one did not:
    expect(engine.walletLocalData.blockHeight).equals(18000000)
    expect(engine.getNumTransactions({ tokenId: null })).equals(0)
    expect(await hasMarker(txDatabase)).equals(true)

    // Logged once, at warn:
    const logged = importLines(lines)
    expect(logged.map(line => line.level)).deep.equals(['warn', 'warn'])
    expect(logged[0].text).equals('Imported 0 transactions from disk')
    expect(logged[1].text).matches(
      /^Could not import 1 legacy files: txEngineFolder\/transactionList\.json: /
    )

    // And the next start reads no file:
    const again = await makeStoreFixture({
      disklet,
      txDatabase,
      wrapDisklet: noReads
    })
    expect(again.engine.walletLocalData.blockHeight).equals(18000000)
  })

  it('maps a file keyed by currency code onto token ids', async function () {
    const disklet = makeMemoryDisklet()
    await writeLegacyFiles(disklet, {
      ETH: [makeTx({ tokenId: null, txid: '0xeth' })],
      USDC: [makeTx({ tokenId: TOKEN_ID, txid: '0xusdc' })],
      GONE: [makeTx({ tokenId: null, txid: '0xgone' })]
    })
    const txDatabase = await freshDatabase()
    const { engine } = await makeStoreFixture({ disklet, txDatabase })

    expect(engine.transactionList[''].map(tx => tx.txid)).deep.equals(['0xeth'])
    expect(engine.transactionList[TOKEN_ID].map(tx => tx.txid)).deep.equals([
      '0xusdc'
    ])
  })

  it('reports a transaction list that is not the expected shape', async function () {
    const disklet = makeMemoryDisklet()
    await disklet.setText(
      TRANSACTION_STORE_FILE,
      JSON.stringify({ '': 'nope', [TOKEN_ID]: [{ nativeAmount: '1' }] })
    )
    await disklet.setText(DATA_STORE_FILE, JSON.stringify({ blockHeight: 'x' }))
    const txDatabase = await freshDatabase()
    const { log, lines } = makeRecordingLog()
    await makeStoreFixture({ disklet, txDatabase, log })

    expect(await hasMarker(txDatabase)).equals(true)
    expect(importLines(lines).map(line => line.text)).deep.equals([
      'Imported 0 transactions from disk',
      `Could not import 2 legacy files: ${TRANSACTION_STORE_FILE}:  is not a list`
    ])

    await disklet.setText(TRANSACTION_STORE_FILE, '7')
    await txDatabase.removeRows([{ table: 'meta', keys: [IMPORT_KEY] }])
    const { log: again, lines: more } = makeRecordingLog()
    await makeStoreFixture({ disklet, txDatabase, log: again })
    expect(importLines(more).map(line => line.text)).deep.equals([
      'Imported 0 transactions from disk',
      `Could not import 1 legacy files: ${TRANSACTION_STORE_FILE}: not an object`
    ])
  })

  it('fails to start without a database, naming it', async function () {
    let error: unknown
    await makeStoreFixture({ txDatabase: undefined }).catch(e => (error = e))
    expect(String(error)).includes('transaction database')
  })
})
