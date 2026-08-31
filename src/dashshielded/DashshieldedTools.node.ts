import { join } from 'path'

import { PluginEnvironment } from '../common/innerPlugin'
import type { DashshieldedIo } from './dashshieldedIo'
import { makeDashshieldedIo } from './dashshieldedIo.node'
import { DashshieldedTools } from './DashshieldedTools'
import type { DashshieldedNetworkInfo } from './dashshieldedTypes'

function contextPath(
  io: PluginEnvironment<DashshieldedNetworkInfo>['io']
): string | undefined {
  const value = 'path' in io ? (io as { path?: unknown }).path : undefined
  return typeof value === 'string' && value !== '' ? value : undefined
}

export async function makeCurrencyTools(
  env: PluginEnvironment<DashshieldedNetworkInfo>
): Promise<DashshieldedTools> {
  const injected = env.nativeIo.dashshielded as DashshieldedIo | undefined
  if (injected != null) {
    return new DashshieldedTools(env)
  }

  const path = contextPath(env.io)
  if (path == null) {
    throw new Error('Need dashshielded native IO')
  }

  const dashshielded = makeDashshieldedIo({
    documentDirectory: join(path, 'native', 'dashshielded')
  })
  env.nativeIo = { ...env.nativeIo, dashshielded }
  return new DashshieldedTools(env)
}

export { makeCurrencyEngine } from './DashshieldedEngine'
export { updateInfoPayload } from './DashshieldedTools'
