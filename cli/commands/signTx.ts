import { Command } from 'clipanion'

import {
  CurrencyContext,
  getCliTx,
  indentJson,
  makeCliWalletInfo
} from '../cliContext'

export class SignTx extends Command<CurrencyContext> {
  static paths = [['sign-tx']]
  static usage = { description: 'Signs a transaction' }

  async execute(): Promise<number> {
    const { stdout, state, settings } = this.context
    const { engine, plugin, pluginId, tx } = await getCliTx(this.context)
    const { privateKeys } = settings

    state.tx = await engine.signTx(
      tx,
      makeCliWalletInfo(plugin, privateKeys[pluginId])
    )
    stdout.write(indentJson(tx))

    return 0
  }
}
