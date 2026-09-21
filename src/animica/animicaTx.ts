import { sha3_256, sha3_512 } from '@noble/hashes/sha3.js'
import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js'
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js'

import {
  CborObject,
  CborValue,
  encodeCanonicalCbor,
  encodeUvarint,
  lengthPrefixed
} from './animicaCbor'
import { AnimicaKeypair, ML_DSA_65_ALG_ID } from './animicaCrypto'

/**
 * Animica transaction bodies, signing and encoding.
 *
 * Everything here must match the node byte for byte. The reference is the
 * wallet extension in the Animica repository (apps/wallet-extension/src/tx/
 * signing.ts), which this file mirrors:
 *
 *   body           = v2 transfer map (see `makeTransferBody`)
 *   preimage       = CBOR({1: "animica.tx.v1", 2: chainId, 3: genesisHash,
 *                          4: "unknown", 5: "tx", 6: 2, 7: body})
 *   sign_bytes_raw = lp("animica:sign/v1") || lp("tx") || lp(uvarint(chainId))
 *                    || lp(uvarint(forkId)) || lp(uvarint(algId)) || lp("")
 *                    || lp(preimage)
 *   sign_hash      = SHA3-512(sign_bytes_raw)
 *   sig            = ML-DSA-65.Sign(sk, sign_hash, ctx = "")
 *   envelope       = CBOR({tx: body, sigs: [{alg, pubkey, sig}]})
 *   txid           = SHA3-256(envelope)
 *
 * Key 4 of the preimage is the literal string "unknown": mainnet's chain
 * identity carries no network name, and the node hashes exactly that.
 */

const SIGN_TAG = 'animica:sign/v1'
const SIGN_MESSAGE_TYPE = 'tx'
const TX_SIGN_DOMAIN = 'animica.tx.v1'
const TX_BODY_VERSION = 2
const TRANSFER_PAYLOAD_TYPE = 0

export interface AnimicaChainParams {
  chainId: number
  genesisHash: Uint8Array
  forkId: number
}

/** A nonce-less (v2) native transfer. Amounts are in nANM. */
export interface AnimicaTransfer {
  chainId: number
  /** Sender account digest (the address payload minus its alg_id). */
  from: Uint8Array
  /** Recipient account digest. */
  to: Uint8Array
  amount: bigint
  data: Uint8Array
  gasPrice: bigint
  gasLimit: bigint
  /** Inclusive block-height window during which the transaction is valid. */
  validAfter: number
  validUntil: number
  /** Random bytes that make the txid unique; replay protection is txid uniqueness. */
  salt: Uint8Array
}

export function makeTransferBody(tx: AnimicaTransfer): CborObject {
  return {
    v: TX_BODY_VERSION,
    chainId: tx.chainId,
    from: tx.from,
    gas: { price: tx.gasPrice, limit: tx.gasLimit },
    payload: {
      t: TRANSFER_PAYLOAD_TYPE,
      v: { to: tx.to, amount: tx.amount, data: tx.data }
    },
    accessList: [],
    validAfter: tx.validAfter,
    validUntil: tx.validUntil,
    salt: tx.salt
  }
}

export function makeSigningPreimage(
  body: CborObject,
  chain: AnimicaChainParams
): Uint8Array {
  const preimage = new Map<number | string, CborValue>([
    [1, TX_SIGN_DOMAIN],
    [2, chain.chainId],
    [3, chain.genesisHash],
    [4, 'unknown'],
    [5, SIGN_MESSAGE_TYPE],
    [6, TX_BODY_VERSION],
    [7, body]
  ])
  return encodeCanonicalCbor(preimage)
}

export function makeSignBytes(
  preimage: Uint8Array,
  chain: AnimicaChainParams,
  algId: number = ML_DSA_65_ALG_ID
): Uint8Array {
  return concatBytes(
    lengthPrefixed(utf8ToBytes(SIGN_TAG)),
    lengthPrefixed(utf8ToBytes(SIGN_MESSAGE_TYPE)),
    lengthPrefixed(encodeUvarint(chain.chainId)),
    lengthPrefixed(encodeUvarint(chain.forkId)),
    lengthPrefixed(encodeUvarint(algId)),
    lengthPrefixed(new Uint8Array(0)),
    lengthPrefixed(preimage)
  )
}

/** The 64-byte digest that ML-DSA-65 actually signs. */
export function makeSignHash(
  body: CborObject,
  chain: AnimicaChainParams
): Uint8Array {
  return sha3_512(makeSignBytes(makeSigningPreimage(body, chain), chain))
}

export function encodeEnvelope(
  body: CborObject,
  publicKey: Uint8Array,
  signature: Uint8Array
): Uint8Array {
  return encodeCanonicalCbor({
    tx: body,
    sigs: [{ alg: ML_DSA_65_ALG_ID, pubkey: publicKey, sig: signature }]
  })
}

export function txidFromEnvelope(envelope: Uint8Array): Uint8Array {
  return sha3_256(envelope)
}

export interface AnimicaSignedTx {
  envelope: Uint8Array
  txid: Uint8Array
}

/**
 * Signs a transfer. `extraEntropy` (32 bytes) selects FIPS 204 hedged
 * signing; without it the signature is deterministic. Both verify.
 */
export function signTransfer(
  tx: AnimicaTransfer,
  chain: AnimicaChainParams,
  keypair: AnimicaKeypair,
  extraEntropy?: Uint8Array
): AnimicaSignedTx {
  const body = makeTransferBody(tx)
  const signHash = makeSignHash(body, chain)
  const signature = ml_dsa65.sign(
    signHash,
    keypair.secretKey,
    extraEntropy == null ? undefined : { extraEntropy }
  )
  const envelope = encodeEnvelope(body, keypair.publicKey, signature)
  return { envelope, txid: txidFromEnvelope(envelope) }
}
