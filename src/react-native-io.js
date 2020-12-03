// @flow
// The native code will use this file to set up the IO object
// before sending it across the bridge to the core side.

import { AddressTool, KeyTool, makeSynchronizer } from 'react-native-zcash'
import { bridgifyObject } from 'yaob'

export default function makeCustomIo(): any {
  bridgifyObject(KeyTool)
  bridgifyObject(AddressTool)
  bridgifyObject(makeSynchronizer)

  return {
    KeyTool,
    AddressTool,
    makeSynchronizer
  }
}
