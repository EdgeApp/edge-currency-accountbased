import { Command, Option } from 'clipanion'
import { JsonObject } from 'edge-core-js'

import { CurrencyContext, getCliPlugin, indentJson } from '../cliContext'
import { saveCliSettings } from '../cliSettings'

export class ImportKey extends Command<CurrencyContext> {
  static paths = [['import-key']]
  static usage = { description: 'Imports a private key' }

  keyText = Option.String({ required: true })
  options = Option.String({ required: false })

  async execute(): Promise<number> {
    const { disklet, settings, state, stdout } = this.context
    const { pluginId, tools } = getCliPlugin(this.context)

    let options: JsonObject | undefined
    if (this.options != null) options = JSON.parse(this.options)

    if (tools.importPrivateKey == null) {
      stdout.write('Not implemented')
      return 1
    }

    const keys = await tools.importPrivateKey(this.keyText, options)
    stdout.write(indentJson(keys))

    if (state.engine != null) {
      stdout.write('Use start-engine to reload the engine')
    }

    // Update disk:
    settings.privateKeys[pluginId] = keys
    await saveCliSettings(disklet, settings)

    return 0
  }
}
