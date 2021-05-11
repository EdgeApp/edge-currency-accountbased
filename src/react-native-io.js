// @flow
import {
  AddressTool as ZecAddressTool,
  KeyTool as ZecKeyTool
} from 'react-native-zcash/lib/rnzcash.rn.js'
import { bridgifyObject } from 'yaob'

const KeyTool = {
  deriveViewingKey: async (seedBytesHex: string): Promise<string> => {
    const result = await ZecKeyTool.deriveViewingKey(seedBytesHex)
    return result
  },
  deriveSpendingKey: async (seedBytesHex: string): Promise<string> => {
    const result = await ZecKeyTool.deriveSpendingKey(seedBytesHex)
    return result
  }
}

const AddressTool = {
  deriveShieldedAddress: async (viewingKey: string): Promise<string> => {
    const result = await ZecAddressTool.deriveShieldedAddress(viewingKey)
    return result
  },
  deriveTransparentAddress: async (seedHex: string): Promise<string> => {
    const result = await ZecAddressTool.deriveTransparentAddress(seedHex)
    return result
  },
  isValidShieldedAddress: async (address: string): Promise<boolean> => {
    const result = await ZecAddressTool.isValidShieldedAddress(address)
    return result
  },
  isValidTransparentAddress: async (address: string): Promise<boolean> => {
    const result = await ZecAddressTool.isValidTransparentAddress(address)
    return result
  }
}

// TODO: Remove this entire file in the next breaking change.
export default function makePluginIo() {
  bridgifyObject(KeyTool)
  bridgifyObject(AddressTool)

  return {
    fetchText(uri: string, opts: Object) {
      return window.fetch(uri, opts).then(reply =>
        reply.text().then(text => ({
          ok: reply.ok,
          status: reply.status,
          statusText: reply.statusText,
          url: reply.url,
          text
        }))
      )
    },
    KeyTool,
    AddressTool
  }
}
