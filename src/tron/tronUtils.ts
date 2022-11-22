import { hexStr2byteArray } from '@tronscan/client/src/lib/code'
import { byteArray2hexStr } from '@tronscan/client/src/utils/bytes'
import {
  decode58Check,
  getBase58CheckAddress
} from '@tronscan/client/src/utils/crypto'

export const base58ToHexAddress = (addressBase58: string): string => {
  const bytes = decode58Check(addressBase58)
  const hex = byteArray2hexStr(bytes)
  return hex
}

export const hexToBase58Address = (addressHex: string): string => {
  const bytes = hexStr2byteArray(addressHex)
  const addressBase58 = getBase58CheckAddress(bytes)
  return addressBase58
}
