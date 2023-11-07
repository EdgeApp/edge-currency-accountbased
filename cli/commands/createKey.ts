import { Command } from 'clipanion'

import { CurrencyContext, getCliPlugin, indentJson } from '../cliContext'
import { saveCliSettings } from '../cliSettings'

export class CreateKey extends Command<CurrencyContext> {
  static paths = [['create-key']]
  static usage = { description: 'Creates a private key' }

  async execute(): Promise<number> {
    const { disklet, settings, state, stdout } = this.context
    const { currencyInfo, pluginId, tools } = getCliPlugin(this.context)

    const keys = await tools.createPrivateKey(currencyInfo.walletType)
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
