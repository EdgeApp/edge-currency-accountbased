import { seedToMnemonic } from '@zano-project/zano-utils-js'
import { assert } from 'chai'
import { randomBytes } from 'crypto'
import { base16 } from 'rfc4648'

import {
  deriveAddressFromMnemonic,
  mnemonicMatchesKeysSeed,
  normalizeMnemonic,
  validateMnemonic
} from '../../src/zano/zanoMnemonic'

// The all-zero seed. Only the timestamp word (index 24) depends on when the
// phrase was generated, and the address depends only on the 24 seed words,
// so both this literal and the address below are stable.
const mnemonic =
  'like like like like like like like like like like like like like like like like like like like like like like like like shoulder mom'
const address =
  'ZxCErvJMYURjo2LcMJzj5SM7N1YADhuy3hZqiaqvpkBhHWWZBxyTDm1aNpd8ZRfVJVVy3FncPDrGygB4gik9jhJv36cJT4HSg'

/** Replaces the creation-timestamp word, which carries the passphrase flag. */
const withTimestampWord = (phrase: string, word: string): string => {
  const words = phrase.split(' ')
  words[24] = word
  return words.join(' ')
}

describe('normalizeMnemonic', () => {
  it('trims and collapses whitespace', () => {
    assert.equal(normalizeMnemonic(`  ${mnemonic}  `), mnemonic)
    assert.equal(normalizeMnemonic(mnemonic.replace(/ /g, '   ')), mnemonic)
    assert.equal(normalizeMnemonic(`${mnemonic} `), mnemonic)
  })

  it('leaves an already-normal phrase alone', () => {
    assert.equal(normalizeMnemonic(mnemonic), mnemonic)
  })
})

describe('deriveAddressFromMnemonic', () => {
  it('matches its golden vector', () => {
    assert.equal(deriveAddressFromMnemonic(mnemonic), address)
  })

  it('normalizes before deriving', () => {
    assert.equal(deriveAddressFromMnemonic(`  ${mnemonic}  `), address)
  })

  it('rejects a passphrase-protected phrase', () => {
    // Dictionary index >= 800 sets the "password used" flag. Deriving such a
    // phrase without its passphrase would silently produce a wrong address.
    assert.throws(
      () => deriveAddressFromMnemonic(withTimestampWord(mnemonic, 'among')),
      /requires a passphrase/
    )
  })
})

describe('mnemonicMatchesKeysSeed', () => {
  const zeroSeed = '00'.repeat(32)

  it('matches the seed its words encode', () => {
    assert.isTrue(mnemonicMatchesKeysSeed(mnemonic, zeroSeed))
  })

  it('ignores hex case and surrounding whitespace', () => {
    assert.isTrue(mnemonicMatchesKeysSeed(`  ${mnemonic}  `, '0'.repeat(64)))
    assert.isTrue(
      mnemonicMatchesKeysSeed(mnemonic, zeroSeed.toUpperCase()),
      'the plugin generates uppercase hex'
    )
  })

  it('rejects a seed the words do not encode', () => {
    assert.isFalse(mnemonicMatchesKeysSeed(mnemonic, `${'00'.repeat(31)}01`))
  })

  it('holds for freshly generated phrases', () => {
    // The property `createPrivateKey` relies on: what `seedToMnemonic`
    // encodes is what the phrase decodes back to.
    for (let i = 0; i < 64; ++i) {
      const seed = base16.stringify(randomBytes(32))
      assert.isTrue(
        mnemonicMatchesKeysSeed(seedToMnemonic(seed), seed),
        `failed for seed ${seed}`
      )
    }
  })
})

describe('validateMnemonic', () => {
  it('accepts a well-formed phrase', () => {
    assert.doesNotThrow(() => validateMnemonic(mnemonic))
  })

  it('accepts a 25-word phrase, which carries no checksum', () => {
    assert.doesNotThrow(() =>
      validateMnemonic(mnemonic.split(' ').slice(0, 25).join(' '))
    )
  })

  it('rejects the wrong word count', () => {
    assert.throws(() => validateMnemonic('like like like'))
    assert.throws(() => validateMnemonic(''))
  })

  it('rejects a word outside the dictionary', () => {
    assert.throws(() =>
      validateMnemonic(mnemonic.replace('shoulder', 'notazanoword'))
    )
  })

  it('rejects an address rather than a phrase', () => {
    assert.throws(() => validateMnemonic(address))
  })

  it('rejects a passphrase-protected phrase', () => {
    assert.throws(
      () => validateMnemonic(withTimestampWord(mnemonic, 'among')),
      /requires a passphrase/
    )
  })

  it('treats the last unflagged timestamp word as unprotected', () => {
    assert.doesNotThrow(() =>
      validateMnemonic(withTimestampWord(mnemonic, 'ugly'))
    )
  })

  it('accepts a phrase whose checksum word does not match', () => {
    // Deliberate: the native `get_seed_phrase_info` path never enforced the
    // checksum either, and scanned v2 full seeds embed whatever checksum word
    // their payload carries. This exact phrase is the fixture used by
    // `zanoTools.parseUri.test.ts`, and its checksum does not verify.
    // Rejecting it here would break an import that works today.
    assert.doesNotThrow(() =>
      validateMnemonic(
        'before bring today bleed process melody cruel devil nowhere frozen bit month fur suffocate thigh against volume effort hill worse thick shove world different just love'
      )
    )
  })
})
