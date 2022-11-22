import { byteArray2hexStr } from '@tronscan/client/src/utils/bytes'
import { decode58Check } from '@tronscan/client/src/utils/crypto'

export const base58ToHexAddress = (addressBase58: string): string => {
  const bytes = decode58Check(addressBase58)
  const hex = byteArray2hexStr(bytes)
  return hex
}
