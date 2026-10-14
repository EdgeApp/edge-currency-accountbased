import { assert } from 'chai'
import { makeFakeIo } from 'edge-core-js'
import { describe, it } from 'mocha'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import {
  makeCurrencyTools,
  updateInfoPayload
} from '../../src/solana/SolanaTools'
import { SolanaNetworkInfo } from '../../src/solana/solanaTypes'
import { fakeLog } from '../fake/fakeLog'

const networkInfo: SolanaNetworkInfo = {
  rpcNodes: ['https://built-in.test'],
  rpcNodesArchival: ['https://built-in.test'],
  stakedConnectionRpcNodes: [],
  basePriorityFee: 50000,
  commitment: 'finalized',
  txQueryLimit: 1000,
  derivationPath: "m/44'/501'/0'/0'",
  memoPublicKey: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  tokenPublicKey: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  token2022PublicKey: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  associatedTokenPublicKey: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'
}

describe('SolanaTools', function () {
  it('connects to the nodes the info server sends', async function () {
    const env = {
      builtinTokens: {},
      currencyInfo: { pluginId: 'solana' },
      initOptions: {},
      io: makeFakeIo(),
      log: fakeLog,
      networkInfo
    } as unknown as PluginEnvironment<SolanaNetworkInfo>

    // The plugin builds its tools before the first info payload arrives:
    const tools = await makeCurrencyTools(env)
    await updateInfoPayload(env, {
      rpcNodes: ['https://override.test'],
      rpcNodesArchival: ['https://archive-override.test']
    })
    await tools.connectClient()

    assert.deepEqual(
      tools.connections.map(connection => connection.rpcEndpoint),
      ['https://override.test']
    )
    assert.deepEqual(
      tools.archiveConnections.map(connection => connection.rpcEndpoint),
      ['https://archive-override.test']
    )
  })
})
