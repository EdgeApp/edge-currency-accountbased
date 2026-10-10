import { expect } from 'chai'
import { asObject } from 'cleaners'
import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  EdgeLog,
  JsonObject
} from 'edge-core-js'
import { makeFakeIo } from 'edge-core-js'
import { describe, it } from 'mocha'

import type { InnerPlugin } from '../../src/common/innerPlugin'
import { makeOuterPlugin } from '../../src/common/innerPlugin'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'

type FakeInnerPlugin = InnerPlugin<{}, EdgeCurrencyTools, {}>

const fakeIo = makeFakeIo()
const fakePluginOptions: EdgeCorePluginOptions = {
  infoPayload: {},
  initOptions: {},
  io: fakeIo,
  log: fakeLog,
  nativeIo: {},
  pluginDisklet: fakeIo.disklet
}

const fakeCurrencyInfo: EdgeCurrencyInfo = {
  addressExplorer: '',
  assetDisplayName: 'Fake',
  chainDisplayName: 'Fake',
  currencyCode: 'FAKE',
  denominations: [{ name: 'FAKE', multiplier: '1' }],
  displayName: 'Fake',
  pluginId: 'fake',
  transactionExplorer: '',
  walletType: 'wallet:fake'
}

const fakeTools: EdgeCurrencyTools = {
  async createPrivateKey() {
    return {}
  },
  async derivePublicKey() {
    return {}
  },
  async encodeUri() {
    return ''
  },
  async parseUri() {
    return {}
  }
}

const fakeInnerPlugin: FakeInnerPlugin = {
  async makeCurrencyEngine() {
    throw new Error('Not implemented')
  },
  async makeCurrencyTools() {
    return fakeTools
  },
  async updateInfoPayload() {}
}

const fakeChunkUrl =
  'https://edge.bundle/edge-currency-accountbased/zcash.chunk.js'

/**
 * Mimics the error webpack throws when a chunk's script tag fails.
 */
function makeChunkLoadError(): Error {
  const error = new Error(
    `Loading chunk 6478 failed.\n(timeout: ${fakeChunkUrl})`
  )
  return Object.assign(error, {
    name: 'ChunkLoadError',
    request: fakeChunkUrl,
    type: 'timeout'
  })
}

interface FakeCrash {
  error: unknown
  metadata: JsonObject
}

describe('makeOuterPlugin', function () {
  function makeFakePlugin(
    getInnerPlugin: () => Promise<FakeInnerPlugin>,
    log: EdgeLog = fakeLog
  ): EdgeCurrencyPlugin {
    return makeOuterPlugin<{}, EdgeCurrencyTools, {}>({
      asInfoPayload: asObject({}),
      currencyInfo: fakeCurrencyInfo,
      networkInfo: {},
      getInnerPlugin
    })({ ...fakePluginOptions, log })
  }

  function makeCrashLog(crashes: FakeCrash[]): EdgeLog {
    return Object.assign(() => undefined, fakeLog, {
      crash(error: unknown, metadata: JsonObject) {
        crashes.push({ error, metadata })
      }
    })
  }

  it('loads the inner plugin once', async function () {
    let loads = 0
    const plugin = makeFakePlugin(async () => {
      ++loads
      return fakeInnerPlugin
    })

    expect(await plugin.makeCurrencyTools()).equals(fakeTools)
    expect(await plugin.makeCurrencyTools()).equals(fakeTools)
    expect(loads).equals(1)
  })

  it('loads the inner plugin again after a failure', async function () {
    let loads = 0
    const plugin = makeFakePlugin(async () => {
      if (++loads < 2) throw new Error('Broken module')
      return fakeInnerPlugin
    })

    await expectRejection(plugin.makeCurrencyTools(), 'Error: Broken module')
    expect(await plugin.makeCurrencyTools()).equals(fakeTools)
    expect(loads).equals(2)
  })

  it('reports a chunk load failure', async function () {
    const crashes: FakeCrash[] = []
    const chunkLoadError = makeChunkLoadError()
    const plugin = makeFakePlugin(async () => {
      throw chunkLoadError
    }, makeCrashLog(crashes))

    await expectRejection(
      plugin.makeCurrencyTools(),
      `ChunkLoadError: Loading chunk 6478 failed.\n(timeout: ${fakeChunkUrl})`
    )
    expect(crashes.length).equals(1)
    expect(crashes[0].error).equals(chunkLoadError)
    expect(crashes[0].metadata.type).equals('timeout')
    expect(crashes[0].metadata.request).equals(fakeChunkUrl)
    expect(crashes[0].metadata.startPerfMs).a('number')
  })

  it('does not report other load failures', async function () {
    const crashes: FakeCrash[] = []
    const plugin = makeFakePlugin(async () => {
      throw new Error('Broken module')
    }, makeCrashLog(crashes))

    await expectRejection(plugin.makeCurrencyTools(), 'Error: Broken module')
    expect(crashes.length).equals(0)
  })
})
