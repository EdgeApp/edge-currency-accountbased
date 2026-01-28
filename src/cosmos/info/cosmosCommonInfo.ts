import type { EdgeObjectTemplate, JsonObject } from 'edge-core-js/types'

import { asCosmosUserSettings } from '../cosmosTypes'

export const cosmosCustomTokenTemplate: EdgeObjectTemplate = [
  {
    displayName: 'Contract Address',
    key: 'contractAddress',
    type: 'string'
  }
]

/**
 * The core has deprecated `defaultSettings`,
 * but the GUI still looks at it, so give the GUI just what it needs.
 */
export function makeCosmosDefaultSettings(): JsonObject {
  return {
    ...asCosmosUserSettings({})
  }
}
