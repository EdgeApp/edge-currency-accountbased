import { Disklet } from 'disklet'
import {
  EdgePluginStore,
  EdgeTableSpec,
  EdgeTxDatabase,
  makeMemoryTxDatabase
} from 'edge-core-js'

/**
 * A disklet that refuses writes, the way the core's `legacyDisklet` does: an
 * engine may read and delete its old files, never write one.
 */
export const makeReadOnlyDisklet = (disklet: Disklet): Disklet => ({
  delete: async path => await disklet.delete(path),
  getData: async path => await disklet.getData(path),
  getText: async path => await disklet.getText(path),
  list: async path => await disklet.list(path),
  setData: async () => {
    throw new Error("The wallet's local storage is read-only")
  },
  setText: async () => {
    throw new Error("The wallet's local storage is read-only")
  }
})

/**
 * An in-memory `EdgePluginStore`, the shape the core hands a plugin as
 * `pluginDatabase`. Plugin options are built synchronously and a memory
 * database opens asynchronously, so every call waits for it.
 */
export const makeMemoryPluginStore = (): EdgePluginStore => {
  const database: Promise<EdgeTxDatabase> = makeMemoryTxDatabase({
    walletId: Buffer.alloc(32, 0x22).toString('base64'),
    pluginId: 'plugin'
  })
  const out: EdgePluginStore = {
    async defineTables(spec: EdgeTableSpec) {
      const db = await database
      await db.defineTables(spec)
      for (const table of Object.keys(spec.tables)) out[table] = db[table]
    },
    getRows: async requests => await (await database).getRows(requests),
    putRows: async writes => await (await database).putRows(writes),
    putRowsIfAbsent: async writes =>
      await (await database).putRowsIfAbsent(writes),
    removeRows: async removals => await (await database).removeRows(removals),
    findRows: async (table, query) =>
      await (await database).findRows(table, query),
    batchWrite: async ops => await (await database).batchWrite(ops),
    runSql: async (strings, ...values) =>
      await (await database).runSql(strings, ...values)
  }
  return out
}
