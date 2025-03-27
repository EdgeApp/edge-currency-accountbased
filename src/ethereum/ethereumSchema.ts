import { add } from 'biggystring'
import {
  asArray,
  asNumber,
  asObject,
  asString,
  asUnknown,
  Cleaner
} from 'cleaners'

const asHexNumber: Cleaner<number> = raw => {
  const clean = asString(raw)
  if (/0[xX][0-9a-fA-F]+/.test(clean)) return parseInt(clean, 16)
  throw new TypeError('Expected a hex number')
}

const asHexString: Cleaner<string> = raw => {
  const clean = asString(raw)
  if (/0[xX][0-9a-fA-F]+/.test(clean)) return add(raw, '0')
  throw new TypeError('Expected a hex number')
}

export const asEtherscanGetBlockHeight = asObject({
  result: asHexNumber
})

export const asEtherscanGetAccountNonce = asObject({
  result: asHexString
})

export const asEvmGasStation = asObject({
  safeLow: asNumber,
  average: asNumber,
  fast: asNumber,
  fastest: asNumber
})

export const asEIP712TypedData = asObject({
  types: asObject(
    asArray(
      asObject({
        name: asString,
        type: asString
      })
    )
  ),
  primaryType: asString,
  domain: asUnknown,
  message: asUnknown
})
