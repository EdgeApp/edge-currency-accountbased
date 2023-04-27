import abi from 'ethereumjs-abi'
import { base16 } from 'rfc4648'
import TronWeb from 'tronweb'

import { hexToDecimal } from '../common/utils'

const {
  utils: {
    crypto: { decode58Check, getBase58CheckAddress }
  }
} = TronWeb

export const base58ToHexAddress = (addressBase58: string): string => {
  const bytes = decode58Check(addressBase58)
  const hex = base16.stringify(bytes)
  return hex
}

export const hexToBase58Address = (addressHex: string): string => {
  const bytes = base16.parse(addressHex)
  const addressBase58 = getBase58CheckAddress(Array.from(bytes))
  return addressBase58
}

// Return TRC20 transfer parameters. Not currently used.
// decodeTRC20Transfer isn't used currently
const trc20TransferFunction = 'a9059cbb'
export const decodeTRC20Transfer = (
  data: string
): [string, string] | undefined => {
  if (!data.startsWith(trc20TransferFunction))
    throw new Error('Not a TRC20 data payload')
  const payload = data.replace(trc20TransferFunction, '')

  // Tron addresses are 20 bytes and prefixed with 41
  const addressHex = `41${payload.substring(24, 64)}`
  const addressBase58 = hexToBase58Address(addressHex)

  const amountHex = payload.substring(64, 128)
  const amount = hexToDecimal(amountHex)

  return [addressBase58, amount]
}

// Create TRC20 data payload
export const encodeTRC20Transfer = (
  toAddress: string,
  nativeAmount: string
): string => {
  const receivingAddressHex = base58ToHexAddress(toAddress).replace(
    /^(41)/,
    '0x'
  )
  const dataArray = abi.simpleEncode(
    'transfer(address,uint256):(uint256)',
    receivingAddressHex,
    parseInt(nativeAmount)
  )
  return Buffer.from(dataArray).toString('hex')
}
