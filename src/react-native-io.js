// @flow
import { AddressTool, KeyTool, makeSynchronizer } from 'react-native-zcash'
import { bridgifyObject, emit, onMethod } from 'yaob'

import type {
  ZcashInitializerConfig,
  ZcashPendingTransaction,
  ZcashStatusEvent,
  ZcashSynchronizer,
  ZcashUpdateEvent,
  ZcashWalletBalance
} from './zcash/zecTypes'

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
    async makeSynchronizer(config: ZcashInitializerConfig) {
      const realSynchronizer = await makeSynchronizer(config)

      realSynchronizer.subscribe({
        onShieldedBalanceChanged(walletBalance: ZcashWalletBalance): void {
          emit(out, 'shieldedBalanceChanged', walletBalance)
        },
        onStatusChanged(status: ZcashStatusEvent): void {
          emit(out, 'statusChanged', status)
        },
        onUpdate(event: ZcashUpdateEvent): void {
          emit(out, 'update', event)
        },
        onTransactionsChanged(count: number): void {
          emit(out, 'transactionsChanged', count)
        },
        onPendingTransactionUpdated(tx: ZcashPendingTransaction): void {
          emit(out, 'pendingTransactionUpdated', tx)
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
}
