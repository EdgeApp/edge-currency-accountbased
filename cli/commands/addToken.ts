import { Command, Option } from 'clipanion'
import { EdgeToken } from 'edge-core-js'

import { CurrencyContext, getCliPlugin } from '../cliContext'
import { saveCliSettings } from '../cliSettings'

export class AddToken extends Command<CurrencyContext> {
  static paths = [['add-token']]
  static usage = { description: 'Adds a custom token' }

  currencyCode = Option.String({ required: true })
  multiplier = Option.String('--multiplier', { required: false })
  displayName = Option.String('--name', { required: false })
  contractAddress = Option.String('--contract', { required: false })
  networkLocation = Option.String({ required: false })

  async execute(): Promise<number> {
    const {
      currencyCode,
      multiplier = '1',
      displayName = currencyCode,
      contractAddress,
      networkLocation
    } = this
    const { disklet, settings, stdout, state } = this.context
    const { pluginId, tools } = await getCliPlugin(this.context)

    if (tools.getTokenId == null) {
      throw new Error('getTokenId not implemented')
    }

    // Assemble the token:
    const parsedLocation =
      networkLocation != null
        ? JSON.parse(networkLocation)
        : { contractAddress }
    const token: EdgeToken = {
      currencyCode,
      displayName,
      denominations: [{ name: currencyCode, multiplier }],
      networkLocation: parsedLocation
    }
    const tokenId = await tools.getTokenId(token)
    stdout.write(`tokenId: ${tokenId}\n`)

    // Add to the engine:
    let customTokens = settings.customTokens[pluginId] ?? {}
    customTokens = { ...customTokens, [tokenId]: token }
    if (state.engine?.changeCustomTokens != null) {
      await state.engine.changeCustomTokens(customTokens)
    }

    // Save:
    settings.customTokens[pluginId] = customTokens
    await saveCliSettings(disklet, settings)

    return 0
  }
}
