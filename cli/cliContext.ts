import { BaseContext } from 'clipanion'
import { navigateDisklet } from 'disklet'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyInfo,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  EdgeIo,
  EdgeLog,
  EdgePluginStore,
  EdgeTableSpec,
  EdgeTransaction,
  EdgeTxDatabase,
  EdgeWalletInfo,
  JsonObject,
  makeMemoryTxDatabase
} from 'edge-core-js'
import { green } from 'nanocolors'
import { base64 } from 'rfc4648'

import { CliSettings } from './cliSettings'

type EdgeCorePluginFactory = (env: EdgeCorePluginOptions) => EdgeCurrencyPlugin

export interface CurrencyContext extends BaseContext, EdgeIo {
  // Global resources:
  log: EdgeLog
  plugins: { [pluginId: string]: EdgeCorePluginFactory }

  // On-disk data:
  settings: CliSettings

  // Current state
  state: {
    engine?: EdgeCurrencyEngine
    plugin?: EdgeCurrencyPlugin
    tools?: EdgeCurrencyTools
    tx?: EdgeTransaction
  }
}

/**
 * The plugin's device-wide store, in memory.
 *
 * The CLI keeps no database on disk, so this lasts as long as the process.
 * Plugin options are built synchronously and a memory database opens
 * asynchronously, so every call waits for it.
 */
export function makeCliPluginStore(): EdgePluginStore {
  const database: Promise<EdgeTxDatabase> = makeMemoryTxDatabase({
    walletId: base64.stringify(new Uint8Array(32)),
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

/**
 * Restores the context at boot.
 */
export async function restoreContext(context: CurrencyContext): Promise<void> {
  const { disklet, log, plugins, settings, state } = context
  const { lastPluginId, initOptions, privateKeys } = settings

  if (lastPluginId == null) return
  const pluginFactory = plugins[lastPluginId]

  // If the plugin disappeared, then we don't have anything selected:
  if (pluginFactory == null) {
    settings.lastPluginId = undefined
    return
  }

  // Boot the plugin:
  const plugin = pluginFactory({
    infoPayload: {},
    initOptions: initOptions[lastPluginId] ?? {},
    io: context,
    log,
    nativeIo: {},
    pluginDatabase: makeCliPluginStore(),
    pluginDisklet: navigateDisklet(disklet, lastPluginId)
  })
  const tools = await plugin.makeCurrencyTools()
  state.plugin = plugin
  state.tools = tools

  // Maybe boot the engine:
  if (!settings.lastRunning) return

  const privateKey = privateKeys[lastPluginId]
  if (privateKey == null) return
  const publicKey = await tools.derivePublicKey(
    makeCliWalletInfo(plugin, privateKey)
  )
  const engine = await makeCliEngine(context, plugin, publicKey)
  state.engine = engine
}

interface CliPluginInfo {
  currencyInfo: EdgeCurrencyInfo
  plugin: EdgeCurrencyPlugin
  pluginId: string
  tools: EdgeCurrencyTools
}

interface CliEngineInfo extends CliPluginInfo {
  engine: EdgeCurrencyEngine
}

interface CliTxInfo extends CliEngineInfo {
  tx: EdgeTransaction
}

export function getCliPlugin(context: CurrencyContext): CliPluginInfo {
  const { plugin, tools } = context.state
  if (plugin == null || tools == null) {
    throw new Error('Run select-plugin first')
  }
  return {
    currencyInfo: plugin.currencyInfo,
    plugin,
    pluginId: plugin.currencyInfo.pluginId,
    tools
  }
}

export function getCliEngine(context: CurrencyContext): CliEngineInfo {
  const { engine } = context.state
  if (engine == null) {
    throw new Error('Run start-engine first')
  }
  return { ...getCliPlugin(context), engine }
}

export function getCliTx(context: CurrencyContext): CliTxInfo {
  const { tx } = context.state
  if (tx == null) {
    throw new Error('Run make-spend first')
  }
  return { ...getCliEngine(context), tx }
}

export function makeCliWalletInfo(
  plugin: EdgeCurrencyPlugin,
  key: unknown
): EdgeWalletInfo {
  return {
    id: base64.stringify([1, 2, 3, 4]),
    keys: key as JsonObject,
    type: plugin.currencyInfo.walletType
  }
}

export async function makeCliEngine(
  context: CurrencyContext,
  plugin: EdgeCurrencyPlugin,
  publicKey: unknown
): Promise<EdgeCurrencyEngine> {
  const { disklet, log, settings } = context
  const { pluginId } = plugin.currencyInfo

  const walletInfo = makeCliWalletInfo(plugin, publicKey)
  const engine = await plugin.makeCurrencyEngine(walletInfo, {
    callbacks: {
      onAddressChanged: () => log('onAddressChanged'),
      onAddressesChecked: () => log('onAddressesChecked'),
      onBalanceChanged: () => log('onBalanceChanged'),
      onBlockHeightChanged: () => log('onBlockHeightChanged'),
      onNewTokens: () => log('onNewTokens'),
      onSeenTxCheckpoint: () => log('onSeenTxCheckpoint'),
      onStakingStatusChanged: () => log('onStakingStatusChanged'),
      onSubscribeAddresses: () => log('onSubscribeAddresses'),
      onSyncStatusChanged: () => log('onSyncStatusChanged'),
      onTokenBalanceChanged: () => log('onTokenBalanceChanged'),
      onTransactions: () => log('onTransactionsChanged'),
      onTransactionsChanged: () => log('onTransactionsChanged'),
      onTxidsChanged: () => log('onTxidsChanged'),
      onUnactivatedTokenIdsChanged: () => log('onUnactivatedTokenIdsChanged'),
      onWcNewContractCall: () => log('onWcNewContractCall')
    },
    customTokens: settings.customTokens[pluginId] ?? {},
    enabledTokenIds: settings.enabledTokens[pluginId] ?? [],
    log,
    userSettings: {},
    walletSettings: {},
    // Files an older CLI left behind, imported once into this process's
    // memory database:
    legacyDisklet: navigateDisklet(disklet, pluginId),
    txDatabase: await makeMemoryTxDatabase({
      walletId: walletInfo.id,
      pluginId
    }),
    walletLocalEncryptedDisklet: navigateDisklet(
      disklet,
      `${pluginId}-encrypted`
    )
  })
  await engine.startEngine()
  return engine
}

export function indentJson(raw: unknown): string {
  return green(JSON.stringify(raw, null, 1))
}
