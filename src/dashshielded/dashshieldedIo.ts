import type {
  Addresses,
  BalanceEvent,
  CreateTransferOpts,
  ErrorEvent,
  InitializerConfig,
  ProposalSuccess,
  ProposeTransferOpts,
  SpendFailure,
  SpendSuccess,
  StatusEvent,
  SynchronizerCallbacks,
  Tools,
  TransactionEvent,
  UpdateEvent
} from 'dash-shielded-native'
import { bridgifyObject, emit, onMethod, Subscriber } from 'yaob'

export interface DashshieldedEvents {
  balanceChanged: BalanceEvent
  error: ErrorEvent
  statusChanged: StatusEvent
  transactionsChanged: TransactionEvent
  update: UpdateEvent
}

export interface DashshieldedSynchronizer {
  on: Subscriber<DashshieldedEvents>
  createTransfer: (
    opts: CreateTransferOpts
  ) => Promise<SpendSuccess | SpendFailure>
  deriveShieldedAddress: () => Promise<Addresses>
  proposeTransfer: (opts: ProposeTransferOpts) => Promise<ProposalSuccess>
  startSync: () => Promise<void>
  stopSync: () => Promise<void>
  stop: () => Promise<string>
}

export interface DashshieldedIo {
  readonly Tools: typeof Tools
  readonly makeSynchronizer: (
    config: InitializerConfig
  ) => Promise<DashshieldedSynchronizer>
}

export interface NativeDashshieldedSynchronizer {
  subscribe: (callbacks: SynchronizerCallbacks) => void
  deriveShieldedAddress: () => Promise<Addresses>
  startSync: () => Promise<void>
  stopSync: () => Promise<void>
  proposeTransfer: (opts: ProposeTransferOpts) => Promise<ProposalSuccess>
  createTransfer: (
    opts: CreateTransferOpts
  ) => Promise<SpendSuccess | SpendFailure>
  stop: () => Promise<string>
}

export function wrapDashshieldedNative(native: {
  Tools: typeof Tools
  makeSynchronizer: (
    config: InitializerConfig
  ) => Promise<NativeDashshieldedSynchronizer>
}): DashshieldedIo {
  return bridgifyObject<DashshieldedIo>({
    Tools: bridgifyObject(native.Tools),

    async makeSynchronizer(config) {
      const realSynchronizer: NativeDashshieldedSynchronizer =
        await native.makeSynchronizer(config)

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

      const out: DashshieldedSynchronizer = bridgifyObject({
        on: onMethod,
        deriveShieldedAddress: async () => {
          return await realSynchronizer.deriveShieldedAddress()
        },
        startSync: async () => {
          return await realSynchronizer.startSync()
        },
        stopSync: async () => {
          return await realSynchronizer.stopSync()
        },
        proposeTransfer: async proposeTransferOpts => {
          return await realSynchronizer.proposeTransfer(proposeTransferOpts)
        },
        createTransfer: async transferOpts => {
          return await realSynchronizer.createTransfer(transferOpts)
        },
        stop: async () => {
          return await realSynchronizer.stop()
        }
      })

      return out
    }
  })
}

export function makeDashshieldedIo(): DashshieldedIo {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const native = require('dash-shielded-native')
  return wrapDashshieldedNative(native)
}
