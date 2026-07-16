import type {
  Addresses,
  BalanceEvent,
  CreateTransferOpts,
  ErrorEvent,
  InitializerConfig,
  MigrationProgress,
  MigrationSchedule,
  MigrationState,
  MigrationTransferResult,
  NetworkPrivacyOptions,
  NoteSplitProposal,
  ProposalSuccess,
  ProposeTransferOpts,
  ShieldFundsInfo,
  SignScheduleOpts,
  SpendFailure,
  StatusEvent,
  SubmitNoteSplitOpts,
  Synchronizer,
  Tools,
  TransactionEvent,
  UpdateEvent
} from 'react-native-zcash'
import { bridgifyObject, emit, onMethod, Subscriber } from 'yaob'

export interface ZcashEvents {
  balanceChanged: BalanceEvent
  error: ErrorEvent
  statusChanged: StatusEvent
  transactionsChanged: TransactionEvent
  update: UpdateEvent
}

export interface ZcashSynchronizer {
  on: Subscriber<ZcashEvents>
  createTransfer: (opts: CreateTransferOpts) => Promise<string | SpendFailure>
  deriveUnifiedAddress: () => Promise<Addresses>
  proposeTransfer: (opts: ProposeTransferOpts) => Promise<ProposalSuccess>
  proposeFulfillingPaymentURI: (paymentUri: string) => Promise<ProposalSuccess>
  rescan: () => Promise<void>
  shieldFunds: (shieldFundsInfo: ShieldFundsInfo) => Promise<string>
  stop: () => Promise<string>

  // Orchard -> Ironwood migration (NU6.3). The SDK persists all migration
  // state (schedule, pre-signed transactions) in its own database, so this
  // surface is pull-based; the seed crosses per call and is never stored.
  getMigrationState: () => Promise<MigrationState>
  getMigrationProgress: () => Promise<MigrationProgress | null>
  isNoteSplitNeeded: () => Promise<boolean>
  prepareNoteSplit: () => Promise<NoteSplitProposal>
  submitNoteSplit: (
    opts: SubmitNoteSplitOpts
  ) => Promise<MigrationTransferResult>
  proposeMigrationTransfers: () => Promise<MigrationSchedule>
  proposeImmediateMigration: () => Promise<MigrationSchedule>
  signAndStoreMigrationSchedule: (opts: SignScheduleOpts) => Promise<void>
  isSyncRequiredBeforeNextTransfer: () => Promise<boolean>
  executeNextPendingTransfer: (
    privacy?: NetworkPrivacyOptions
  ) => Promise<MigrationTransferResult | null>
  hasOverdueTransfers: () => Promise<boolean>
  hasInvalidTransfers: () => Promise<boolean>
  refreshStaleTransfers: (opts: { mnemonicSeed: string }) => Promise<number>
  restartCurrentMigrationStep: () => Promise<MigrationSchedule>
  initializeIronwoodPostUpgrade: () => Promise<void>
}

export interface ZcashIo {
  readonly Tools: typeof Tools
  readonly makeSynchronizer: (
    config: InitializerConfig
  ) => Promise<ZcashSynchronizer>
}

export function makeZcashIo(): ZcashIo {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const rnzcash = require('react-native-zcash')

  return bridgifyObject<ZcashIo>({
    Tools: bridgifyObject(rnzcash.Tools),

    async makeSynchronizer(config) {
      const realSynchronizer: Synchronizer = await rnzcash.makeSynchronizer(
        config
      )

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
        on: onMethod,
        deriveUnifiedAddress: async () => {
          return await realSynchronizer.deriveUnifiedAddress()
        },
        rescan: async () => {
          return await realSynchronizer.rescan()
        },
        proposeTransfer: async proposeTransferOpts => {
          return await realSynchronizer.proposeTransfer(proposeTransferOpts)
        },
        proposeFulfillingPaymentURI: async paymentUri => {
          return await realSynchronizer.proposeFulfillingPaymentURI(paymentUri)
        },
        createTransfer: async transferOpts => {
          return await realSynchronizer.createTransfer(transferOpts)
        },
        shieldFunds: async shieldFundsInfo => {
          return await realSynchronizer.shieldFunds(shieldFundsInfo)
        },
        stop: async () => {
          return await realSynchronizer.stop()
        },

        getMigrationState: async () => {
          return await realSynchronizer.getMigrationState()
        },
        getMigrationProgress: async () => {
          return await realSynchronizer.getMigrationProgress()
        },
        isNoteSplitNeeded: async () => {
          return await realSynchronizer.isNoteSplitNeeded()
        },
        prepareNoteSplit: async () => {
          return await realSynchronizer.prepareNoteSplit()
        },
        submitNoteSplit: async opts => {
          return await realSynchronizer.submitNoteSplit(opts)
        },
        proposeMigrationTransfers: async () => {
          return await realSynchronizer.proposeMigrationTransfers()
        },
        proposeImmediateMigration: async () => {
          return await realSynchronizer.proposeImmediateMigration()
        },
        signAndStoreMigrationSchedule: async opts => {
          return await realSynchronizer.signAndStoreMigrationSchedule(opts)
        },
        isSyncRequiredBeforeNextTransfer: async () => {
          return await realSynchronizer.isSyncRequiredBeforeNextTransfer()
        },
        executeNextPendingTransfer: async privacy => {
          return await realSynchronizer.executeNextPendingTransfer(privacy)
        },
        hasOverdueTransfers: async () => {
          return await realSynchronizer.hasOverdueTransfers()
        },
        hasInvalidTransfers: async () => {
          return await realSynchronizer.hasInvalidTransfers()
        },
        refreshStaleTransfers: async opts => {
          return await realSynchronizer.refreshStaleTransfers(opts)
        },
        restartCurrentMigrationStep: async () => {
          return await realSynchronizer.restartCurrentMigrationStep()
        },
        initializeIronwoodPostUpgrade: async () => {
          return await realSynchronizer.initializeIronwoodPostUpgrade()
        }
      })

      return out
    }
  })
}
