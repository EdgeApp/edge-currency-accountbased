import { Command } from 'clipanion'

import { CurrencyContext, indentJson, makeCliWalletInfo } from '../cliContext'

export class Status extends Command<CurrencyContext> {
  static paths = [['status']]
  static usage = { description: 'Shows the current CLI status' }

  async execute(): Promise<number> {
    const { stdout, state, settings } = this.context
    const { lastPluginId, initOptions, privateKeys } = settings

    if (lastPluginId == null) {
      stdout.write(`No plugin selected\n`)
      return 0
    }

    stdout.write(`pluginId: ${lastPluginId}\n`)

    if (state.tools == null || state.plugin == null) {
      stdout.write(`Plugin failed to load. Try select-plugin again.\n`)
    }

    if (initOptions[lastPluginId] != null) {
      stdout.write(`initOptions: ${indentJson(initOptions[lastPluginId])}\n`)
    }

    if (privateKeys[lastPluginId] != null) {
      stdout.write(`privateKey: ${indentJson(privateKeys[lastPluginId])}\n`)

      if (state.tools != null && state.plugin != null) {
        const publicKey = await state.tools
          ?.derivePublicKey(
            makeCliWalletInfo(state.plugin, privateKeys[lastPluginId])
          )
          .catch(error => String(error))
        stdout.write(`publicKey: ${indentJson(publicKey)}\n`)
      }
    }

    if (state.engine != null) {
      stdout.write(`engine running\n`)
    }

    return 0
  }
}
