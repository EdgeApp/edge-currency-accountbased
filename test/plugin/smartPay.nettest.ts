import { assert } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyPlugin,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'
import fetch from 'node-fetch'

import { objectCheckOneWay } from '../../src/common/utils'
import edgeCorePlugins from '../../src/index'
import { fakeLog } from '../fake/fakeLog'

const smartPayPublicAddress = 'TUmgPbM5J6om7Z2PJjzrbSEbXit84ZhVCj'

type SmartPayTestFixture = Array<{
  WALLET_TYPE: string
  pluginId: keyof typeof edgeCorePlugins
  currencyCode: string
  uri: string
  parsedUri: any
}>

const fixtures: SmartPayTestFixture = [
  {
    WALLET_TYPE: 'wallet:tron',
    pluginId: 'tron',
    currencyCode: 'TRON',
    uri: '00020126360014BR.GOV.BCB.PIX0114+5548988356069520400005303986540511.115802BR5925Francisco Rocelo Bezerra 6009SAO PAULO61080540900062070503***630464C2',
    parsedUri: {
      currencyCode: 'USDT',
      metadata: {
        name: 'Francisco Rocelo Bezerra ',
        notes: `To PIX: +5548988356069`
      },
      publicAddress: smartPayPublicAddress,
      uniqueIdentifier:
        '00020126360014BR.GOV.BCB.PIX0114+5548988356069520400005303986540511.115802BR5925Francisco Rocelo Bezerra 6009SAO PAULO61080540900062070503***630464C2'
    }
  },
  {
    WALLET_TYPE: 'wallet:tron',
    pluginId: 'tron',
    currencyCode: 'TRON',
    uri: 'rocelo@smartpay.com.vc',
    parsedUri: {
      currencyCode: 'USDT',
      metadata: {
        name: 'PIX: rocelo@smartpay.com.vc',
        notes: `To PIX: rocelo@smartpay.com.vc`
      },
      publicAddress: smartPayPublicAddress,
      uniqueIdentifier: 'rocelo@smartpay.com.vc'
    }
  },
  {
    WALLET_TYPE: 'wallet:tron',
    pluginId: 'tron',
    currencyCode: 'TRON',
    uri: '+55 48 98835 6069',
    parsedUri: {
      currencyCode: 'USDT',
      metadata: {
        name: 'PIX: +5548988356069',
        notes: `To PIX: +5548988356069`
      },
      publicAddress: smartPayPublicAddress,
      uniqueIdentifier: '+5548988356069'
    }
  },
  {
    WALLET_TYPE: 'wallet:tron',
    pluginId: 'tron',
    currencyCode: 'TRON',
    uri: '1700830b-fbc5-4bd1-b714-ee83b3b0da26',
    parsedUri: {
      currencyCode: 'USDT',
      metadata: {
        name: 'PIX: 1700830b-fbc5-4bd1-b714-ee83b3b0da26',
        notes: `To PIX: 1700830b-fbc5-4bd1-b714-ee83b3b0da26`
      },
      publicAddress: smartPayPublicAddress,
      uniqueIdentifier: '1700830b-fbc5-4bd1-b714-ee83b3b0da26'
    }
  }
]

const fakeIo = makeFakeIo()
const opts: EdgeCorePluginOptions = {
  infoPayload: {},
  initOptions: { smartPayPublicAddress },
  io: {
    ...fakeIo,
    fetch,
    fetchCors: fetch,
    random: size => new Uint8Array(32)
  },
  log: fakeLog,
  nativeIo: {},
  pluginDisklet: fakeIo.disklet
}

describe('SmartPay PIX parseUri', () => {
  for (const fixture of fixtures) {
    const WALLET_TYPE = fixture.WALLET_TYPE

    const factory = edgeCorePlugins[fixture.pluginId]
    const plugin: EdgeCurrencyPlugin = factory(opts)

    it(`SmartPay PIX parseUri for ${WALLET_TYPE}. Key ${fixture.uri}`, async () => {
      const tools = await plugin.makeCurrencyTools()
      const parsedUri = await tools.parseUri(fixture.uri)
      assert.isTrue(objectCheckOneWay(fixture.parsedUri, parsedUri))
    }).timeout(10000)
  }
})
