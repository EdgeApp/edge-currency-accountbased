import { Command } from 'clipanion'

import { CurrencyContext, getCliTx } from '../cliContext'

export class SaveTx extends Command<CurrencyContext> {
  static paths = [['save-tx']]
  static usage = { description: 'Saves a sent transaction' }

  async execute(): Promise<number> {
    const { engine, tx } = await getCliTx(this.context)

    await engine.saveTx(tx)
    return 0
  }
}
