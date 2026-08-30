import { join } from 'path'
import type { NativeZanoModule } from 'zano-native'

import { PluginEnvironment } from '../common/innerPlugin'
import { makeZanoIo } from './zanoIo.node'
import { ZanoTools } from './ZanoTools'
import type { ZanoNetworkInfo } from './zanoTypes'

function contextPath(
  io: PluginEnvironment<ZanoNetworkInfo>['io']
): string | undefined {
  const value = 'path' in io ? (io as { path?: unknown }).path : undefined
  return typeof value === 'string' && value !== '' ? value : undefined
}

export async function makeCurrencyTools(
  env: PluginEnvironment<ZanoNetworkInfo>
): Promise<ZanoTools> {
  const injected = env.nativeIo.zano as NativeZanoModule | undefined
  if (injected != null) {
    return new ZanoTools(env)
  }

  const path = contextPath(env.io)
  if (path == null) {
    throw new Error('Need zano native IO')
  }

  const zano = makeZanoIo({
    documentDirectory: join(path, 'native', 'zano')
  })
  return new ZanoTools({
    ...env,
    nativeIo: { ...env.nativeIo, zano }
  })
}

export { makeCurrencyEngine } from './ZanoEngine'
export { updateInfoPayload } from './ZanoTools'
