import { join } from 'path'

import { PluginEnvironment } from '../common/innerPlugin'
import type { PiratechainIo } from './piratechainIo'
import { makePiratechainIo } from './piratechainIo.node'
import { PiratechainTools } from './PiratechainTools'
import type { PiratechainNetworkInfo } from './piratechainTypes'

function contextPath(
  io: PluginEnvironment<PiratechainNetworkInfo>['io']
): string | undefined {
  const value = 'path' in io ? (io as { path?: unknown }).path : undefined
  return typeof value === 'string' && value !== '' ? value : undefined
}

export async function makeCurrencyTools(
  env: PluginEnvironment<PiratechainNetworkInfo>
): Promise<PiratechainTools> {
  const injected = env.nativeIo.piratechain as PiratechainIo | undefined
  if (injected != null) {
    return new PiratechainTools(env)
  }

  const path = contextPath(env.io)
  if (path == null) {
    throw new Error('Need piratechain native IO')
  }

  const piratechain = makePiratechainIo({
    documentDirectory: join(path, 'native', 'piratechain')
  })
  env.nativeIo = { ...env.nativeIo, piratechain }
  return new PiratechainTools(env)
}

export { makeCurrencyEngine } from './PiratechainEngine'
export { updateInfoPayload } from './PiratechainTools'
