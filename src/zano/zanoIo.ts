import { NativeModules } from 'react-native'
import type { NativeZanoModule } from 'react-native-zano'

export function makeZanoIo(): NativeZanoModule {
  return NativeModules.ZanoModule
}
