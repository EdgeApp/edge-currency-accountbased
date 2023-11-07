import { Command } from 'clipanion'

import {
  CurrencyContext,
  getCliPlugin,
  makeCliEngine,
  makeCliWalletInfo
} from '../cliContext'
import { saveCliSettings } from '../cliSettings'

export class StartEngine extends Command<CurrencyContext> {
  static paths = [['start-engine']]
  static usage = { description: 'Creates an engine for the selected plugin' }

  async execute(): Promise<number> {
    const { disklet, settings, state } = this.context
    const { plugin, pluginId, tools } = getCliPlugin(this.context)

    const privateKey = settings.privateKeys[pluginId]
    if (privateKey == null) {
      throw new Error('Use create-key or import-key first')
    }

    const publicKey = await tools.derivePublicKey(
      makeCliWalletInfo(plugin, privateKey)
    )

    state.engine = await makeCliEngine(this.context, plugin, publicKey)
    settings.lastRunning = true
    await saveCliSettings(disklet, settings)

    return 0
  }
}
