import { mkdirSync } from 'fs'
import type { NativeZanoModule } from 'zano-native/node'
import { makeNodeZanoModule } from 'zano-native/node'

export interface MakeNodeZanoIoOpts {
  documentDirectory: string
}

/**
 * Node N-API Zano native IO for in-process plugins (CLI).
 * Do not import this from the React Native / webpack bundle.
 */
export function makeZanoIo(opts: MakeNodeZanoIoOpts): NativeZanoModule {
  mkdirSync(opts.documentDirectory, { recursive: true })
  return makeNodeZanoModule(opts)
}
