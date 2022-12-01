import { Client } from '@tronscan/client'
import { hexStr2byteArray } from '@tronscan/client/src/lib/code'
import { byteArray2hexStr } from '@tronscan/client/src/utils/bytes'
import {
  decode58Check,
  getBase58CheckAddress
} from '@tronscan/client/src/utils/crypto'
import abi from 'ethereumjs-abi'

import { hexToDecimal } from '../common/utils'
import { ReferenceBlock } from './tronTypes'

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

// Tronscan Client wants to grab network info itself when using addRef() so we need
// to override getLatestBlock() and provide the info we're already querying from public nodes

export class TronScan extends Client {
  recentBlock: ReferenceBlock

  constructor(recentBlockRef: ReferenceBlock) {
    super('')
    this.recentBlock = recentBlockRef
  }

  getLatestBlock(): ReferenceBlock {
    return this.recentBlock
  }

  // Need to add a fee limit to trc20 transactions
  async addRef(preTx: any, feeLimit?: number): Promise<any> {
    const tx = await super.addRef(preTx)
    if (feeLimit != null) {
      const rawData = tx.getRawData()
      rawData.setFeeLimit(feeLimit)
      tx.setRawData(rawData)
    }
    return tx
  }
}
