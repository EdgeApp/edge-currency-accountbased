import { Disklet } from 'disklet'
import {
  EdgeLog,
  EdgeTransaction,
  EdgeTx,
  EdgeTxDatabase
} from 'edge-core-js/types'

import {
  splitTransaction,
  TxDetail,
  txStoreTables,
  WALLET_META_KEY
} from './txStore'
import {
  asWalletLocalData,
  DATA_STORE_FILE,
  TRANSACTION_STORE_FILE,
  TXID_LIST_FILE,
  TXID_MAP_FILE
} from './types'

/**
 * Moving a wallet's JSON files into its rows, once.
 *
 * The only module that knows the files' shapes. It runs before the engine
 * loads anything, and writes a marker row when it is done; with the marker
 * there, the files are never read again. They are never written either --
 * the core hands them out read-only -- and a resync deletes them, through
 * `deleteLegacyFiles`, so a forgotten history cannot come back.
 */

export const diskletImportConfig = {
  /** Transactions written per database transaction. */
  chunkSize: 250,
  /** Test hook: runs before each chunk; rejecting stops the import there. */
  beforeChunk: undefined as ((index: number) => Promise<void>) | undefined
}

/** The `meta` row whose presence means the import has run. */
export const IMPORT_KEY = 'import'
const IMPORT_VERSION = 1

interface ImportFromDiskletOptions {
  txDatabase: EdgeTxDatabase
  legacyDisklet: Disklet
  log: EdgeLog
  pluginId: string

  /**
   * The key a file's asset maps to, for files from before transactions were
   * keyed by token id: the currency code becomes `''` or the token's id, and
   * a code with no token here becomes nothing, and is dropped.
   */
  tokenKeyFor: (currencyCode: string) => string | undefined
}

export async function importFromDisklet(
  opts: ImportFromDiskletOptions
): Promise<void> {
  const { txDatabase: db, legacyDisklet, log, pluginId, tokenKeyFor } = opts

  await db.defineTables(txStoreTables)
  const [marker] = await db.getRows([{ table: 'meta', keys: [IMPORT_KEY] }])
  if (marker.rows[0] != null) return

  const listing = await legacyDisklet.list('txEngineFolder').catch(() => ({}))
  const present = new Set(Object.keys(listing))
  const failures: string[] = []

  /** One file, parsed in its own `try`, so a torn one blocks nothing else. */
  const readJson = async (path: string): Promise<unknown> => {
    if (!present.has(path)) return
    try {
      return JSON.parse(await legacyDisklet.getText(path))
    } catch (error: unknown) {
      failures.push(`${path}: ${String(error)}`)
    }
  }

  let walletRow: object | undefined
  const walletLocalData = await readJson(DATA_STORE_FILE)
  if (walletLocalData != null) {
    try {
      walletRow = {
        id: WALLET_META_KEY,
        wallet: asWalletLocalData(walletLocalData)
      }
    } catch (error: unknown) {
      failures.push(`${DATA_STORE_FILE}: ${String(error)}`)
    }
  }

  // `txidList.json` and `txidMap.json` are indexes of the transaction list,
  // rebuilt from the rows on load. Read only so a torn one is reported:
  await readJson(TXID_LIST_FILE)
  await readJson(TXID_MAP_FILE)

  const groups = groupByTxid(
    await readJson(TRANSACTION_STORE_FILE),
    tokenKeyFor,
    failures
  )

  // Always at least one chunk, which is the one that carries the marker:
  const { chunkSize } = diskletImportConfig
  const chunkCount = Math.max(1, Math.ceil(groups.length / chunkSize))
  for (let index = 0; index < chunkCount; ++index) {
    await diskletImportConfig.beforeChunk?.(index)
    const txs: EdgeTx[] = []
    const details: TxDetail[] = []
    for (const assets of groups.slice(
      index * chunkSize,
      (index + 1) * chunkSize
    )) {
      const split = splitTransaction(assets, pluginId)
      txs.push(...split.txs)
      details.push(split.detail)
    }

    const first = index === 0
    const last = index === chunkCount - 1
    await db.batchWrite({
      saveTxs: txs,
      // Only under keys that have none: a kill and a retry must not
      // overwrite what the engine wrote in between.
      putRowsIfAbsent: [
        { table: 'txDetail', rows: details },
        ...(first && walletRow != null
          ? [{ table: 'meta', rows: [walletRow] }]
          : [])
      ],
      // The marker rides in the final chunk, so it lands with the last rows
      // or not at all:
      putRows: last
        ? [
            {
              table: 'meta',
              rows: [{ id: IMPORT_KEY, version: IMPORT_VERSION }]
            }
          ]
        : []
    })
  }

  if (groups.length > 0 || walletRow != null) {
    log.warn(`Imported ${groups.length} transactions from disk`)
  }
  if (failures.length > 0) {
    log.warn(`Could not import ${failures.length} legacy files: ${failures[0]}`)
  }
}

/**
 * Makes the legacy files unreachable, for a resync.
 *
 * All four, and `walletLocalData.json` most of all: it holds each chain's
 * query cursors, and handing those back to a resynced wallet would claim
 * progress over an empty store.
 */
export async function deleteLegacyFiles(legacyDisklet: Disklet): Promise<void> {
  await Promise.all(
    [
      TRANSACTION_STORE_FILE,
      TXID_LIST_FILE,
      TXID_MAP_FILE,
      DATA_STORE_FILE
    ].map(async path => await legacyDisklet.delete(path))
  )
}

/**
 * The transaction file, as one list of assets per transaction.
 *
 * The file holds one `EdgeTransaction` per asset, keyed by token id -- or by
 * currency code, in files older than that -- and a row holds them all.
 */
function groupByTxid(
  file: unknown,
  tokenKeyFor: (currencyCode: string) => string | undefined,
  failures: string[]
): Array<Array<[string, EdgeTransaction]>> {
  if (file == null) return []
  if (typeof file !== 'object') {
    failures.push(`${TRANSACTION_STORE_FILE}: not an object`)
    return []
  }
  const lists = file as { [key: string]: unknown }

  // A file with transactions and no `''` list predates token-id keys:
  const byCurrencyCode = Object.keys(lists).length > 0 && lists[''] == null

  const out = new Map<string, Array<[string, EdgeTransaction]>>()
  for (const key of Object.keys(lists)) {
    const safeTokenId = byCurrencyCode ? tokenKeyFor(key) : key
    if (safeTokenId == null) continue
    const list = lists[key]
    if (!Array.isArray(list)) {
      failures.push(`${TRANSACTION_STORE_FILE}: ${key} is not a list`)
      continue
    }
    for (const tx of list as EdgeTransaction[]) {
      if (typeof tx?.txid !== 'string') {
        failures.push(`${TRANSACTION_STORE_FILE}: a transaction has no txid`)
        continue
      }
      const assets = out.get(tx.txid) ?? []
      assets.push([safeTokenId, tx])
      out.set(tx.txid, assets)
    }
  }
  return [...out.values()]
}
