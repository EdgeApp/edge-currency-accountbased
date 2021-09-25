/**
 * Created by paul on 8/26/17.
 * @flow
 */

import { bns } from 'biggystring'
import { Buffer } from 'buffer'
import { asArray, asObject, asOptional, asString } from 'cleaners'
import {
  type EdgeCorePluginOptions,
  type EdgeCurrencyInfo,
  type EdgeMetaToken,
  type EdgeTransaction,
  type JsonObject
} from 'edge-core-js/types'
import { validate } from 'jsonschema'

function normalizeAddress(address: string) {
  return address.toLowerCase().replace('0x', '')
}

function addHexPrefix(value: string) {
  if (value.indexOf('0x') === 0) {
    return value
  } else {
    return '0x' + value
  }
}

function shuffleArray(array: any[]) {
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
function validateObject(object: any, schema: any) {
  const result = validate(object, schema)

  if (result.errors.length === 0) {
    return true
  } else {
    for (const n in result.errors) {
      const errMsg = result.errors[n].message
      console.log('ERROR: validateObject:' + errMsg)
    }
    return false
  }
}

export function isEmpty(map: Object) {
  return Object.keys(map).length !== 0
}

export function isHex(h: string) {
  const out = /^[0-9A-F]+$/i.test(h)
  return out
}

export function toHex(num: string) {
  return bns.add(num, '0', 16)
}

export function hexToBuf(hex: string) {
  const noHexPrefix = hex.replace('0x', '')
  const buf = Buffer.from(noHexPrefix, 'hex')
  return buf
}

export function padHex(hex: string, bytes: number) {
  if (2 * bytes - hex.length > 0) {
    return hex.padStart(2 * bytes, '0')
  }
  return hex
}

export function removeHexPrefix(value: string) {
  if (value.indexOf('0x') === 0) {
    return value.substring(2)
  } else {
    return value
  }
}

export function hexToDecimal(num: string) {
  return bns.add(num, '0', 10)
}

export function decimalToHex(num: string) {
  return bns.add(num, '0', 16)
}

export function bufToHex(buf: any) {
  const signedTxBuf = Buffer.from(buf)
  const hex = '0x' + signedTxBuf.toString('hex')
  return hex
}

function getDenomInfo(
  currencyInfo: EdgeCurrencyInfo,
  denom: string,
  customTokens?: EdgeMetaToken[]
) {
  // Look in the primary currency denoms
  let edgeDenomination = currencyInfo.denominations.find(element => {
    return element.name === denom
  })

  // Look in the currencyInfo tokens
  if (!edgeDenomination) {
    for (const metaToken of currencyInfo.metaTokens) {
      edgeDenomination = metaToken.denominations.find(element => {
        return element.name === denom
      })
      if (edgeDenomination) {
        break
      }
    }
  }

  // Look in custom tokens
  if (!edgeDenomination && customTokens) {
    for (const metaToken of customTokens) {
      edgeDenomination = metaToken.denominations.find(element => {
        return element.name === denom
      })
      if (edgeDenomination) {
        break
      }
    }
  }
  return edgeDenomination
}

const snoozeReject: Function = (ms: number) =>
  new Promise((resolve: Function, reject: Function) => setTimeout(reject, ms))
const snooze: Function = (ms: number) =>
  new Promise((resolve: Function) => setTimeout(resolve, ms))

function promiseAny(promises: Promise<any>[]): Promise<any> {
  return new Promise((resolve: Function, reject: Function) => {
    let pending = promises.length
    for (const promise of promises) {
      promise.then(
        value => {
          resolve(value)
        },
        error => {
          return --pending || reject(error)
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
  promises: Promise<T>[],
  checkResult: T => string | void,
  n?: number = promises.length
): Promise<T> {
  const map: { [key: string]: number } = {}
  return new Promise((resolve, reject) => {
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
            reject(Error('Could not resolve n promises'))
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
function timeout<T>(
  promise: Promise<T>,
  ms: number,
  error: Error = new Error(`Timeout of ${ms}ms exceeded`)
): Promise<T> {
  return new Promise((resolve, reject) => {
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

type AsyncFunction = void => Promise<any>

async function asyncWaterfall(
  asyncFuncs: AsyncFunction[],
  timeoutMs: number = 5000
): Promise<any> {
  let pending = asyncFuncs.length
  const promises: Promise<any>[] = []
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
        promises.pop()
        --pending
      } else {
        return result
      }
    } catch (e) {
      const i = e.index
      promises.splice(i, 1)
      promises.pop()
      --pending
      if (!pending) {
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

function getEdgeInfoServer() {
  return 'https://info1.edgesecure.co:8444'
}

/**
 * Safely read `otherParams` from a transaction, throwing if it's missing.
 */
export function getOtherParams(tx: EdgeTransaction): JsonObject {
  if (tx.otherParams == null) {
    throw new TypeError('Transaction is missing otherParams')
  }
  return tx.otherParams
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
    if (busy) await new Promise(resolve => queue.push(resolve))
    try {
      busy = true
      return callback()
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

export function cleanTxLogs(tx: EdgeTransaction) {
  return JSON.stringify(asCleanTxLogs(tx), null, 2)
}

// Convert number strings in scientific notation to decimal notation using biggystring
export function biggyScience(num: string): string {
  const [factor, exponent] = num.split('e')

  // exit early if the number is not in scientific notation
  if (exponent == null) return num

  return bns.mul(factor, '1' + '0'.repeat(parseInt(exponent))).toString()
}

/**
 * Emulates the browser Fetch API more accurately than fetch JSON.
 */
function getFetchCors(opts: EdgeCorePluginOptions): Function {
  const nativeIo = opts.nativeIo['edge-currency-accountbased']
  if (nativeIo == null) return opts.io.fetch

  return function fetch(uri: string, opts?: Object) {
    return nativeIo.fetchText(uri, opts).then(reply => ({
      ok: reply.ok,
      status: reply.status,
      statusText: reply.statusText,
      url: reply.url,
      json() {
        return Promise.resolve().then(() => JSON.parse(reply.text))
      },
      text() {
        return Promise.resolve(reply.text)
      }
    }))
  }
}

export function safeErrorMessage(e?: Error): string {
  let sāfError = ''
  if (e != null) {
    if (e.name != null) sāfError += `${e.name} `
    if (e.message != null) sāfError += e.message
  }
  return sāfError
}

export {
  normalizeAddress,
  addHexPrefix,
  validateObject,
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
