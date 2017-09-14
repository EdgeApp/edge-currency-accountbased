/* global describe it */
const { EthereumCurrencyPluginFactory } = require('../lib/indexEthereum.js')
const { calcMiningFee } = require('../lib/indexEthereum.js')
// const { AbcSpendInfo, EthereumFees } = require('airbitz-core-js')

const assert = require('assert')

const io = {
  random (size) {
    const out = []
    for (let i = 0; i < size; i++) {
      const rand = (((i + 23) * 38239875) / (i + 481)) % 255
      out.push(rand)
    }
    return out
  },
  console: {
    info: console.log,
    warn: console.log,
    error: console.log
  }
}

function makePlugin () {
  return EthereumCurrencyPluginFactory.makePlugin({io})
}

// function makeEngine () {
//   return new Promise((resolve, reject) => {
//     makePlugin().then((plugin) => {
//       const type = 'wallet:ethereum'
//       const keys = plugin.createPrivateKey(type)
//       const walletInfo = {
//         type,
//         keys
//       }
//       const publicKeys = plugin.derivePublicKey(walletInfo)
//       const keys2 = Object.assign({}, walletInfo.keys, publicKeys)
//       walletInfo.keys = keys2
//       plugin.makeEngine(walletInfo).then(engine => {
//         resolve(engine)
//       })
//     }).catch(error => {
//       reject(error)
//     })
//   })
// }

describe('Plugin', function () {
  it('Get currency info', function (done) {
    makePlugin().then((plugin) => {
      assert.equal(plugin.currencyInfo.currencyCode, 'ETH')
      done()
    })
  })
})

describe('createPrivateKey', function () {
  it('Create valid key', function (done) {
    makePlugin().then((plugin) => {
      const privateKeys = plugin.createPrivateKey('wallet:ethereum')
      assert.equal(!privateKeys, false)
      assert.equal(typeof privateKeys.ethereumKey, 'string')
      assert.equal(privateKeys.ethereumKey, 'a7e6eab74dafdeddae52cb1b444727e3810062a9d7ededd9b27b34de7d119b1f')
      done()
    })
  })
})

describe('derivePublicKey', function () {
  it('Valid private key', function (done) {
    makePlugin().then((plugin) => {
      const walletInfoprivate = {
        type: 'ethereum',
        keys: {'ethereumKey': '389b07b3466eed587d6bdae09a3613611de9add2635432d6cd1521af7bbc3757'}
      }
      const publicKeys = plugin.derivePublicKey(walletInfoprivate)
      assert.equal(publicKeys.ethereumAddress.toLowerCase(), '0x9fa817e5A48DD1adcA7BEc59aa6E3B1F5C4BeA9a'.toLowerCase())
      done()
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
  it('address only', function (done) {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, null)
      assert.equal(parsedUri.currencyCode, null)
      done()
    })
  })
  it('uri address', function (done) {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, null)
      assert.equal(parsedUri.currencyCode, null)
      done()
    })
  })
  it('uri address with amount', function (done) {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=12345.6789')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, '12345678900000000000000')
      assert.equal(parsedUri.currencyCode, 'ETH')
      done()
    })
  })
  it('uri address with amount & label', function (done) {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.56789&label=Johnny%20Bitcoin')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, '1234567890000000000000')
      assert.equal(parsedUri.currencyCode, 'ETH')
      assert.equal(parsedUri.metadata.name, 'Johnny Bitcoin')
      done()
    })
  })
  it('uri address with amount, label & message', function (done) {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.56789&label=Johnny%20Bitcoin&message=Hello%20World,%20I%20miss%20you%20!')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, '1234567890000000000000')
      assert.equal(parsedUri.currencyCode, 'ETH')
      assert.equal(parsedUri.metadata.name, 'Johnny Bitcoin')
      assert.equal(parsedUri.metadata.message, 'Hello World, I miss you !')
      done()
    })
  })
  it('uri address with unsupported param', function (done) {
    makePlugin().then((plugin) => {
      const parsedUri = plugin.parseUri('ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?unsupported=helloworld&amount=12345.6789')
      assert.equal(parsedUri.publicAddress, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      assert.equal(parsedUri.nativeAmount, '12345678900000000000000')
      assert.equal(parsedUri.currencyCode, 'ETH')
      done()
    })
  })
})

describe('encodeUri', function () {
  it('address only', function (done) {
    makePlugin().then((plugin) => {
      const encodedUri = plugin.encodeUri({publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8'})
      assert.equal(encodedUri, '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8')
      done()
    })
  })
  it('address & amount', function (done) {
    makePlugin().then((plugin) => {
      const encodedUri = plugin.encodeUri(
        {
          publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
          nativeAmount: '1234567800000000000000'
        }
      )
      assert.equal(encodedUri, 'ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.5678')
      done()
    })
  })
  it('address, amount, and label', function (done) {
    makePlugin().then((plugin) => {
      const encodedUri = plugin.encodeUri(
        {
          publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
          nativeAmount: '1234567800000000000000',
          currencyCode: 'ETH',
          metadata: {
            name: 'Johnny Bitcoin'
          }
        }
      )
      assert.equal(encodedUri, 'ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.5678&label=Johnny%20Bitcoin')
      done()
    })
  })
  it('address, amount, label, & message', function (done) {
    makePlugin().then((plugin) => {
      const encodedUri = plugin.encodeUri(
        {
          publicAddress: '0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8',
          nativeAmount: '1234567800000000000000',
          currencyCode: 'ETH',
          metadata: {
            name: 'Johnny Bitcoin',
            message: 'Hello World, I miss you !'
          }
        }
      )
      assert.equal(encodedUri, 'ethereum:0xEA674fdDe714fd979de3EdF0F56AA9716B898ec8?amount=1234.5678&label=Johnny%20Bitcoin&message=Hello%20World,%20I%20miss%20you%20!')
      done()
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
            name: 'Johnny Bitcoin',
            message: 'Hello World, I miss you !'
          }
        )
      })
    })
  })
})

const networkFees = {
  default: {
    gasLimit: {
      regularTransaction: '21001',
      tokenTransaction: '37123'
    },
    gasPrice: {
      lowFee: '1000000001',
      standardFeeLow: '40000000001',
      standardFeeHigh: '300000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001'
    }
  },
  '1983987abc9837fbabc0982347ad828': {
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    },
    gasPrice: {
      lowFee: '1000000002',
      standardFeeLow: '40000000002',
      standardFeeHigh: '300000000002',
      standardFeeLowAmount: '200000000000000000',
      standardFeeHighAmount: '20000000000000000000',
      highFee: '40000000002'
    }
  },
  '2983987abc9837fbabc0982347ad828': {
    gasLimit: {
      regularTransaction: '21002',
      tokenTransaction: '37124'
    }
  }
}

const networkFees2 = {
  default: {
    gasLimit: {
      regularTransaction: '21001',
      tokenTransaction: '37123'
    },
    gasPrice: {
      lowFee: '5',
      standardFeeLow: '10',
      standardFeeHigh: '1000',
      standardFeeLowAmount: '10000',
      standardFeeHighAmount: '100000',
      highFee: '200000'
    }
  }
}
describe('Mining Fees', function () {
  it('ETH standard high', function () {
    const spendInfo = {
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '10000000000000000001'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees)
    assert.equal(gasPrice, '300000000001')
    assert.equal(gasLimit, '21001')
  })
  it('ETH standard low', function () {
    const spendInfo = {
      currencyCode: 'ETH',
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '50000000000000000'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees)
    assert.equal(gasPrice, '40000000001')
    assert.equal(gasLimit, '21001')
  })
  it('ETH standard mid', function () {
    const spendInfo = {
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '15000'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees2)
    assert.equal(gasPrice, '65')
    assert.equal(gasLimit, '21001')
  })
  it('ETH low', function () {
    const spendInfo = {
      networkFeeOption: 'low',
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '3000000000000000000'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees)
    assert.equal(gasPrice, '1000000001')
    assert.equal(gasLimit, '21001')
  })
  it('ETH high', function () {
    const spendInfo = {
      networkFeeOption: 'high',
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '3000000000000000000'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees)
    assert.equal(gasPrice, '40000000001')
    assert.equal(gasLimit, '21001')
  })
  it('Token standard high', function () {
    const spendInfo = {
      currencyCode: 'WINGS',
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '100000000000000000010'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees)
    assert.equal(gasPrice, '300000000001')
    assert.equal(gasLimit, '37123')
  })
  it('Token standard low', function () {
    const spendInfo = {
      currencyCode: 'WINGS',
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '500000000000000000'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees)
    assert.equal(gasPrice, '40000000001')
    assert.equal(gasLimit, '37123')
  })
  it('Token standard mid', function () {
    const spendInfo = {
      currencyCode: 'REP',
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '150000'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees2)
    assert.equal(gasPrice, '65')
    assert.equal(gasLimit, '37123')
  })
  it('Token low', function () {
    const spendInfo = {
      currencyCode: 'REP',
      networkFeeOption: 'low',
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '3000000000000000000'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees)
    assert.equal(gasPrice, '1000000001')
    assert.equal(gasLimit, '37123')
  })
  it('Token high', function () {
    const spendInfo = {
      currencyCode: 'REP',
      networkFeeOption: 'high',
      spendTargets: [
        {
          publicAddress: '2000987abc9837fbabc0982347ad828',
          nativeAmount: '3000000000000000000'
        }
      ]
    }
    const { gasPrice, gasLimit } = calcMiningFee(spendInfo, networkFees)
    assert.equal(gasPrice, '40000000001')
    assert.equal(gasLimit, '37123')
  })
})

// describe('Engine', function () {
//   it('startEngine exists', function () {
//     makeEngine().then(engine => {
//       assert.equal(typeof engine.startEngine, 'function')
//     })
//   })
//   it('Make spend', function () {
//     makeEngine().then(engine => {
//       assert.equal(typeof engine.killEngine, 'function')
//     })
//   })
// })
