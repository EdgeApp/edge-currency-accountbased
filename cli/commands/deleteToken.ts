import { Command, Option } from 'clipanion'

import { CurrencyContext, getCliPlugin } from '../cliContext'
import { saveCliSettings } from '../cliSettings'

export class DeleteToken extends Command<CurrencyContext> {
  static paths = [['delete-token']]
  static usage = { description: 'Deletes a custom token' }

  tokenId = Option.String({ required: true })

  async execute(): Promise<number> {
    const { tokenId } = this
    const { disklet, settings, state } = this.context
    const { pluginId } = await getCliPlugin(this.context)

    // Remove from the engine:
    const { [tokenId]: _, ...customTokens } =
      settings.customTokens[pluginId] ?? {}
    if (state.engine?.changeCustomTokens != null) {
      await state.engine.changeCustomTokens(customTokens)
    }

    // Save:
    settings.customTokens[pluginId] = customTokens
    await saveCliSettings(disklet, settings)

    return 0
  }
}
