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
  currencyCode: 'TEST',
  denominations: [{ name: 'TEST', multiplier: '100000000' }],
  displayName: 'Test Token',
  networkLocation: { contractAddress }
})

// Each Cosmos plugin with its native denom:
const nativeDenoms: Array<[keyof typeof plugins, string]> = [
  ['axelar', 'uaxl'],
  ['coreum', 'ucore'],
  ['cosmoshub', 'uatom'],
  ['mayachain', 'cacao'],
  ['nym', 'unym'],
  ['osmosis', 'uosmo'],
  ['thorchainrune', 'rune'],
  ['thorchainrunestagenet', 'rune']
]

describe('CosmosTools.getTokenId with the native denom', function () {
  this.timeout(30000)

  for (const [pluginId, nativeDenom] of nativeDenoms) {
    it(`rejects ${nativeDenom} on ${pluginId}`, async function () {
      const tools = await plugins[pluginId](opts).makeCurrencyTools()
      if (tools.getTokenId == null) throw new Error('Missing getTokenId')

      await expectRejection(
        tools.getTokenId(makeToken(nativeDenom)),
        'Error: ErrorInvalidContractAddress'
      )
      // The engine matches balances to denoms without regard to case:
      await expectRejection(
        tools.getTokenId(makeToken(nativeDenom.toUpperCase())),
        'Error: ErrorInvalidContractAddress'
      )
    })
  }

  it('still accepts other denoms', async function () {
    const tools = await plugins.thorchainrune(opts).makeCurrencyTools()
    if (tools.getTokenId == null) throw new Error('Missing getTokenId')

    assert.equal(await tools.getTokenId(makeToken('x/ruji')), 'xruji')
    assert.equal(await tools.getTokenId(makeToken('runes')), 'runes')
  })

  it("accepts another chain's native denom", async function () {
    const tools = await plugins.osmosis(opts).makeCurrencyTools()
    if (tools.getTokenId == null) throw new Error('Missing getTokenId')

    assert.equal(await tools.getTokenId(makeToken('rune')), 'rune')
  })
})
