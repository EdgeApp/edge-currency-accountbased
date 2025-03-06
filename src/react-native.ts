import { EdgeOtherMethods } from 'edge-core-js/types'
import { NativeModules } from 'react-native'

import { makePiratechainIo } from './piratechain/piratechainIo'
import { makeZcashIo } from './zcash/zcashIo'

const { EdgeCurrencyAccountbasedModule } = NativeModules
const { sourceUri } = EdgeCurrencyAccountbasedModule.getConstants()

export const pluginUri = sourceUri
export const debugUri = 'http://localhost:8082/edge-currency-accountbased.js'

/**
 * @deprecated Use the `makePluginIo` from 'edge-currency-accountbased/rn'
 * This deprecated version makes pritatechain and zcash mandatory.
 */
export function makePluginIo(): EdgeOtherMethods {
  return {
    piratechain: makePiratechainIo(),
    zcash: makeZcashIo()
  }
}
