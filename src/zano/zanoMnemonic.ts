import {
  getAccountBySecretSpendKey,
  getMasterAddress,
  isSeedPhrasePasswordProtected,
  mnemonicToSeed,
  verifySeedPhrase
} from '@zano-project/zano-utils-js'

/**
 * The canonical form of a seed phrase, used everywhere one is stored,
 * compared, or hashed.
 *
 * Imported phrases arrive with whatever spacing the user or the scanner
 * produced, and the wallet-file password is derived from the phrase, so an
 * unnormalized phrase would derive a different password for the same wallet.
 */
export function normalizeMnemonic(mnemonic: string): string {
  return mnemonic.trim().replace(/\s+/g, ' ')
}

/**
 * Derives the Zano master address from a seed phrase, without calling into
 * the native library.
 *
 * Only valid for phrases that carry no seed passphrase. The pure-JS library
 * cannot decrypt a protected seed, and Zano core asserts that the phrase's
 * "password used" flag matches the password supplied to it, so a protected
 * phrase decoded without its passphrase yields the wrong address rather than
 * an error.
 */
export function deriveAddressFromMnemonic(mnemonic: string): string {
  const normalized = normalizeMnemonic(mnemonic)
  validateMnemonic(normalized)

  const { publicSpendKey, publicViewKey } = getAccountBySecretSpendKey(
    mnemonicToSeed(normalized)
  )
  return getMasterAddress(publicSpendKey, publicViewKey)
}

/** Length of a keys seed in hex characters. */
const KEYS_SEED_HEX_LENGTH = 64

/**
 * Reports whether a phrase decodes back to the keys seed it was built from.
 *
 * Used to self-check phrases this plugin generates. A phrase we hand the user
 * is their only backup, so it is worth proving that the words carry the
 * entropy we meant to encode rather than trusting the encoder.
 */
export function mnemonicMatchesKeysSeed(
  mnemonic: string,
  keysSeedHex: string
): boolean {
  // The `full` form is the keys seed followed by the timestamp and checksum
  // words, so compare just the seed itself:
  const decoded = mnemonicToSeed(normalizeMnemonic(mnemonic), true).slice(
    0,
    KEYS_SEED_HEX_LENGTH
  )
  return decoded.toLowerCase() === keysSeedHex.toLowerCase()
}

/**
 * Reports whether a phrase's checksum word matches its seed words.
 *
 * Used to self-check phrases this plugin generates, where a mismatch means a
 * bug on our side. It is deliberately not applied to phrases the user
 * supplies -- see `validateMnemonic`.
 */
export function verifyMnemonicChecksum(mnemonic: string): boolean {
  return verifySeedPhrase(normalizeMnemonic(mnemonic))
}

/**
 * Validates a seed phrase offline, throwing if it is unusable without the
 * native library.
 *
 * Checks the word count, that every word is in the Zano dictionary, and that
 * the phrase is not passphrase-protected.
 */
export function validateMnemonic(mnemonic: string): void {
  const normalized = normalizeMnemonic(mnemonic)

  // Throws on a bad word count or a word outside the dictionary:
  if (isSeedPhrasePasswordProtected(normalized)) {
    throw new Error('Zano seed phrase requires a passphrase')
  }

  // This validates every remaining word against the dictionary, throwing if
  // any is unknown. Its return value -- whether the checksum word matches --
  // is deliberately ignored. Zano core skips checksum verification for
  // 25-word phrases and the native `get_seed_phrase_info` path never
  // enforced it, so rejecting here would turn imports that work today into
  // failures, notably for scanned v2 full seeds that carry an arbitrary
  // checksum word. Generation self-checks the checksum instead, where a
  // mismatch means our own bug rather than the user's input.
  verifySeedPhrase(normalized)
}
