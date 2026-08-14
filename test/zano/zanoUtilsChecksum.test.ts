import { seedToMnemonic, verifySeedPhrase } from '@zano-project/zano-utils-js'
import { assert } from 'chai'

// This guards the pinned `@zano-project/zano-utils-js` build rather than our
// own code. Builds before v0.0.4-edge.2 emitted a 25-word phrase with a
// trailing space whenever the checksum landed on CHECKSUM_MAX (813) -- about
// one seed in 814 -- because `(813 << 1) | 0` addressed index 1626 of a
// 1626-word dictionary. Zano core clamps that case to zero. Downgrading the
// pin would silently hand users malformed backup phrases again.

// The checksum is salted with the creation-timestamp word, which only
// advances weekly, so these vectors reproduce with the clock frozen.
const FIXED_TIME = Date.UTC(2025, 0, 1)
const boundarySeeds = [
  '0000000000000000000000000000000000000000000000000000000000000af1',
  '0000000000000000000000000000000000000000000000000000000000000afa',
  '0000000000000000000000000000000000000000000000000000000000001561'
]

describe('zano-utils-js checksum clamp', () => {
  const realNow = Date.now

  beforeEach(() => {
    Date.now = () => FIXED_TIME
  })

  afterEach(() => {
    Date.now = realNow
  })

  for (const seedHex of boundarySeeds) {
    it(`generates a complete 26-word phrase for ...${seedHex.slice(
      -6
    )}`, () => {
      const mnemonic = seedToMnemonic(seedHex)

      assert.equal(mnemonic, mnemonic.trim(), 'phrase has trailing whitespace')
      assert.lengthOf(mnemonic.split(/\s+/), 26)
    })
  }

  it('verifies the phrases it generates at the boundary', () => {
    for (const seedHex of boundarySeeds) {
      assert.isTrue(verifySeedPhrase(seedToMnemonic(seedHex)), seedHex)
    }
  })
})
