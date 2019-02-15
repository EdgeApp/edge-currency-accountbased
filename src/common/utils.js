/**
 * Created by paul on 8/26/17.
 * @flow
 */

import { bns } from 'biggystring'
import { BN } from 'bn.js'
import { type EdgeCurrencyInfo, type EdgeMetaToken } from 'edge-core-js'
import { validate } from 'jsonschema'
const Buffer = require('buffer/').Buffer

function normalizeAddress (address: string) {
  return address.toLowerCase().replace('0x', '')
}

function addHexPrefix (value: string) {
  if (value.indexOf('0x') === 0) {
    return value
  } else {
    return '0x' + value
  }
}

function validateObject (object: any, schema: any) {
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

export function isEmpty (map: Object) {
  for (const key in map) {
    if (map.hasOwnProperty(key)) {
      return false
    }
  }
  return true
}

export function isHex (h: string) {
  const out = /^[0-9A-F]+$/i.test(h)
  return out
}

export function toHex (num: string) {
  return bns.add(num, '0', 16)
}

export function hexToBuf (hex: string) {
  const noHexPrefix = hex.replace('0x', '')
  const noHexPrefixBN = new BN(noHexPrefix, 16)
  const array = noHexPrefixBN.toArray()
  const buf = Buffer.from(array)
  return buf
}

export function bufToHex (buf: any) {
  const signedTxBuf = Buffer.from(buf)
  const hex = '0x' + signedTxBuf.toString('hex')
  return hex
}

function getDenomInfo (
  currencyInfo: EdgeCurrencyInfo,
  denom: string,
  customTokens?: Array<EdgeMetaToken>
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

function promiseAny (promises: Array<Promise<any>>): Promise<any> {
  return new Promise((resolve: Function, reject: Function) => {
    let pending = promises.length
    for (const promise of promises) {
      promise.then(value => resolve(value), error => --pending || reject(error))
    }
  })
}

type AsyncFunction = void => Promise<any>

async function asyncWaterfall (
  asyncFuncs: Array<AsyncFunction>,
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

function getEdgeInfoServer () {
  return 'https://info1.edgesecure.co:8444'
}

export {
  normalizeAddress,
  addHexPrefix,
  validateObject,
  getDenomInfo,
  asyncWaterfall,
  snooze,
  snoozeReject,
  getEdgeInfoServer,
  promiseAny
}
