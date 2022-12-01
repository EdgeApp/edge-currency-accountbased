import {
  AddressTool as ZcashAddressTool,
  KeyTool as ZcashKeyTool,
  makeSynchronizer as ZcashMakeSynchronizer
} from 'react-native-zcash'
import { bridgifyObject, emit, onMethod } from 'yaob'

import {
  ZcashInitializerConfig,
  ZcashStatusEvent,
  ZcashSynchronizer,
  ZcashUpdateEvent
} from './zcash/zecTypes'

const makePluginSynchronizer = (pluginId: string) => {
  return async (config: ZcashInitializerConfig) => {
    let realSynchronizer: any

    switch (pluginId) {
      case 'zcash':
        realSynchronizer = await ZcashMakeSynchronizer(config)
        break
      default:
        throw new Error(`${pluginId} makeSynchronizer does not exist`)
    }

    realSynchronizer.subscribe({
      onStatusChanged(status: ZcashStatusEvent): void {
        emit(out, 'statusChanged', status)
      },
      onUpdate(event: ZcashUpdateEvent): void {
        emit(out, 'update', event)
      }
    })

    const out: ZcashSynchronizer = bridgifyObject({
      on: onMethod,
      start: () => {
        return realSynchronizer.start()
      },
      getTransactions: blockRange => {
        return realSynchronizer.getTransactions(blockRange)
      },
      rescan: height => {
        return realSynchronizer.rescan(height)
      },
      sendToAddress: spendInfo => {
        return realSynchronizer.sendToAddress(spendInfo)
      },
      getShieldedBalance: () => {
        return realSynchronizer.getShieldedBalance()
      },
      stop: () => {
        return realSynchronizer.stop()
      }
    })
    return out
  }
}

// TODO: Remove this entire file in the next breaking change.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default function makePluginIo() {
  bridgifyObject(ZcashKeyTool)
  bridgifyObject(ZcashAddressTool)

  return {
    async fetchText(uri: string, opts: Object) {
      return await window.fetch(uri, opts).then(
        async reply =>
          await reply.text().then(text => ({
            ok: reply.ok,
            status: reply.status,
            statusText: reply.statusText,
            url: reply.url,
            text
          }))
      )
    },
    zcash: bridgifyObject({
      KeyTool: ZcashKeyTool,
      AddressTool: ZcashAddressTool,
      async makeSynchronizer(config: ZcashInitializerConfig) {
        return await makePluginSynchronizer('zcash')(config)
      }
    })
  }
}
