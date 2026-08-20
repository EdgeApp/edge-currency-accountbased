import { expect } from 'chai'
import { makeFakeIo } from 'edge-core-js'
import { describe, it } from 'mocha'

import { currencyInfo } from '../../src/monero/moneroInfo'
import { MoneroTools } from '../../src/monero/MoneroTools'
import { makeCurrencyTools as makeNodeCurrencyTools } from '../../src/monero/MoneroTools.node'
import type { MoneroNetworkInfo } from '../../src/monero/moneroTypes'
import { fakeLog } from '../fake/fakeLog'

const networkInfo: MoneroNetworkInfo = {
  edgeLwsServer: 'https://lws.example',
  networkType: 'MAINNET'
}

describe('MoneroTools native IO', function () {
  it('throws when nativeIo.monero is missing', function () {
    const fakeIo = makeFakeIo()
    expect(
      () =>
        new MoneroTools({
          builtinTokens: {},
          currencyInfo,
          infoPayload: {},
          initOptions: {},
          io: fakeIo,
          log: fakeLog,
          nativeIo: {},
          networkInfo,
          pluginDisklet: fakeIo.disklet
        })
    ).to.throw('Need monero native IO')
  })
})

describe('MoneroTools.node native IO', function () {
  it('throws when nativeIo.monero and io.path are both missing', async function () {
    const fakeIo = makeFakeIo()
    try {
      await makeNodeCurrencyTools({
        builtinTokens: {},
        currencyInfo,
        infoPayload: {},
        initOptions: {},
        io: fakeIo,
        log: fakeLog,
        nativeIo: {},
        networkInfo,
        pluginDisklet: fakeIo.disklet
      })
      expect.fail('expected makeCurrencyTools to throw')
    } catch (error) {
      expect(error).to.be.an('Error')
      expect((error as Error).message).to.equal('Need monero native IO')
    }
  })
})
