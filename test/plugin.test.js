/* global describe it */
const { EthereumPlugin } = require('../lib/abc-ethereum')
const assert = require('assert')

function fakeRandom () {

}

let plugin

describe('Plugin', function () {
  it('Get currency info', function () {
    EthereumPlugin.makePlugin({io: {random: fakeRandom}}).then((ethereumPlugin) => {
      assert.equal(ethereumPlugin.getInfo().currencyCode, 'ETH')
      plugin = ethereumPlugin
    })
  })
})

describe('parseUri', function () {
  it('address only', function () {
    const parsedUri = plugin.parseUri('0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.nativeAmount, null)
    assert.equal(parsedUri.currencyCode, null)
  })
  it('uri address', function () {
    const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.nativeAmount, null)
    assert.equal(parsedUri.currencyCode, null)
  })
  it('uri address with amount', function () {
    const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=12345.6789')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.nativeAmount, '1234567890000')
    assert.equal(parsedUri.currencyCode, 'ETH')
  })
  it('uri address with amount & label', function () {
    const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.56789&label=Johnny%20Bitcoin')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.nativeAmount, '123456789000')
    assert.equal(parsedUri.currencyCode, 'ETH')
    assert.equal(parsedUri.label, 'Johnny Bitcoin')
  })
  it('uri address with amount, label & message', function () {
    const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.56789&label=Johnny%20Bitcoin&message=Hello%20World,%20I%20miss%20you%20!')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.nativeAmount, '123456789000')
    assert.equal(parsedUri.currencyCode, 'ETH')
    assert.equal(parsedUri.label, 'Johnny Bitcoin')
    assert.equal(parsedUri.message, 'Hello World, I miss you !')
  })
  it('uri address with unsupported param', function () {
    const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?unsupported=helloworld&amount=12345.6789')
    assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    assert.equal(parsedUri.nativeAmount, '1234567890000')
    assert.equal(parsedUri.currencyCode, 'ETH')
  })
})

describe('encodeUri', function () {
  it('address only', function () {
    const encodedUri = plugin.encodeUri({publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8'})
    assert.equal(encodedUri, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
  })
  it('address & amount', function () {
    const encodedUri = plugin.encodeUri(
      {
        publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
        nativeAmount: '123456780000'
      }
    )
    assert.equal(encodedUri, 'ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.5678')
  })
  it('address, amount, and label', function () {
    const encodedUri = plugin.encodeUri(
      {
        publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
        nativeAmount: '123456780000',
        currencyCode: 'ETH',
        label: 'Johnny Bitcoin'
      }
    )
    assert.equal(encodedUri, 'ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.5678&label=Johnny%20Bitcoin')
  })
  it('address, amount, label, & message', function () {
    const encodedUri = plugin.encodeUri(
      {
        publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
        nativeAmount: '123456780000',
        currencyCode: 'ETH',
        label: 'Johnny Bitcoin',
        message: 'Hello World, I miss you !'
      }
    )
    assert.equal(encodedUri, 'ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.5678&label=Johnny%20Bitcoin&message=Hello%20World,%20I%20miss%20you%20!')
  })
  it('invalid currencyCode', function () {
    assert.throws(() => {
      plugin.encodeUri(
        {
          publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
          nativeAmount: '123456780000',
          currencyCode: 'INVALID',
          label: 'Johnny Bitcoin',
          message: 'Hello World, I miss you !'
        }
      )
    })
  })
})
