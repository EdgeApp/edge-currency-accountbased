import { add, mul } from 'biggystring'
import { Buffer } from 'buffer'
import { asArray, asObject, asOptional, asString } from 'cleaners'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo,
  EdgeDenomination,
  EdgeFetchFunction,
  EdgeMetaToken,
  EdgeTokenMap,
  EdgeTransaction,
  JsonObject
} from 'edge-core-js/types'

import { getTokenIdFromCurrencyCode } from './tokenHelpers'

function normalizeAddress(address: string): string {
  return address.toLowerCase().replace('0x', '')
}

function shuffleArray<T>(array: T[]): T[] {
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

export function bufToHex(buf: Buffer): string {
  const signedTxBuf = Buffer.from(buf)
  const hex = '0x' + signedTxBuf.toString('hex')
  return hex
}

function getDenomInfo(
  currencyInfo: EdgeCurrencyInfo,
  denom: string,
  customTokens?: EdgeMetaToken[],
  allTokensMap?: EdgeTokenMap
): EdgeDenomination | undefined {
  // Look in the primary currency denoms
  let edgeDenomination = currencyInfo.denominations.find(element => {
    return element.name === denom
  })

  // Look in the allTokensMap
  if (allTokensMap != null) {
    const tokenId = getTokenIdFromCurrencyCode(denom, allTokensMap)
    if (tokenId != null) {
      edgeDenomination = allTokensMap[tokenId].denominations.find(
        d => d.name === denom
      )
    }
  }

  // Look in the currencyInfo tokens
  if (edgeDenomination == null) {
    for (const metaToken of currencyInfo.metaTokens) {
      edgeDenomination = metaToken.denominations.find(element => {
        return element.name === denom
      })
      if (edgeDenomination != null) {
        break
      }
    }
  }

  // Look in custom tokens
  if (edgeDenomination == null && customTokens != null) {
    for (const metaToken of customTokens) {
      edgeDenomination = metaToken.denominations.find(element => {
        return element.name === denom
      })
      if (edgeDenomination != null) {
        break
      }
    }
  }
  return edgeDenomination
}

const snoozeReject: Function = async (ms: number) =>
  await new Promise((resolve: Function, reject: Function) =>
    setTimeout(reject, ms)
  )
const snooze: Function = async (ms: number) =>
  await new Promise((resolve: Function) => setTimeout(resolve, ms))

async function promiseAny(promises: Array<Promise<any>>): Promise<any> {
  return await new Promise((resolve: Function, reject: Function) => {
    let pending = promises.length
    for (const promise of promises) {
      promise.then(
        value => {
          resolve(value)
        },
        error => {
          if (--pending === 0) reject(error)
        }
      )
    }
  })
}

/**
 * Waits for the promises to resolve and uses a provided checkResult function
 * to return a key to identify the result. The returned promise resolves when
 * n number of promises resolve to identical keys.
 */
async function promiseNy<T>(
  promises: Array<Promise<T>>,
  checkResult: (arg: T) => string | undefined,
  n: number = promises.length
): Promise<T> {
  const map: { [key: string]: number } = {}
  return await new Promise((resolve, reject) => {
    let resolved = 0
    let failed = 0
    let done = false
    for (const promise of promises) {
      promise.then(
        result => {
          const key = checkResult(result)
          if (key !== undefined) {
            resolved++
            if (map[key] !== undefined) {
              map[key]++
            } else {
              map[key] = 1
            }
            if (!done && map[key] >= n) {
              done = true
              resolve(result)
            }
          } else if (++failed + resolved === promises.length) {
            reject(Error(`Could not resolve ${n} promises`))
          }
        },
        error => {
          if (++failed + resolved === promises.length) {
            reject(error)
          }
        }
      )
    }
  })
}

/**
 * If the promise doesn't resolve in the given time,
 * reject it with the provided error, or a generic error if none is provided.
 */
async function timeout<T>(
  promise: Promise<T>,
  ms: number,
  error: Error = new Error(`Timeout of ${ms}ms exceeded`)
): Promise<T> {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(error), ms)
    promise.then(
      ok => {
        resolve(ok)
        clearTimeout(timer)
      },
      error => {
        reject(error)
        clearTimeout(timer)
      }
    )
  })
}

type AsyncFunction = () => Promise<any>

async function asyncWaterfall(
  asyncFuncs: AsyncFunction[],
  timeoutMs: number = 5000
): Promise<any> {
  let pending = asyncFuncs.length
  const promises: Array<Promise<any>> = []
  for (const func of asyncFuncs) {
    const index = promises.length
    promises.push(
      func().catch(e => {
        e.index = index
        throw e
      })
    )
    if (pending > 1) {
      promises.push(
        new Promise(resolve => {
          snooze(timeoutMs).then(() => {
            resolve('async_waterfall_timed_out')
          })
        })
      )
    }
    try {
      const result = await Promise.race(promises)
      if (result === 'async_waterfall_timed_out') {
        const p = promises.pop()
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        p?.then().catch()
        --pending
      } else {
        return result
      }
    } catch (e: any) {
      const i = e.index
      promises.splice(i, 1)
      const p = promises.pop()
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      p?.then().catch()
      --pending
      if (pending === 0) {
        throw e
      }
    }
  }
}

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

function getEdgeInfoServer(): string {
  return 'https://info1.edgesecure.co:8444'
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

type Mutex = <T>(callback: () => Promise<T>) => Promise<T>
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
function getFetchCors(opts: EdgeCorePluginOptions): EdgeFetchFunction {
  return opts.io.fetchCors ?? opts.io.fetch
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
 * Merges several Javascript objects deeply,
 * preferring the items from later objects.
 */
export function mergeDeeply(...objects: any[]): any {
  const out: any = {}

  for (const o of objects) {
    if (o == null) continue

    for (const key of Object.keys(o)) {
      if (o[key] == null) continue

      out[key] =
        out[key] != null && typeof o[key] === 'object'
          ? mergeDeeply(out[key], o[key])
          : o[key]
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

export {
  normalizeAddress,
  getDenomInfo,
  asyncWaterfall,
  snooze,
  shuffleArray,
  snoozeReject,
  getEdgeInfoServer,
  promiseAny,
  getFetchCors,
  promiseNy,
  timeout
}
