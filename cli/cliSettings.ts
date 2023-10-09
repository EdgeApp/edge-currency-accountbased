import {
  asArray,
  asBoolean,
  asObject,
  asOptional,
  asString,
  asUnknown,
  uncleaner
} from 'cleaners'
import { Disklet } from 'disklet'
import type { EdgeToken, JsonObject } from 'edge-core-js'

const cliJsonFilename = 'cli.json'

const asEdgeCustomToken = asObject<EdgeToken>({
  currencyCode: asString,
  denominations: asArray(
    asObject({
      multiplier: asString,
      name: asString
    })
  ),
  displayName: asString,
  networkLocation: (raw): JsonObject => raw
})

export const asCliSettings = asObject({
  // Saved tokens per plugin:
  customTokens: asObject(asObject(asEdgeCustomToken)),
  enabledTokens: asObject(asArray(asString)),

  // Saved init options per plugin:
  initOptions: asObject(asUnknown),

  // Saved private keys per plugin:
  privateKeys: asObject(asUnknown),

  // Last chosen plugin:
  lastPluginId: asOptional(asString),

  // True if the last session had a running engine:
  lastRunning: asBoolean
})
export type CliSettings = ReturnType<typeof asCliSettings>
const wasCliJson = uncleaner(asCliSettings)

export async function readCliSettings(disklet: Disklet): Promise<CliSettings> {
  try {
    const text = await disklet.getText(cliJsonFilename)
    const json = JSON.parse(text)
    return asCliSettings(json)
  } catch (error) {
    return {
      customTokens: {},
      enabledTokens: {},
      initOptions: {},
      privateKeys: {},
      lastPluginId: undefined,
      lastRunning: false
    }
  }
}

export async function saveCliSettings(
  disklet: Disklet,
  json: CliSettings
): Promise<void> {
  const text = JSON.stringify(wasCliJson(json), null, 1)
  await disklet.setText(cliJsonFilename, text)
}
