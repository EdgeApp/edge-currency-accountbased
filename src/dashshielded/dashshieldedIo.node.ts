import { mkdirSync } from 'fs'
import { makeNodeDashShieldedModule } from 'dash-shielded-native/node'

import { type DashshieldedIo, wrapDashshieldedNative } from './dashshieldedIo'

export interface MakeNodeDashshieldedIoOpts {
  documentDirectory: string
}

/**
 * Node N-API Dash shielded native IO for in-process plugins (CLI).
 * Do not import this from the React Native / webpack bundle.
 */
export function makeDashshieldedIo(
  opts: MakeNodeDashshieldedIoOpts
): DashshieldedIo {
  mkdirSync(opts.documentDirectory, { recursive: true })
  return wrapDashshieldedNative(makeNodeDashShieldedModule(opts))
}
