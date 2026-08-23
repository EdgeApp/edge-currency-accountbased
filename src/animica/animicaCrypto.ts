import { sha3_256 } from '@noble/hashes/sha3.js'
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js'
import { bech32m } from '@scure/base'
import { mnemonicToSeed } from 'bip39'
import { derivePath } from 'ed25519-hd-key'
import { base16 } from 'rfc4648'

/**
 * Animica keys and addresses.
 *
 * Accounts are ML-DSA-65 (FIPS 204) keypairs. Key generation is a pure
 * function of a 32-byte seed ξ, so the seed is the only secret the wallet
 * needs to keep; the 4032-byte secret key is regenerated when signing.
 *
 * HD derivation (docs/wallet/HD_DERIVATION.md in the Animica repository):
 *
 *   1. BIP-39 mnemonic → 64-byte seed.
 *   2. SLIP-0010 ed25519-style hardened derivation (HMAC-SHA512, the same
 *      scheme Solana and Stellar use in this repository) along
 *      m / 44' / 4279885' / account' / 0' / index'.
 *   3. The 32-byte private-key half of the final node is ξ.
 *
 * The address commits to the public key's hash:
 *
 *   bech32m("anim", u16be(alg_id) || SHA3-256(pubkey))
 *
 * where alg_id 0x1003 is ML-DSA-65. Contract addresses use alg_id 0x0000.
 */

export const ANIMICA_HRP = 'anim'
export const ML_DSA_65_ALG_ID = 0x1003

/** SLIP-0044 coin type: 0x414e4d, ASCII "ANM". */
export const ANIMICA_COIN_TYPE = 4279885

/** ML-DSA-65 seed length (FIPS 204 ξ). */
export const ANIMICA_SEED_LENGTH = 32

const CONTRACT_ALG_ID = 0x0000
const ACCOUNT_ALG_ID_MIN = 0x1000
const ACCOUNT_ALG_ID_MAX = 0x1fff
const ADDRESS_PAYLOAD_LENGTH = 34
const BECH32_LENGTH_LIMIT = 90

export interface AnimicaKeypair {
  publicKey: Uint8Array
  secretKey: Uint8Array
}

export interface AnimicaAddress {
  algId: number
  /** SHA3-256 of the public key: what transaction bodies carry as `from`/`to`. */
  digest: Uint8Array
}

export function animicaDerivationPath(account = 0, index = 0): string {
  return `m/44'/${ANIMICA_COIN_TYPE}'/${account}'/0'/${index}'`
}

/** BIP-39 mnemonic → ML-DSA-65 seed ξ for the given account. */
export async function seedFromMnemonic(
  mnemonic: string,
  account = 0,
  index = 0
): Promise<Uint8Array> {
  const bip39Seed = await mnemonicToSeed(mnemonic)
  const { key } = derivePath(
    animicaDerivationPath(account, index),
    base16.stringify(bip39Seed)
  )
  return Uint8Array.from(key)
}

export function keypairFromSeed(seed: Uint8Array): AnimicaKeypair {
  if (seed.length !== ANIMICA_SEED_LENGTH) {
    throw new Error(
      `Animica seed must be ${ANIMICA_SEED_LENGTH} bytes, got ${seed.length}`
    )
  }
  return ml_dsa65.keygen(seed)
}

export function addressFromPublicKey(publicKey: Uint8Array): string {
  const payload = new Uint8Array(ADDRESS_PAYLOAD_LENGTH)
  payload[0] = (ML_DSA_65_ALG_ID >> 8) & 0xff
  payload[1] = ML_DSA_65_ALG_ID & 0xff
  payload.set(sha3_256(publicKey), 2)
  return bech32m.encode(
    ANIMICA_HRP,
    bech32m.toWords(payload),
    BECH32_LENGTH_LIMIT
  )
}

/**
 * Validates an address and returns its parts. Accepts any alg_id the chain
 * accepts as a transaction `to`: contracts (0x0000) and the whole account
 * range (0x1000-0x1fff), not just ML-DSA-65, so legacy-scheme recipients stay
 * payable.
 */
export function decodeAddress(address: string): AnimicaAddress {
  const { prefix, bytes } = bech32m.decodeToBytes(address)
  if (prefix !== ANIMICA_HRP) {
    throw new Error(`Animica address must start with "${ANIMICA_HRP}1"`)
  }
  if (bytes.length !== ADDRESS_PAYLOAD_LENGTH) {
    throw new Error(
      `Animica address payload must be ${ADDRESS_PAYLOAD_LENGTH} bytes, got ${bytes.length}`
    )
  }
  const algId = (bytes[0] << 8) | bytes[1]
  const isAccount = algId >= ACCOUNT_ALG_ID_MIN && algId <= ACCOUNT_ALG_ID_MAX
  if (algId !== CONTRACT_ALG_ID && !isAccount) {
    throw new Error(`Unsupported Animica address algorithm id: ${algId}`)
  }
  return { algId, digest: bytes.slice(2) }
}

export function isValidAddress(address: string): boolean {
  try {
    decodeAddress(address)
    return true
  } catch (e) {
    return false
  }
}
