import { NativeModules } from 'react-native'
import type { NativeZanoModule } from 'zano-native'

export function makeZanoIo(): NativeZanoModule {
  return NativeModules.ZanoModule
}
