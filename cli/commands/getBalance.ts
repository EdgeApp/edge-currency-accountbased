import { Command, Option } from 'clipanion'

import { CurrencyContext, getCliEngine } from '../cliContext'

export class GetBalance extends Command<CurrencyContext> {
  static paths = [['get-balance']]
  static usage = { description: 'Shows the balance' }

  tokenId = Option.String({ required: false })

  async execute(): Promise<number> {
    const { tokenId } = this
    const { settings, stdout } = this.context
    const { engine, plugin, pluginId, currencyInfo } = await getCliEngine(
      this.context
    )

    // Get the currency code:
    const builtinTokens =
      plugin.getBuiltinTokens == null ? {} : await plugin.getBuiltinTokens()
    const customTokens = settings.customTokens[pluginId] ?? {}
    const allTokens = { ...builtinTokens, ...customTokens }
    const { currencyCode } = tokenId == null ? currencyInfo : allTokens[tokenId]

    const nativeBalance = await engine.getBalance({ currencyCode })
    stdout.write(`${currencyCode}: ${nativeBalance}\n`)

    return 0
  }
}
