import { expect } from 'chai'
import { makeFakeIo } from 'edge-core-js'
import { describe, it } from 'mocha'

import { kaspa } from '../../src/kaspa/kaspaInfo'
import { fakeLog } from '../fake/fakeLog'

describe('Kaspa Plugin', function () {
  const fakeIo = makeFakeIo()

  it('should have correct currency info', async function () {
    const plugin = await kaspa({
      io: fakeIo,
      log: fakeLog,
      nativeIo: {},
      pluginDisklet: fakeIo.disklet,
      initOptions: {},
      infoPayload: {}
    })
    const { currencyInfo } = plugin

    expect(currencyInfo.currencyCode).to.equal('KAS')
    expect(currencyInfo.pluginId).to.equal('kaspa')
    expect(currencyInfo.walletType).to.equal('wallet:kaspa')
    expect(currencyInfo.displayName).to.equal('Kaspa')
  })

  it('should have correct denominations', async function () {
    const plugin = await kaspa({
      io: fakeIo,
      log: fakeLog,
      nativeIo: {},
      pluginDisklet: fakeIo.disklet,
      initOptions: {},
      infoPayload: {}
    })
    const { currencyInfo } = plugin
    const denominations = currencyInfo.denominations

    expect(denominations).to.have.lengthOf(3)

    // Check main denomination
    const mainDenom = denominations.find(d => d.name === 'KAS')
    expect(mainDenom).to.not.be.undefined
    expect(mainDenom?.multiplier).to.equal('100000000')

    // Check smallest denomination
    const sompiDenom = denominations.find(d => d.name === 'sompi')
    expect(sompiDenom).to.not.be.undefined
    expect(sompiDenom?.multiplier).to.equal('1')
  })

  it('should have correct network configuration', async function () {
    const plugin = await kaspa({
      io: fakeIo,
      log: fakeLog,
      nativeIo: {},
      pluginDisklet: fakeIo.disklet,
      initOptions: {},
      infoPayload: {}
    })

    // Network info is part of the internal plugin environment, not directly exposed
    // Instead, test the currency info properties that reflect network configuration
    const { currencyInfo } = plugin

    expect(currencyInfo.defaultSettings).to.be.an('object')
    // Kaspa doesn't support replace by fee since it uses a DAG structure
    expect(currencyInfo.canReplaceByFee).to.equal(false)
  })

  it('should validate Kaspa addresses', async function () {
    const plugin = await kaspa({
      io: fakeIo,
      log: fakeLog,
      nativeIo: {},
      pluginDisklet: fakeIo.disklet,
      initOptions: {},
      infoPayload: {}
    })
    const { currencyInfo } = plugin

    // Test address explorer format
    const testAddress =
      'kaspa:qpamkvhgh0kzx50gwvvp5xs8ktmqutcy3dfs9dc3w7lm2rr0zs764vf0mmn7q'
    const expectedUrl = `https://explorer.kaspa.org/addresses/${testAddress}`
    expect(currencyInfo.addressExplorer.replace('%s', testAddress)).to.equal(
      expectedUrl
    )
  })

  it('should have memo support', async function () {
    const plugin = await kaspa({
      io: fakeIo,
      log: fakeLog,
      nativeIo: {},
      pluginDisklet: fakeIo.disklet,
      initOptions: {},
      infoPayload: {}
    })
    const { currencyInfo } = plugin

    expect(currencyInfo.memoOptions).to.be.an('array')
    expect(currencyInfo.memoOptions).to.have.lengthOf(1)

    const memoOption = currencyInfo.memoOptions?.[0]
    expect(memoOption?.type).to.equal('text')
    expect(memoOption?.memoName).to.equal('note')
    if (memoOption?.type === 'text') {
      expect(memoOption.maxLength).to.equal(256)
    }
  })
})
