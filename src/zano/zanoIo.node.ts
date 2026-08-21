import { mkdirSync } from 'fs'
import type { NativeZanoModule } from 'react-native-zano'
import { makeNodeZanoModule } from 'react-native-zano/node'

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
