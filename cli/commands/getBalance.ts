import { Command, Option } from 'clipanion'

import { CurrencyContext, getCliEngine } from '../cliContext'

export class GetBalance extends Command<CurrencyContext> {
  static paths = [['get-balance']]
  static usage = { description: 'Shows the balance' }

  tokenId = Option.String({ required: false })

  async execute(): Promise<number> {
    const { tokenId = null } = this
    const { settings, stdout } = this.context
    const { engine, pluginId, currencyInfo } = await getCliEngine(this.context)

    // Get the currency code:
    const customTokens = settings.customTokens[pluginId] ?? {}
    const allTokens = { ...customTokens }
    const { currencyCode } = tokenId == null ? currencyInfo : allTokens[tokenId]

    const nativeBalance = await engine.getBalance({ tokenId })
    stdout.write(`${currencyCode}: ${nativeBalance}\n`)

    return 0
  }
}
