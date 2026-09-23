import { mkdirSync } from 'fs'
import { createPirateWalletSdk } from 'piratechain-native/node'

import { type PiratechainIo, wrapPiratechainNative } from './piratechainIo'

export interface MakeNodePiratechainIoOpts {
  documentDirectory: string
}

/**
 * Node N-API Pirate Chain native IO for in-process plugins (CLI).
 * Do not import this from the React Native / webpack bundle.
 */
export function makePiratechainIo(
  opts: MakeNodePiratechainIoOpts
): PiratechainIo {
  mkdirSync(opts.documentDirectory, { recursive: true })
  return wrapPiratechainNative(() => createPirateWalletSdk(opts))
}
