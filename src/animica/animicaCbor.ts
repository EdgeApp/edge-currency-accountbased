import { concatBytes, utf8ToBytes } from '@noble/hashes/utils.js'

/**
 * Canonical CBOR for Animica transactions.
 *
 * The node decodes transactions with a strict canonical decoder
 * (RFC 8949 §4.2.1), so the wallet has to produce byte-exact output:
 *
 * - integers use the shortest encoding that fits,
 * - every string, array and map has a definite length,
 * - map keys are sorted by the bytes of their encoded form, which means a
 *   shorter key always sorts before a longer one,
 * - no floats, tags, booleans or null; the transaction format never uses them.
 *
 * Only the major types the transaction format needs are implemented. The
 * LEB128 `uvarint` and length-prefix helpers used by the signing wrapper live
 * here as well, since they are the other half of the wire format.
 */

const MAJOR_UINT = 0
const MAJOR_BYTES = 2
const MAJOR_TEXT = 3
const MAJOR_ARRAY = 4
const MAJOR_MAP = 5

const MAX_UINT64 = BigInt('0xffffffffffffffff')

export interface CborObject {
  [key: string]: CborValue
}

/**
 * Map keys can be text or unsigned integers. Plain objects only allow text
 * keys, so integer-keyed maps (the signing preimage) use a `Map`.
 */
export type CborValue =
  | number
  | bigint
  | string
  | Uint8Array
  | CborValue[]
  | CborObject
  | Map<number | string, CborValue>

export function encodeCanonicalCbor(value: CborValue): Uint8Array {
  const out: number[] = []
  encodeValue(out, value)
  return Uint8Array.from(out)
}

/**
 * LEB128 unsigned varint: 7 bits per byte, least-significant group first,
 * high bit set on every byte except the last.
 */
export function encodeUvarint(value: number | bigint): Uint8Array {
  const low7 = BigInt(0x7f)
  const seven = BigInt(7)
  let v = toUint(value)
  const out: number[] = []
  while (v > low7) {
    out.push(Number(v & low7) | 0x80)
    v >>= seven
  }
  out.push(Number(v))
  return Uint8Array.from(out)
}

/** `uvarint(len(bytes)) || bytes` */
export function lengthPrefixed(bytes: Uint8Array): Uint8Array {
  return concatBytes(encodeUvarint(bytes.length), bytes)
}

function toUint(value: number | bigint): bigint {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(
        `CBOR: expected an unsigned safe integer, got ${value}`
      )
    }
    return BigInt(value)
  }
  if (value < BigInt(0) || value > MAX_UINT64) {
    throw new TypeError(`CBOR: integer out of uint64 range: ${value}`)
  }
  return value
}

/** Writes the initial byte plus the shortest argument that holds `value`. */
function encodeHead(out: number[], major: number, value: bigint): void {
  const high = major << 5
  if (value < BigInt(24)) {
    out.push(high | Number(value))
    return
  }
  const width =
    value <= BigInt(0xff)
      ? 1
      : value <= BigInt(0xffff)
      ? 2
      : value <= BigInt(0xffffffff)
      ? 4
      : 8
  out.push(high | (24 + Math.log2(width)))
  for (let i = width - 1; i >= 0; --i) {
    out.push(Number((value >> BigInt(8 * i)) & BigInt(0xff)))
  }
}

function pushBytes(out: number[], bytes: Uint8Array): void {
  for (const byte of bytes) out.push(byte)
}

function encodeValue(out: number[], value: CborValue): void {
  if (typeof value === 'number' || typeof value === 'bigint') {
    encodeHead(out, MAJOR_UINT, toUint(value))
  } else if (typeof value === 'string') {
    const utf8 = utf8ToBytes(value)
    encodeHead(out, MAJOR_TEXT, BigInt(utf8.length))
    pushBytes(out, utf8)
  } else if (value instanceof Uint8Array) {
    encodeHead(out, MAJOR_BYTES, BigInt(value.length))
    pushBytes(out, value)
  } else if (Array.isArray(value)) {
    encodeHead(out, MAJOR_ARRAY, BigInt(value.length))
    for (const item of value) encodeValue(out, item)
  } else if (value instanceof Map) {
    encodeMap(out, [...value.entries()])
  } else {
    encodeMap(
      out,
      Object.keys(value).map(key => [key, value[key]])
    )
  }
}

function encodeMap(
  out: number[],
  entries: Array<[number | string, CborValue]>
): void {
  const encoded = entries.map(([key, value]) => {
    const keyBytes: number[] = []
    encodeValue(keyBytes, key)
    const valueBytes: number[] = []
    encodeValue(valueBytes, value)
    return { keyBytes, valueBytes }
  })
  encoded.sort((a, b) => compareBytes(a.keyBytes, b.keyBytes))
  for (let i = 1; i < encoded.length; ++i) {
    if (compareBytes(encoded[i - 1].keyBytes, encoded[i].keyBytes) === 0) {
      throw new TypeError('CBOR: duplicate map key')
    }
  }

  encodeHead(out, MAJOR_MAP, BigInt(encoded.length))
  for (const { keyBytes, valueBytes } of encoded) {
    for (const byte of keyBytes) out.push(byte)
    for (const byte of valueBytes) out.push(byte)
  }
}

/** Byte-wise lexicographic order, shorter prefix first. */
function compareBytes(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; ++i) {
    if (a[i] !== b[i]) return a[i] - b[i]
  }
  return a.length - b.length
}
