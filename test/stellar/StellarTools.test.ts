import { assert } from 'chai'
import { EdgeCurrencyTools, makeFakeIo } from 'edge-core-js'
import { describe, it } from 'mocha'

import { stellar } from '../../src/stellar/stellarInfo'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'

// The account GB3C74…347YR5 with the routing ID 1234:
const MUXED =
  'MB3C74VK2C2NMUFTBGU7XOP2EHPMCVDEVVBKXWKALXELGUSHJC346AAAAAAAAAAE2KCI2'

// The XLM token contract, plain and with the routing ID 1234:
const CONTRACT = 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA'
const MUXED_CONTRACT =
  'WAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOAAAAAAAAAAE2KHI4'

async function makeTools(): Promise<EdgeCurrencyTools> {
  const io = makeFakeIo()
  return await stellar({
    infoPayload: {},
    initOptions: {},
    io,
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: io.disklet
  }).makeCurrencyTools()
}

describe('StellarTools', function () {
  it('accepts muxed (M) addresses', async function () {
    const tools = await makeTools()
    const address = await tools.parseUri(MUXED)
    assert.strictEqual(address.publicAddress, MUXED)

    const request = await tools.parseUri(
      `web+stellar:pay?destination=${MUXED}&amount=1.5`
    )
    assert.strictEqual(request.publicAddress, MUXED)
    assert.strictEqual(request.nativeAmount, '15000000')
  })

  it('rejects contract (C and W) addresses', async function () {
    const tools = await makeTools()
    for (const address of [CONTRACT, MUXED_CONTRACT]) {
      await expectRejection(
        tools.parseUri(address),
        'Error: InvalidPublicAddressError'
      )
    }
  })
})
