import { Command, Option } from 'clipanion'

import { CurrencyContext, getCliEngine } from '../cliContext'
import { saveCliSettings } from '../cliSettings'

export class EnableToken extends Command<CurrencyContext> {
  static paths = [['enable-token']]
  static usage = { description: 'Enables a token' }

  tokenId = Option.String({ required: true })

  async execute(): Promise<number> {
    const { tokenId } = this
    const { disklet, settings } = this.context
    const { engine, pluginId } = await getCliEngine(this.context)

    if (engine.changeEnabledTokenIds == null) {
      throw new Error('changeEnabledTokenIds not implemented')
    }

    const enabledTokens = new Set(settings.enabledTokens[pluginId])
    enabledTokens.add(tokenId)
    await engine.changeEnabledTokenIds([...enabledTokens])
    settings.enabledTokens[pluginId] = [...enabledTokens]
    await saveCliSettings(disklet, settings)

    return 0
  }
}
