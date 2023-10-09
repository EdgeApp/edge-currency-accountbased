import { Command } from 'clipanion'

import { CurrencyContext, getCliEngine } from '../cliContext'
import { saveCliSettings } from '../cliSettings'

export class KillEngine extends Command<CurrencyContext> {
  static paths = [['kill-engine']]
  static usage = { description: 'Shuts down a wallet engine' }

  async execute(): Promise<number> {
    const { disklet, settings, state } = this.context
    const { engine } = getCliEngine(this.context)

    await engine.killEngine()
    state.engine = undefined
    settings.lastRunning = false
    await saveCliSettings(disklet, settings)

    return 0
  }
}
