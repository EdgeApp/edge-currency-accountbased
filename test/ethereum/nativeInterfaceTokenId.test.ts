import { assert } from 'chai'
import { EdgeCorePluginOptions, EdgeToken, makeFakeIo } from 'edge-core-js'
import { describe, it } from 'mocha'

import plugins from '../../src/index'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'

const fakeIo = makeFakeIo()
const opts: EdgeCorePluginOptions = {
  infoPayload: {},
  initOptions: {},
  io: fakeIo,
  log: fakeLog,
  nativeIo: {},
  pluginDisklet: fakeIo.disklet
}

const makeToken = (contractAddress: string): EdgeToken => ({
  currencyCode: 'USDC',
  denominations: [{ name: 'USDC', multiplier: '1000000' }],
  displayName: 'USD Coin',
  networkLocation: { contractAddress }
})

describe('EthereumTools.getTokenId with a native ERC-20 interface', function () {
  this.timeout(10000)

  it('rejects the native interface contract on Arc', async function () {
    const tools = await plugins.arc(opts).makeCurrencyTools()
    if (tools.getTokenId == null) throw new Error('Missing getTokenId')

    await expectRejection(
      tools.getTokenId(makeToken('0x3600000000000000000000000000000000000000')),
      'Error: ErrorInvalidContractAddress'
    )
  })

  it('still accepts other Arc contracts', async function () {
    const tools = await plugins.arc(opts).makeCurrencyTools()
    if (tools.getTokenId == null) throw new Error('Missing getTokenId')

    assert.equal(
      await tools.getTokenId(
        makeToken('0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1')
      ),
      'bef5f6d51cb62b58e6a8f77868681825c6fe21c1'
    )
  })

  it('accepts the same address on a chain without the interface', async function () {
    const tools = await plugins.ethereum(opts).makeCurrencyTools()
    if (tools.getTokenId == null) throw new Error('Missing getTokenId')

    assert.equal(
      await tools.getTokenId(
        makeToken('0x3600000000000000000000000000000000000000')
      ),
      '3600000000000000000000000000000000000000'
    )
  })
})
