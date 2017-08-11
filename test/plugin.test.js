/* global describe it */
const { EthereumPlugin } = require('../lib/indexEthereum.js')
const assert = require('assert')

const io = {
  random (size) {
    const out = []
    for (let i = 0; i < size; i++) {
      out.push(i)
    }
    return out
  }
}

function makePlugin () {
  return EthereumPlugin.makePlugin({io})
}

// function makeEngineStart () {
//   const plugin = makePlugin()
//   const walletInfoPrivate = plugin.createPrivateKey('wallet:shitcoin')
//   const publicKeys = plugin.derivePublicKey(walletInfoPrivate)
//   const keys = Object.assign({}, walletInfoPrivate.keys, publicKeys)
//   const walletInfo = walletInfoPrivate
//   walletInfo.keys = keys
//   plugin.makeEngine(walletInfo).then(engine => {
//     engine.startEngine().then(() => {
//       return engine
//     })
//   })
// }

describe('Plugin', function () {
  it('Get currency info', function () {
    makePlugin().then((plugin) => {
      assert.equal(plugin.currencyInfo.currencyCode, 'ETH')
    })
  })
})

describe('createPrivateKey', function () {
  it('Create valid key', function () {
    makePlugin().then((plugin) => {
      const privateKeys = plugin.createPrivateKey('wallet:ethereum')
      assert.equal(!privateKeys, false)
      assert.equal(typeof privateKeys.ethereumKey, 'string')
      assert.equal(privateKeys.ethereumKey, '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f')
    })
  })
})

describe('derivePublicKey', function () {
  it('Valid private key', function () {
    makePlugin().then((plugin) => {
      const walletInfoprivate = {
        type: 'ethereum',
        keys: {'ethereumKey': '389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'}
      }
      const publicKeys = plugin.derivePublicKey(walletInfoprivate)
      assert.equal(publicKeys.ethereumAddress.toLowerCase(), '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'.toLowerCase())
    })
  })

  it('Invalid private key', function () {
    makePlugin().then((plugin) => {
      assert.throws(() => {
        plugin.derivePublicKey({
          type: 'ethereum',
          keys: {'ethereumKey': '389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3'}
        })
      })
    })
  })

  it('Invalid key name', function () {
    makePlugin().then((plugin) => {
      assert.throws(() => {
        plugin.derivePublicKey({
          type: 'ethereum',
          keys: {'ethereumzKey': '389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'}
        })
      })
    })
  })

  it('Invalid wallet type', function () {
    makePlugin().then((plugin) => {
      assert.throws(() => {
        plugin.derivePublicKey({
          type: 'ethereumz',
          keys: {'ethereumKey': '389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'}
        })
      })
    })
  })
})

describe('parseUri', function () {
  it('address only', function () {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, null)
      assert.equal(parsedUri.currencyCode, null)
    })
  })
  it('uri address', function () {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, null)
      assert.equal(parsedUri.currencyCode, null)
    })
  })
  it('uri address with amount', function () {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=12345.6789')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, '12345678900000000000000')
      assert.equal(parsedUri.currencyCode, 'ETH')
    })
  })
  it('uri address with amount & label', function () {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.56789&label=Johnny%20Bitcoin')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, '1234567890000000000000')
      assert.equal(parsedUri.currencyCode, 'ETH')
      assert.equal(parsedUri.label, 'Johnny Bitcoin')
    })
  })
  it('uri address with amount, label & message', function () {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.56789&label=Johnny%20Bitcoin&message=Hello%20World,%20I%20miss%20you%20!')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, '1234567890000000000000')
      assert.equal(parsedUri.currencyCode, 'ETH')
      assert.equal(parsedUri.label, 'Johnny Bitcoin')
      assert.equal(parsedUri.message, 'Hello World, I miss you !')
    })
  })
  it('uri address with unsupported param', function () {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?unsupported=helloworld&amount=12345.6789')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, '12345678900000000000000')
      assert.equal(parsedUri.currencyCode, 'ETH')
    })
  })
})

describe('encodeUri', function () {
  it('address only', function () {
    makePlugin().then((plugin) => {
      const encodedUri = plugin.encodeUri({publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8'})
      assert.equal(encodedUri, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
    })
  })
  it('address & amount', function () {
    makePlugin().then((plugin) => {
      const encodedUri = plugin.encodeUri(
        {
          publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
          nativeAmount: '1234567800000000000000'
        }
      )
      assert.equal(encodedUri, 'ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.5678')
    })
  })
  it('address, amount, and label', function () {
    makePlugin().then((plugin) => {
      const encodedUri = plugin.encodeUri(
        {
          publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
          nativeAmount: '1234567800000000000000',
          currencyCode: 'ETH',
          label: 'Johnny Bitcoin'
        }
      )
      assert.equal(encodedUri, 'ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.5678&label=Johnny%20Bitcoin')
    })
  })
  it('address, amount, label, & message', function () {
    makePlugin().then((plugin) => {
      const encodedUri = plugin.encodeUri(
        {
          publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
          nativeAmount: '1234567800000000000000',
          currencyCode: 'ETH',
          label: 'Johnny Bitcoin',
          message: 'Hello World, I miss you !'
        }
      )
      assert.equal(encodedUri, 'ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.5678&label=Johnny%20Bitcoin&message=Hello%20World,%20I%20miss%20you%20!')
    })
  })
  it('invalid currencyCode', function () {
    makePlugin().then((plugin) => {
      assert.throws(() => {
        plugin.encodeUri(
          {
            publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
            nativeAmount: '1234567800000000000000',
            currencyCode: 'INVALID',
            label: 'Johnny Bitcoin',
            message: 'Hello World, I miss you !'
          }
        )
      })
    })
  })
})
