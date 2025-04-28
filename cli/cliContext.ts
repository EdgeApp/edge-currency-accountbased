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
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
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

  const engine = await plugin.makeCurrencyEngine(
    makeCliWalletInfo(plugin, publicKey),
    {
      callbacks: {
        onAddressChanged: () => log('onAddressChanged'),
        onAddressesChecked: () => log('onAddressesChecked'),
        onBalanceChanged: () => log('onBalanceChanged'),
        onBlockHeightChanged: () => log('onBlockHeightChanged'),
        onNewTokens: () => log('onNewTokens'),
        onSeenTxCheckpoint: () => log('onSeenTxCheckpoint'),
        onStakingStatusChanged: () => log('onStakingStatusChanged'),
        onSubscribeAddresses: () => log('onSubscribeAddresses'),
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
      walletLocalDisklet: navigateDisklet(disklet, pluginId),
      walletLocalEncryptedDisklet: navigateDisklet(
        disklet,
        `${pluginId}-encrypted`
      )
    }
  )
  await engine.startEngine()
  return engine
}

export function indentJson(raw: unknown): string {
  return green(JSON.stringify(raw, null, 1))
}
