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

interface EvmGasStation {
  safeLow: number
  average: number
  fast: number
  fastest: number
}
export const asEvmGasStation = (
  pluginId: string,
  raw: unknown
): EvmGasStation => {
  switch (pluginId) {
    case 'polygon': {
      const polygonFees = asPolygonGasStation(raw)
      return {
        safeLow: polygonFees.safeLow.maxFee,
        average: polygonFees.standard.maxFee,
        fast: polygonFees.fast.maxFee,
        fastest: polygonFees.fast.maxFee * 1.25
      }
    }
    default: {
      return asEthereumGasStation(raw)
    }
  }
}

const asEthereumGasStation = asObject({
  safeLow: asNumber,
  average: asNumber,
  fast: asNumber,
  fastest: asNumber
})

const asPolygonGasStation = asObject({
  safeLow: asObject({ maxPriorityFee: asNumber, maxFee: asNumber }),
  standard: asObject({ maxPriorityFee: asNumber, maxFee: asNumber }),
  fast: asObject({ maxPriorityFee: asNumber, maxFee: asNumber })
  // estimatedBaseFee: asNumber,
  // blockTime: asNumber,
  // blockNumber: asNumber
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
