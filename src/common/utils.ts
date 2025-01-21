import { add, mul } from 'biggystring'
import { Buffer } from 'buffer'
import { asArray, asObject, asOptional, asString } from 'cleaners'
import {
  EdgeCurrencyInfo,
  EdgeDenomination,
  EdgeFetchFunction,
  EdgeIo,
  EdgeMetaToken,
  EdgeTokenMap,
  EdgeTransaction,
  JsonObject
} from 'edge-core-js/types'
import { ethers } from 'ethers'
import { base16 } from 'rfc4648'

import { asyncWaterfall } from './promiseUtils'

export function normalizeAddress(address: string): string {
  return address.toLowerCase().replace('0x', '')
}

export function shuffleArray<T>(array: T[]): T[] {
  let currentIndex = array.length
  let temporaryValue, randomIndex

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex -= 1

    // And swap it with the current element.
    temporaryValue = array[currentIndex]
    array[currentIndex] = array[randomIndex]
    array[randomIndex] = temporaryValue
  }

  return array
}

export function isEmpty(map: Object): boolean {
  return Object.keys(map).length !== 0
}

export function isHex(h: string): boolean {
  const out = /^[0-9A-F]+$/i.test(removeHexPrefix(h))
  return out
}

export function toHex(num: string): string {
  return add(num, '0', 16)
}

export function hexToBuf(hex: string): Buffer {
  const noHexPrefix = hex.replace('0x', '')
  const buf = Buffer.from(noHexPrefix, 'hex')
  return buf
}

export function padHex(hex: string, bytes: number): string {
  if (2 * bytes - hex.length > 0) {
    return hex.padStart(2 * bytes, '0')
  }
  return hex
}

export function removeHexPrefix(value: string): string {
  if (value.indexOf('0x') === 0) {
    return value.substring(2)
  } else {
    return value
  }
}

export function hexToDecimal(num: string): string {
  const safeNum = num.toLowerCase()
  const hexNum = safeNum.startsWith('0x') ? safeNum : `0x${safeNum}`
  return add(hexNum, '0', 10)
}

export function decimalToHex(num: string): string {
  return add(num, '0', 16)
}

export function uint8ArrayToHex(bytes: Uint8Array): string {
  return '0x' + base16.stringify(bytes).toLowerCase()
}

export function bufToHex(buf: Buffer): string {
  const signedTxBuf = Buffer.from(buf)
  const hex = '0x' + signedTxBuf.toString('hex')
  return hex
}

export function getLegacyDenomination(
  name: string,
  currencyInfo: EdgeCurrencyInfo,
  legacyTokens: EdgeMetaToken[],
  builtinTokens: EdgeTokenMap
): EdgeDenomination | undefined {
  // Look in the primary currency info:
  for (const denomination of currencyInfo.denominations) {
    if (denomination.name === name) return denomination
  }

  // Look in the custom tokens:
  for (const metaToken of legacyTokens) {
    for (const denomination of metaToken.denominations) {
      if (denomination.name === name) return denomination
    }
  }

  // Look in the builtin tokens:
  for (const token of Object.values(builtinTokens)) {
    for (const denomination of token.denominations) {
      if (denomination.name === name) return denomination
    }
  }
}

export function getDenomination(
  name: string,
  currencyInfo: EdgeCurrencyInfo,
  allTokens: EdgeTokenMap
): EdgeDenomination | undefined {
  // Look in the primary currency info:
  for (const denomination of currencyInfo.denominations) {
    if (denomination.name === name) return denomination
  }

  // Look in the merged tokens:
  for (const tokenId of Object.keys(allTokens)) {
    const token = allTokens[tokenId]
    for (const denomination of token.denominations) {
      if (denomination.name === name) return denomination
    }
  }
}

export const snoozeReject: Function = async (ms: number) =>
  await new Promise((resolve: Function, reject: Function) =>
    setTimeout(reject, ms)
  )
export const snooze: Function = async (ms: number) =>
  await new Promise((resolve: Function) => setTimeout(resolve, ms))

export function pickRandom<T>(list: T[], count: number): T[] {
  if (list.length <= count) return list

  // Algorithm from https://stackoverflow.com/a/48089/1836596
  const out = []
  for (let i = 0; i < list.length && out.length < count; ++i) {
    const probability = (count - out.length) / (list.length - i)
    if (Math.random() <= probability) out.push(list[i])
  }
  return out
}

export function pickRandomOne<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)]
}

/**
 * Safely read `otherParams` from a transaction, throwing if it's missing.
 */
export function getOtherParams<T extends JsonObject>(tx: EdgeTransaction): T {
  const otherParams: any = tx.otherParams
  if (otherParams == null) {
    throw new TypeError('Transaction is missing otherParams')
  }
  return otherParams
}

export type Mutex = <T>(callback: () => Promise<T>) => Promise<T>
/**
 * Constructs a mutex.
 *
 * The mutex is a function that accepts & runs a callback,
 * ensuring that only one callback runs at a time. Use it like:
 *
 * const result = await mutex(() => {
 *   // Critical code that must not run more than one copy.
 *   return result
 * })
 */
export function makeMutex(): Mutex {
  let busy = false
  const queue: Array<() => void> = []
  return async function lock<T>(callback: () => T | Promise<T>): Promise<T> {
    if (busy) await new Promise(resolve => queue.push(() => resolve(undefined)))
    try {
      busy = true
      return await callback()
    } finally {
      busy = false
      const resolve = queue.shift()
      if (resolve != null) resolve()
    }
  }
}

const asCleanTxLogs = asObject({
  txid: asString,
  spendTargets: asOptional(
    asArray(
      asObject({
        currencyCode: asString,
        nativeAmount: asString,
        publicAddress: asString,
        uniqueIdentifier: asOptional(asString)
      })
    )
  ),
  signedTx: asString,
  otherParams: asOptional(
    asObject({
      gas: asOptional(asString),
      gasPrice: asOptional(asString),
      nonceUsed: asOptional(asString)
    })
  )
})

export function cleanTxLogs(tx: EdgeTransaction): string {
  return JSON.stringify(asCleanTxLogs(tx), null, 2)
}

// Convert number strings in scientific notation to decimal notation using biggystring
export function biggyScience(num: string): string {
  const [factor, exponent] = num.split('e')

  // exit early if the number is not in scientific notation
  if (exponent == null) return num

  return mul(factor, '1' + '0'.repeat(parseInt(exponent))).toString()
}

/**
 * Emulates the browser Fetch API more accurately than fetch JSON.
 */
export function getFetchCors(io: EdgeIo): EdgeFetchFunction {
  return io.fetchCors ?? io.fetch
}

export function safeErrorMessage(e?: Error): string {
  let sāfError = ''
  if (e != null) {
    if (e.name != null) sāfError += `${e.name} `
    if (e.message != null) sāfError += e.message
  }
  return sāfError
}

/**
 * Merges several JSON objects deeply,
 * preferring the items from later objects.
 */
export function mergeDeeply(...objects: any[]): any {
  const out: any = {}

  for (const o of objects) {
    if (o == null) continue

    for (const key of Object.keys(o)) {
      if (o[key] === undefined) continue

      const isObject =
        out[key] != null && typeof o[key] === 'object' && !Array.isArray(o[key])
      out[key] = isObject ? mergeDeeply(out[key], o[key]) : o[key]
    }
  }

  return out
}

export function biggyRoundToNearestInt(float: string): string {
  const [int, dec] = float.split('.')
  if (dec == null) return int
  if (parseInt(dec[0]) >= 5) return add(int, '1')
  return int
}

export const prettyPrintObject = (obj: any): void =>
  console.log(JSON.stringify(obj, null, 2))

/**
 * Compares two JSON-like objects, returning false if they differ.
 */
export function matchJson(a: any, b: any): boolean {
  // Use simple equality, unless a and b are proper objects:
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    a == null ||
    b == null
  ) {
    return a === b
  }

  // These must either be both arrays or both objects:
  const aIsArray = Array.isArray(a)
  const bIsArray = Array.isArray(b)
  if (aIsArray !== bIsArray) return false

  // Compare arrays in order:
  if (aIsArray) {
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; ++i) {
      if (!matchJson(a[i], b[i])) return false
    }
    return true
  }

  // These are both regular objects, so grab the keys,
  // ignoring entries where the value is `undefined`:
  const aKeys = Object.getOwnPropertyNames(a).filter(
    key => a[key] !== undefined
  )
  const bKeys = Object.getOwnPropertyNames(b).filter(
    key => b[key] !== undefined
  )
  if (aKeys.length !== bKeys.length) return false

  // We know that both objects have the same number of properties,
  // so if every property in `a` has a matching property in `b`,
  // the objects must be identical, regardless of key order.
  for (const key of aKeys) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false
    if (!matchJson(a[key], b[key])) return false
  }
  return true
}

// Checks that all keys in obj1 exist in obj2 and have the same values
export const objectCheckOneWay = (obj1: any, obj2: any): boolean => {
  for (const key of Object.keys(obj1)) {
    if (typeof obj1[key] === 'object') {
      if (typeof obj2[key] !== 'object') {
        return false
      }
      const result = objectCheckOneWay(obj1[key], obj2[key])
      if (!result) {
        return false
      }
      continue
    }
    if (obj1[key] !== obj2[key]) {
      return false
    }
  }
  return true
}

/**
 * Calls `func` on ethers JsonRpcProviders initialized with configured
 * RPC servers. Randomizes order priority to distribute load.
 */
export const multicastEthProviders = async <
  R,
  P extends ethers.providers.Provider
>(props: {
  func: (ethProvider: P) => Promise<R>
  providers: P[]
}): Promise<R> => {
  const { func, providers } = props
  const funcs: Array<() => Promise<any>> = providers.map(
    provider => async () => {
      return await func(provider)
    }
  )
  return await asyncWaterfall(shuffleArray(funcs))
}

/**
 * Cache expensive function results
 */
export function cache<T>(
  func: () => Promise<T>,
  validMs: number
): () => Promise<T> {
  let dateUpdated: number | undefined
  let cachedValue: T

  return async () => {
    if (dateUpdated == null || Date.now() - dateUpdated > validMs) {
      cachedValue = await func()
      dateUpdated = Date.now()
    }
    return cachedValue
  }
}
