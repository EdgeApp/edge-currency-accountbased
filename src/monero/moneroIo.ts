import { NativeEventEmitter, NativeModules } from 'react-native'
import type { WalletEventData } from 'react-native-monero-lwsf'
import { bridgifyObject, emit, onMethod } from 'yaob'

import type { MoneroIo } from './moneroTypes'

export function makeMoneroIo(): MoneroIo {
  const nativeModule = NativeModules.MoneroLwsfModule

  const io: MoneroIo = bridgifyObject<MoneroIo>({
    on: onMethod,
    async callMonero(name: string, jsonArguments: string[]): Promise<string> {
      return nativeModule.callMonero(name, jsonArguments)
    },
    get methodNames(): string[] {
      return nativeModule.methodNames
    },
    get documentDirectory(): string {
      return nativeModule.documentDirectory
    }
  })

  // Forward native wallet events through the yaob bridge
  const emitter = new NativeEventEmitter(nativeModule)
  emitter.addListener('MoneroWalletEvent', (event: WalletEventData) => {
    emit(io, 'walletEvent', event)
  })

  return io
}
