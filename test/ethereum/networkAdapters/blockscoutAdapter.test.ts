import { assert } from 'chai'
import { describe, it } from 'mocha'

import { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import {
  BlockscoutAdapter,
  BlockscoutAdapterConfig
} from '../../../src/ethereum/networkAdapters/BlockscoutAdapter'

const HOSTED = 'https://api.blockscout.com'
const INSTANCE = 'https://robinhoodchain.blockscout.com'

function makeAdapter(
  servers: string[],
  blockscoutApiKey?: string | string[]
): {
  adapter: BlockscoutAdapter
  config: BlockscoutAdapterConfig
  warnings: string[]
} {
  const warnings: string[] = []
  const engine = {
    initOptions: { blockscoutApiKey },
    warn(message: string) {
      warnings.push(message)
    }
  }
  const config: BlockscoutAdapterConfig = { type: 'blockscout', servers }
  const adapter = new BlockscoutAdapter(
    engine as unknown as EthereumEngine,
    config
  )
  return { adapter, config, warnings }
}

describe('BlockscoutAdapter without a blockscoutApiKey', function () {
  it('drops the hosted API and keeps an instance', function () {
    const { adapter, warnings } = makeAdapter([HOSTED, INSTANCE])

    assert.deepEqual(adapter.config.servers, [INSTANCE])
    assert.lengthOf(warnings, 1)
    assert.isNotNull(adapter.fetchInternalTxs)
  })

  it('treats an empty string and an empty list as no key', function () {
    for (const key of ['', []]) {
      const { adapter } = makeAdapter([HOSTED, INSTANCE], key)
      assert.deepEqual(adapter.config.servers, [INSTANCE])
    }
  })

  it('leaves the waterfall when no server is left', function () {
    const { adapter } = makeAdapter([HOSTED])

    assert.deepEqual(adapter.config.servers, [])
    assert.isNull(adapter.fetchBlockheight)
    assert.isNull(adapter.fetchInternalTxs)
    assert.isNull(adapter.fetchTxs)
  })

  it('does not write through to the shared config', function () {
    const { config } = makeAdapter([HOSTED, INSTANCE])

    assert.deepEqual(config.servers, [HOSTED, INSTANCE])
  })
})

describe('BlockscoutAdapter with a blockscoutApiKey', function () {
  it('keeps the hosted API', function () {
    const { adapter, warnings } = makeAdapter([HOSTED, INSTANCE], 'key')

    assert.deepEqual(adapter.config.servers, [HOSTED, INSTANCE])
    assert.lengthOf(warnings, 0)
    assert.isNotNull(adapter.fetchInternalTxs)
  })
})
