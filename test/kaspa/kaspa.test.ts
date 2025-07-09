import { expect } from 'chai'
import { describe, it } from 'mocha'

import { kaspa } from '../../src/kaspa/kaspaInfo'

describe('Kaspa Plugin', function () {
  it('should have correct currency info', function () {
    const { currencyInfo } = kaspa
    
    expect(currencyInfo.currencyCode).to.equal('KAS')
    expect(currencyInfo.pluginId).to.equal('kaspa')
    expect(currencyInfo.walletType).to.equal('wallet:kaspa')
    expect(currencyInfo.displayName).to.equal('Kaspa')
  })

  it('should have correct denominations', function () {
    const { currencyInfo } = kaspa
    const denominations = currencyInfo.denominations
    
    expect(denominations).to.have.lengthOf(3)
    
    // Check main denomination
    const mainDenom = denominations.find(d => d.name === 'KAS')
    expect(mainDenom).to.exist
    expect(mainDenom?.multiplier).to.equal('100000000')
    
    // Check sompi denomination
    const sompiDenom = denominations.find(d => d.name === 'sompi')
    expect(sompiDenom).to.exist
    expect(sompiDenom?.multiplier).to.equal('1')
  })

  it('should have correct network info', function () {
    const { networkInfo } = kaspa
    
    expect(networkInfo.rpcServers).to.be.an('array')
    expect(networkInfo.rpcServers.length).to.be.greaterThan(0)
    
    expect(networkInfo.kaspaApiServers).to.be.an('array')
    expect(networkInfo.kaspaApiServers.length).to.be.greaterThan(0)
    
    expect(networkInfo.networkId).to.equal('kaspa-mainnet')
    expect(networkInfo.blocksPerSecond).to.equal(10)
  })

  it('should have correct address explorer', function () {
    const { currencyInfo } = kaspa
    const testAddress = 'kaspa:qr0e3thqy8ztqntkax3yk4nkwec9u6lh5al23hx8mxvfj8mfnykg7gf4u4kqa'
    const expectedUrl = `https://explorer.kaspa.org/addresses/${testAddress}`
    
    expect(currencyInfo.addressExplorer.replace('%s', testAddress)).to.equal(expectedUrl)
  })

  it('should have correct transaction explorer', function () {
    const { currencyInfo } = kaspa
    const testTxid = '1234567890abcdef'
    const expectedUrl = `https://explorer.kaspa.org/txs/${testTxid}`
    
    expect(currencyInfo.transactionExplorer.replace('%s', testTxid)).to.equal(expectedUrl)
  })
})