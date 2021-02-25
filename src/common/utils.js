/**
 * Created by paul on 8/26/17.
 * @flow
 */

import { bns } from 'biggystring'
import { Buffer } from 'buffer'
import { asArray, asObject, asOptional, asString } from 'cleaners'
import { compare } from 'edge-core-js/lib/util/compare'
import {
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
 * Resolves after a specified number of promises resolve.
 * Rejects once there are enough failures that resolving isn't possible.
 */
function promiseNy(
  promises: Promise<any>[],
  n?: number = promises.length
): Promise<any[]> {
  if (n > promises.length) n = promises.length
  const out: any[] = []
  return new Promise((resolve, reject) => {
    let failed = 0
    for (const promise of promises) {
      promise.then(
        result => {
          out.push(result)
          if (out.length >= n) resolve(out)
        },
        error => {
          if (++failed + out.length >= promises.length) {
            reject(error)
          }
        }
      )
    }
  })
}

function compareAndReduce<T>(array: T[]): T {
  return array.reduce((a, b) => {
    if (compare(a, b)) {
      return b
    } else {
      throw Error('Object mismatch')
    }
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

const imageServerUrl = 'https://developer.airbitz.co/content'

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

export {
  normalizeAddress,
  addHexPrefix,
  validateObject,
  getDenomInfo,
  compareAndReduce,
  asyncWaterfall,
  snooze,
  shuffleArray,
  snoozeReject,
  getEdgeInfoServer,
  promiseNy,
  promiseAny,
  imageServerUrl
}
