import { Command } from 'clipanion'

import { CurrencyContext, getCliPlugin } from '../cliContext'

export class ListTokens extends Command<CurrencyContext> {
  static paths = [['list-tokens']]
  static usage = { description: 'Lists available tokens' }

  async execute(): Promise<number> {
    const { stdout, settings } = this.context
    const { plugin, pluginId } = await getCliPlugin(this.context)

    const builtinTokens =
      plugin.getBuiltinTokens == null ? {} : await plugin.getBuiltinTokens()
    const customTokens = settings.customTokens[pluginId] ?? {}
    const enabledTokens = settings.enabledTokens[pluginId] ?? []

    for (const tokenId of Object.keys(builtinTokens)) {
      const token = builtinTokens[tokenId]
      stdout.write(
        `${tokenId}, ${token.currencyCode}${
          enabledTokens.includes(tokenId) ? ' (enabled)' : ''
        }\n`
      )
    }
    for (const tokenId of Object.keys(customTokens)) {
      const token = customTokens[tokenId]
      stdout.write(
        `${tokenId}, ${token.currencyCode} ${
          enabledTokens.includes(tokenId) ? '(custom, enabled)' : '(custom)'
        }\n`
      )
    }

    return 0
  }
}
