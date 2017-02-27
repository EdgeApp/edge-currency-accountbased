/* global
describe it beforeEach
*/

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
chai.use(chaiAsPromised)
const { expect } = chai
const dataStore = require('../dist/index.js').dataStore
const sim = require('../simulate-async.js')
const initOptions = {
  ABCTxLibAccess: 'this is the ABCTxLibAccess thing',
  masterPrivateKey: 'KyP8beDgjXJSvjNRSLic2xvcep9AP9n1UKwC2CwmXb3Y5sSNspyr',
  masterPublicKey: 'KyP8beDgjXJSvjNRSLic2xvcep9AP9n1UKwC2CwmXb3Y5sSNspyr',
  callbacks: {
    abcWalletTxAddressesChecked: (ABCWalletTx, progressRatio) => {
      // console.log(progressRatio)
    },
    abcWalletTxTransactionsChanged: (abcTransactions) => {
      // console.log(abcTransactions)
    },
    abcWalletTxBlockHeightChanged: (ABCWalletTx, height) => {
      // console.log(height)
    }
  }
}
let lib = require('../dist/index.js').TxLibBTC
let btc = lib.makeEngine(initOptions)

process.stdout.write('\x1Bc')

describe('BTC Library', () => {
  it('returns info about the library', () => {
    const expected = dataStore.getInfo.toString()
    const actual = lib.getInfo().toString()

    expect(actual).to.equal(expected)
  })
})

describe('BTC Engine', () => {
  describe('Token Stuff', () => {
    it('should return token status', () => {
      const expected = false
      const actual = btc.getTokenStatus()

      expect(actual).to.equal(expected)
    })

    it('should enable token status', () => {
      const expected = ['TATIANACOIN']
      btc.enableTokens({tokens: expected})
        .then(
          (actual) => { expect(actual).to.eql(expected) },
          (error) => { console.log(error) })
        .catch((error) => {
          console.log(error)
        })
    })
  })

  it('should return current balance', () => {
    const expected = 58
    const actual = btc.getBalance()

    expect(actual).to.equal(expected)
  })

  it('should return number of transactions', () => {
    const expected = 9
    const actual = btc.getNumTransactions()

    expect(actual).to.equal(expected)
  })

  it('should return list of transactions', () => {
    const expected = dataStore.transactions.length
    const actual = btc.getNumTransactions()

    expect(actual).to.equal(expected)
  })

  it('should return an unused/non-reserved addressed', () => {
    const expected = '1this_is_a_fresh_address1111111111'
    const actual = btc.getFreshAddress()

    expect(actual).to.equal(expected)
  })

  it('should return true', () => {
    const expected = true
    const actual = btc.addGapLimitAddresses()

    expect(actual).to.equal(expected)
  })

  describe('isAddressUsed', () => {
    let usedAddress = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
    let freshAddress = '1this_is_a_fresh_address1111111111'

    it('should return true for a used address', () => {
      const expected = true
      const actual = btc.isAddressUsed({address: usedAddress})

      expect(actual).to.equal(expected)
    })
    it('should return false for a fresh address', () => {
      const expected = false
      const actual = btc.isAddressUsed({address: freshAddress})

      expect(actual).to.equal(expected)
    })
  })

  it('should set an unsigned transaction to signed', () => {
    let unsignedTx = dataStore.getNewTransaction()

    expect(btc.signTx({abcTransaction: unsignedTx})).to.eventually.have.property(
      'signedTx', '1234567890123456789012345678901234567890123456789012345678901234')
  })

  describe('async testing', () => {
    it('should increase the numTransactions when a new transaction is detected', () => {
      let before = btc.getNumTransactions()
      dataStore.addNewTransaction()
      let after = btc.getNumTransactions()

      expect(after).to.equal(before + 1)
    })

    it('should update the balance when a new transaction is detected', () => {
      let newTransaction = dataStore.getTransactions()[0]
      let newAmount = newTransaction.amountSatoshi

      const before = btc.getBalance()
      dataStore.addNewTransactions([newTransaction])
      const after = btc.getBalance()

      expect(after).to.equal(before + newAmount)
    })

    it('should update the blockHeight when a new transaction is detected', () => {
      const before = btc.getBlockHeight()
      dataStore.addNewBlock()
      const after = btc.getBlockHeight()

      expect(after).to.equal(before + 1)
    })
  })
})
