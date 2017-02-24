/* global
describe it
*/

const { expect } = require('chai')

const dataStore = require('../dataStore-btc')
const lib = require('../abcWalletTxLib-btc')
const btc = lib.makeEngine()

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
    const expected = 4.6
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
    const expected = '1pq3iwq5p889m1u4aepUA9271Tz'
    const actual = btc.getFreshAddress()

    expect(actual).to.equal(expected)
  })

  it('should return true', () => {
    const expected = true
    const actual = btc.addGapLimitAddresses()

    expect(actual).to.equal(expected)
  })

  describe('getFreshAddress', () => {
    let usedAddress = '1ap9c9md98tymqu3aeppqw23OT1'
    let freshAddress = '1pq3iwq5p889m1u4aepUA9271Tz'

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

//   it('should set an unsigned transaction to signed', () => {
//       const expected =
// adds 64 bytes of gibberish to the abcTransaction object
//   })
})
