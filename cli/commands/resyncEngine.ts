import { Command, Option } from 'clipanion'

import { CurrencyContext, getCliEngine } from '../cliContext'

export class ResyncEngine extends Command<CurrencyContext> {
  static paths = [['resync-engine']]
  static usage = { description: 'Re-syncs a wallet engine' }

  hard = Option.Boolean('hard', {
    description: 'Deletes the wallet folder first'
  })

  async execute(): Promise<number> {
    const { disklet } = this.context
    const { engine, pluginId } = getCliEngine(this.context)

    if (this.hard === true) {
      await disklet.delete(pluginId)
      await disklet.delete(`${pluginId}-encrypted`)
    }

    await engine.resyncBlockchain()

    return 0
  }
}
