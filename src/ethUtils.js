/**
 * Created by paul on 8/26/17.
 */

import { BN } from 'bn.js'
import { bns } from 'biggystring'
import { validate } from 'jsonschema'
const Buffer = require('buffer/').Buffer

function snooze (ms:number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function normalizeAddress (address:string) {
  return address.toLowerCase().replace('0x', '')
}

function addHexPrefix (value:string) {
  if (value.startsWith('0x')) {
    return value
  } else {
    return '0x' + value
  }
}

function validateObject (object, schema) {
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

function bufToHex (buf:any) {
  const signedTxBuf = Buffer.from(buf)
  const hex = '0x' + signedTxBuf.toString('hex')
  return hex
}

function hexToBuf (hex:string) {
  const noHexPrefix = hex.replace('0x', '')
  const noHexPrefixBN = new BN(noHexPrefix, 16)
  const array = noHexPrefixBN.toArray()
  const buf = Buffer.from(array)
  return buf
}

function toHex (num:string) {
  return bns.add(num, '0', 16)
}

function toDecimal (num:string) {
  return bns.add(num, '0')
}

export { snooze, normalizeAddress, addHexPrefix, toDecimal, hexToBuf, bufToHex, validateObject, toHex }
