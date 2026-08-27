import { mkdirSync } from 'fs'
import type { WalletEventData } from 'monero-node'
import { makeNodeMoneroModule } from 'monero-node'

import type { MoneroIo } from './moneroTypes'

export interface MakeNodeMoneroIoOpts {
  documentDirectory: string
}

/**
 * Node N-API `MoneroIo` for in-process plugins (CLI).
 * Do not import this from the React Native / webpack bundle.
 */
export function makeMoneroIo(opts: MakeNodeMoneroIoOpts): MoneroIo {
  mkdirSync(opts.documentDirectory, { recursive: true })
  const nativeModule = makeNodeMoneroModule(opts)

  const io: MoneroIo = {
    on(name, listener) {
      if (name !== 'walletEvent') return () => {}
      const handler = (event: WalletEventData): void => {
        listener(event)
      }
      nativeModule.on('MoneroWalletEvent', handler)
      return () => {
        nativeModule.off('MoneroWalletEvent', handler)
      }
    },
    async callMonero(name: string, jsonArguments: string[]): Promise<string> {
      return await nativeModule.callMonero(name, jsonArguments)
    },
    get methodNames(): string[] {
      return nativeModule.methodNames
    },
    get documentDirectory(): string {
      return nativeModule.documentDirectory
    }
  }

  return io
}
