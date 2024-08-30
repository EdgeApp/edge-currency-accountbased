import { EdgeOtherMethods } from 'edge-core-js/types'
import { NativeModules } from 'react-native'
import {
  makeSynchronizer as PiratechainMakeSynchronizer,
  Synchronizer as PiratechainSynchronizer,
  Tools as PiratechainNativeTools
} from 'react-native-piratechain'
import {
  InitializerConfig,
  makeSynchronizer as ZcashMakeSynchronizer,
  Synchronizer as ZcashSynchronizer,
  Tools as ZcashNativeTools
} from 'react-native-zcash'
import { bridgifyObject, emit, onMethod } from 'yaob'

import { PiratechainInitializerConfig } from './piratechain/piratechainTypes'

const { EdgeCurrencyAccountbasedModule } = NativeModules
const { sourceUri } = EdgeCurrencyAccountbasedModule.getConstants()

export const pluginUri = sourceUri
export const debugUri = 'http://localhost:8082/edge-currency-accountbased.js'

const makePiratechainSynchronizer = async (
  config: PiratechainInitializerConfig
): Promise<PiratechainSynchronizer> => {
  const realSynchronizer = await PiratechainMakeSynchronizer(config)

  realSynchronizer.subscribe({
    onStatusChanged(status): void {
      emit(out, 'statusChanged', status)
    },
    onUpdate(event): void {
      emit(out, 'update', event)
    }
  })

  const out: PiratechainSynchronizer = bridgifyObject({
    // @ts-expect-error
    on: onMethod,
    deriveUnifiedAddress: async () => {
      return await realSynchronizer.deriveUnifiedAddress()
    },
    getTransactions: async blockRange => {
      return await realSynchronizer.getTransactions(blockRange)
    },
    rescan: () => {
      return realSynchronizer.rescan()
    },
    sendToAddress: async spendInfo => {
      return await realSynchronizer.sendToAddress(spendInfo)
    },
    getBalance: async () => {
      return await realSynchronizer.getBalance()
    },
    stop: async () => {
      return await realSynchronizer.stop()
    }
  })
  return out
}

const makeZcashSynchronizer = async (
  config: InitializerConfig
): Promise<ZcashSynchronizer> => {
  const realSynchronizer = await ZcashMakeSynchronizer(config)

  realSynchronizer.subscribe({
    onBalanceChanged(event): void {
      emit(out, 'balanceChanged', event)
    },
    onStatusChanged(status): void {
      emit(out, 'statusChanged', status)
    },
    onTransactionsChanged(event): void {
      emit(out, 'transactionsChanged', event)
    },
    onUpdate(event): void {
      emit(out, 'update', event)
    },
    onError(event): void {
      emit(out, 'error', event)
    }
  })

  const out: ZcashSynchronizer = bridgifyObject({
    // @ts-expect-error
    on: onMethod,
    deriveUnifiedAddress: async () => {
      return await realSynchronizer.deriveUnifiedAddress()
    },
    rescan: async () => {
      return await realSynchronizer.rescan()
    },
    proposeTransfer: async spendInfo => {
      return await realSynchronizer.proposeTransfer(spendInfo)
    },
    sendToAddress: async spendInfo => {
      return await realSynchronizer.sendToAddress(spendInfo)
    },
    shieldFunds: async shieldFundsInfo => {
      return await realSynchronizer.shieldFunds(shieldFundsInfo)
    },
    stop: async () => {
      return await realSynchronizer.stop()
    }
  })
  return out
}

export function makePluginIo(): EdgeOtherMethods {
  bridgifyObject(PiratechainNativeTools)
  bridgifyObject(ZcashNativeTools)

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
      Tools: PiratechainNativeTools,
      async makeSynchronizer(config: PiratechainInitializerConfig) {
        return await makePiratechainSynchronizer(config)
      }
    }),
    zcash: bridgifyObject({
      Tools: ZcashNativeTools,
      async makeSynchronizer(config: InitializerConfig) {
        return await makeZcashSynchronizer(config)
      }
    })
  }
}
