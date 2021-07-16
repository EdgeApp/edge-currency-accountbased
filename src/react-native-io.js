// @flow
import { AddressTool, KeyTool, makeSynchronizer } from 'react-native-zcash'
import { bridgifyObject } from 'yaob'

export type ZcashSynchronizer = {
  start: () => Promise<void>
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
    AddressTool,
    async makeSynchronizer(arg: any) {
      const realSynchronizer = await makeSynchronizer(arg)

      const out: ZcashSynchronizer = bridgifyObject({
        start: () => {
          return realSynchronizer.start()
        }
      })
      return out
    }
  }
}
