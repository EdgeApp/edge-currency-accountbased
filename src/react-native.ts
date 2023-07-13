import { EdgeOtherMethods } from 'edge-core-js/types'
import { NativeModules } from 'react-native'
import {
  AddressTool as PiratechainAddressTool,
  KeyTool as PiratechainKeyTool,
  makeSynchronizer as PiratechainMakeSynchronizer,
  Synchronizer as PirateSynchronizer
} from 'react-native-piratechain'
import {
  AddressTool as ZcashAddressTool,
  KeyTool as ZcashKeyTool,
  makeSynchronizer as ZcashMakeSynchronizer,
  Synchronizer as ZcashSynchronizer
} from 'react-native-zcash'
import { bridgifyObject, emit, onMethod } from 'yaob'

import { PiratechainInitializerConfig } from './piratechain/piratechainTypes'
import { ZcashInitializerConfig } from './zcash/zcashTypes'

const { EdgeCurrencyAccountbasedModule } = NativeModules
const { sourceUri } = EdgeCurrencyAccountbasedModule.getConstants()

export const pluginUri = sourceUri
export const debugUri = 'http://localhost:8082/edge-currency-accountbased.js'

const makePiratechainSynchronizer = async (
  config: PiratechainInitializerConfig
): Promise<PirateSynchronizer> => {
  const realSynchronizer = await PiratechainMakeSynchronizer(config)

  realSynchronizer.subscribe({
    onStatusChanged(status): void {
      emit(out, 'statusChanged', status)
    },
    onUpdate(event): void {
      emit(out, 'update', event)
    }
  })

  const out: PirateSynchronizer = bridgifyObject({
    // @ts-expect-error
    on: onMethod,
    start: async () => {
      return await realSynchronizer.start()
    },
    getTransactions: async blockRange => {
      return await realSynchronizer.getTransactions(blockRange)
    },
    rescan: height => {
      return realSynchronizer.rescan(height)
    },
    sendToAddress: async spendInfo => {
      return await realSynchronizer.sendToAddress(spendInfo)
    },
    getShieldedBalance: async () => {
      return await realSynchronizer.getShieldedBalance()
    },
    stop: async () => {
      return await realSynchronizer.stop()
    }
  })
  return out
}

const makeZcashSynchronizer = async (
  config: ZcashInitializerConfig
): Promise<ZcashSynchronizer> => {
  const realSynchronizer = await ZcashMakeSynchronizer(config)

  realSynchronizer.subscribe({
    onStatusChanged(status): void {
      emit(out, 'statusChanged', status)
    },
    onUpdate(event): void {
      emit(out, 'update', event)
    }
  })

  const out: ZcashSynchronizer = bridgifyObject({
    // @ts-expect-error
    on: onMethod,
    start: async () => {
      return await realSynchronizer.start()
    },
    getTransactions: async blockRange => {
      return await realSynchronizer.getTransactions(blockRange)
    },
    rescan: height => {
      return realSynchronizer.rescan(height)
    },
    sendToAddress: async spendInfo => {
      return await realSynchronizer.sendToAddress(spendInfo)
    },
    getShieldedBalance: async () => {
      return await realSynchronizer.getShieldedBalance()
    },
    stop: async () => {
      return await realSynchronizer.stop()
    }
  })
  return out
}

export function makePluginIo(): EdgeOtherMethods {
  bridgifyObject(PiratechainKeyTool)
  bridgifyObject(PiratechainAddressTool)
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
    piratechain: bridgifyObject({
      KeyTool: PiratechainKeyTool,
      AddressTool: PiratechainAddressTool,
      async makeSynchronizer(config: PiratechainInitializerConfig) {
        return await makePiratechainSynchronizer(config)
      }
    }),
    zcash: bridgifyObject({
      KeyTool: ZcashKeyTool,
      AddressTool: ZcashAddressTool,
      async makeSynchronizer(config: ZcashInitializerConfig) {
        return await makeZcashSynchronizer(config)
      }
    })
  }
}
