import { Command, Option } from 'clipanion'
import { navigateDisklet } from 'disklet'
import { JsonObject } from 'edge-core-js'

import { CurrencyContext } from '../cliContext'
import { saveCliSettings } from '../cliSettings'

export class SelectPlugin extends Command<CurrencyContext> {
  static paths = [['select-plugin']]
  static usage = { description: 'Activates a particular currency plugin' }

  pluginId = Option.String({ required: true })
  initOptions = Option.String({ required: false })

  async execute(): Promise<number> {
    const { pluginId } = this
    const { disklet, log, plugins, settings, state, stderr } = this.context

    let initOptions: JsonObject = settings.initOptions[pluginId] ?? {}
    if (this.initOptions != null) {
      initOptions = JSON.parse(this.initOptions)
      settings.initOptions[pluginId] = initOptions
    }

    if (state.engine != null) {
      await state.engine.killEngine()
      state.engine = undefined
    }

    const pluginFactory = plugins[pluginId]
    if (pluginFactory == null) {
      stderr.write(`Cannot find plugin ${pluginId}\n`)
      return 1
    }

    // Boot the plugin:
    const plugin = pluginFactory({
      initOptions,
      io: this.context,
      log,
      nativeIo: {},
      pluginDisklet: navigateDisklet(disklet, pluginId)
    })
    const tools = await plugin.makeCurrencyTools()
    state.plugin = plugin
    state.tools = tools

    // Update disk:
    settings.lastPluginId = pluginId
    settings.lastRunning = false
    await saveCliSettings(disklet, settings)

    return 0
  }
}
