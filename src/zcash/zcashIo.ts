import type {
  Addresses,
  BalanceEvent,
  CreateTransferOpts,
  ErrorEvent,
  ImmediateMigrationProposal,
  InitializerConfig,
  ProposalSuccess,
  ProposeTransferOpts,
  ShieldFundsInfo,
  SpendFailure,
  StatusEvent,
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

  // Orchard -> Ironwood migration (NU6.3). The sweep is one ordinary proposal
  // the app broadcasts through createTransfer: the SDK spends every Orchard
  // note to the wallet's own address with the fee chosen so no Orchard change
  // remains, leaving the other pools untouched. Deliberately not a plain max
  // send, which would drag Sapling funds across the turnstile too.
  proposeOrchardToIronwoodMigration: () => Promise<ImmediateMigrationProposal>
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

        proposeOrchardToIronwoodMigration: async () => {
          return await realSynchronizer.proposeOrchardToIronwoodMigration()
        }
      })

      return out
    }
  })
}
