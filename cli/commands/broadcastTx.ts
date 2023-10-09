import { Command } from 'clipanion'

import { CurrencyContext, getCliTx } from '../cliContext'

export class BroadcastTx extends Command<CurrencyContext> {
  static paths = [['broadcast-tx']]
  static usage = { description: 'Broadcasts a transaction' }

  async execute(): Promise<number> {
    const { state } = this.context
    const { engine, tx } = await getCliTx(this.context)

    state.tx = await engine.broadcastTx(tx)
    return 0
  }
}
