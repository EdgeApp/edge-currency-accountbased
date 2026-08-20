import { join } from 'path'

import { PluginEnvironment } from '../common/innerPlugin'
import { makeMoneroIo } from './moneroIo.node'
import { MoneroTools } from './MoneroTools'
import type { MoneroIo, MoneroNetworkInfo } from './moneroTypes'

function contextPath(
  io: PluginEnvironment<MoneroNetworkInfo>['io']
): string | undefined {
  const value = 'path' in io ? (io as { path?: unknown }).path : undefined
  return typeof value === 'string' && value !== '' ? value : undefined
}

export async function makeCurrencyTools(
  env: PluginEnvironment<MoneroNetworkInfo>
): Promise<MoneroTools> {
  const injected = env.nativeIo.monero as MoneroIo | undefined
  if (injected != null) {
    return new MoneroTools(env)
  }

  const path = contextPath(env.io)
  if (path == null) {
    throw new Error('Need monero native IO')
  }

  const monero = makeMoneroIo({
    documentDirectory: join(path, 'native', 'monero')
  })
  return new MoneroTools({
    ...env,
    nativeIo: { ...env.nativeIo, monero }
  })
}

export { makeCurrencyEngine } from './MoneroEngine'
export { updateInfoPayload } from './MoneroTools'
