import type {
  Addresses,
  BlockRange,
  ConfirmedTransaction,
  ErrorEvent,
  InitializerConfig,
  SpendFailure,
  SpendInfo,
  SpendSuccess,
  StatusEvent,
  Synchronizer,
  UpdateEvent,
  WalletBalance
} from 'react-native-piratechain'
import { makeSynchronizer, Tools } from 'react-native-piratechain'
import { bridgifyObject, emit, onMethod, Subscriber } from 'yaob'

export interface PiratechainEvents {
  error: ErrorEvent
  statusChanged: StatusEvent
  update: UpdateEvent
}

export interface PiratechainSynchronizer {
  on: Subscriber<PiratechainEvents>
  deriveUnifiedAddress: () => Promise<Addresses>
  getBalance: () => Promise<WalletBalance>
  getTransactions: (range: BlockRange) => Promise<ConfirmedTransaction[]>
  rescan: () => Promise<void>
  sendToAddress: (spendInfo: SpendInfo) => Promise<SpendSuccess | SpendFailure>
  stop: () => Promise<String>
}

export interface PiratechainIo {
  Tools: typeof Tools
  makeSynchronizer: (
    config: InitializerConfig
  ) => Promise<PiratechainSynchronizer>
}

export function makePiratechainIo(): PiratechainIo {
  return bridgifyObject<PiratechainIo>({
    Tools: bridgifyObject(Tools),

    async makeSynchronizer(config) {
      const realSynchronizer: Synchronizer = await makeSynchronizer(config)

      realSynchronizer.subscribe({
        onError(event): void {
          emit(out, 'error', event)
        },
        onStatusChanged(status): void {
          emit(out, 'statusChanged', status)
        },
        onUpdate(event): void {
          emit(out, 'update', event)
        }
      })

      const out: PiratechainSynchronizer = bridgifyObject({
        on: onMethod,
        deriveUnifiedAddress: async () => {
          return await realSynchronizer.deriveUnifiedAddress()
        },
        getBalance: async () => {
          return await realSynchronizer.getBalance()
        },
        getTransactions: async blockRange => {
          return await realSynchronizer.getTransactions(blockRange)
        },
        rescan: async () => {
          return realSynchronizer.rescan()
        },
        sendToAddress: async spendInfo => {
          return await realSynchronizer.sendToAddress(spendInfo)
        },
        stop: async () => {
          return await realSynchronizer.stop()
        }
      })

      return out
    }
  })
}
