/* global describe it */
const makeEthereumPlugin = require('../lib/index.js').makeEthereumPlugin
const assert = require('assert')

function fakeRandom () {

}
const plugin = makeEthereumPlugin({io: {random: fakeRandom}})

describe('parseUri', function () {
  it('address only', function () {
    const parsedUri = plugin.parseUri('0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
  })
  it('uri address', function () {
    const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
  })
  it('uri address with amount', function () {
    const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=12345.6789')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.amountSatoshi, 12345.6789)
  })
  it('uri address with unsupported param', function () {
    const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?unsupported=helloworld&amount=12345.6789')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.amountSatoshi, 12345.6789)
  })
})
