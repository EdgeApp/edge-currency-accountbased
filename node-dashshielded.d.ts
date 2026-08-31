import type { DashshieldedIo } from './src/dashshielded/dashshieldedIo'

export function makeDashshieldedIo(opts: {
  documentDirectory: string
}): DashshieldedIo
