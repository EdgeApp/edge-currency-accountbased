import { Address, Cell } from '@ton/ton'
import { asArray, asNumber, asObject, asString } from 'cleaners'
import { EdgeIo } from 'edge-core-js/types'
import { base64 } from 'rfc4648'

// ---------------------------------------------------------------------------
// Low-level dRPC / Toncenter HTTP helper
// ---------------------------------------------------------------------------

export async function fetchDrpc(
  io: EdgeIo,
  baseUrl: string,
  path: string,
  body?: object
): Promise<unknown> {
  const url = `${baseUrl}${path}`
  const opts =
    body != null
      ? {
          method: 'POST' as const,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }
      : { method: 'GET' as const }

  const res = await io.fetch(url, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`dRPC ${path}: ${res.status} ${text}`)
  }
  const json: any = await res.json()
  if (json?.ok === false) {
    throw new Error(`dRPC ${path}: ${String(json.error ?? 'request failed')}`)
  }
  return json
}

// ---------------------------------------------------------------------------
// Response cleaners
// ---------------------------------------------------------------------------

const asPassthrough = (raw: unknown): unknown => raw

export const asDrpcAddressInfo = asObject({
  // ok: asBoolean,
  result: asObject({
    // @type: asString,
    balance: asString,
    // code: asString,
    // data: asString,
    // last_transaction_id: asObject({ lt: asString, hash: asString }),
    // block_id: asObject({ ... }),
    // frozen_hash: asString,
    state: asString
  })
})

export const asDrpcEstimateFee = asObject({
  // ok: asBoolean,
  result: asObject({
    // @type: asString,
    source_fees: asObject({
      // @type: asString,
      in_fwd_fee: asNumber,
      storage_fee: asNumber,
      gas_fee: asNumber,
      fwd_fee: asNumber
    })
    // destination_fees: asArray(...)
  })
})

export const asDrpcRunGetMethod = asObject({
  // ok: asBoolean,
  result: asObject({
    // gas_used: asNumber,
    stack: asArray(asPassthrough),
    exit_code: asNumber
  })
})

export const asDrpcSendBoc = asObject({
  // ok: asBoolean,
  result: asPassthrough
})

const asDrpcTransactionId = asObject({
  // @type: asString,
  lt: asString,
  hash: asString
})

export const asDrpcGetTransactions = asObject({
  // ok: asBoolean,
  result: asArray(
    asObject({
      transaction_id: asDrpcTransactionId
      // utime: asNumber,
      // data: asString,
      // fee: asString,
      // storage_fee: asString,
      // other_fee: asString,
      // in_msg: asObject({ ... }),
      // out_msgs: asArray(...)
    })
  )
})

// ---------------------------------------------------------------------------
// Stack helpers for runGetMethod responses
// ---------------------------------------------------------------------------

function extractCellBytes(val: unknown): string {
  if (typeof val === 'string') return val
  if (typeof val === 'object' && val != null && 'bytes' in val) {
    return (val as any).bytes
  }
  throw new Error('Cannot extract cell bytes')
}

function parseStackEntry(entry: unknown): { type: string; value: any } {
  if (Array.isArray(entry)) {
    const [entryType, val] = entry
    if (entryType === 'num') return { type: 'num', value: val }
    if (entryType === 'cell' || entryType === 'tvm.Cell') {
      return { type: 'cell', value: extractCellBytes(val) }
    }
    if (entryType === 'tvm.Slice') {
      return { type: 'slice', value: extractCellBytes(val) }
    }
    return { type: String(entryType), value: val }
  }
  if (typeof entry === 'object' && entry != null) {
    const obj = entry as any
    if (obj['@type'] === 'tvm.stackEntryNumber') {
      return { type: 'num', value: obj.number?.value ?? obj.number }
    }
    if (obj['@type'] === 'tvm.stackEntryCell') {
      return {
        type: 'cell',
        value: extractCellBytes(obj.cell?.bytes ?? obj.cell)
      }
    }
  }
  throw new Error(`Unknown stack entry format: ${JSON.stringify(entry)}`)
}

export function parseStackNumber(stack: unknown[], index: number): string {
  if (index >= stack.length) {
    throw new Error(`Index ${index} out of bounds (len=${stack.length})`)
  }
  const { type, value } = parseStackEntry(stack[index])
  if (type !== 'num') {
    throw new Error(`Expected num at index ${index}, got ${type}`)
  }
  return BigInt(value).toString()
}

export function parseStackAddress(stack: unknown[], index: number): Address {
  if (index >= stack.length) {
    throw new Error(`Index ${index} out of bounds (len=${stack.length})`)
  }
  const { type, value } = parseStackEntry(stack[index])
  if (type !== 'cell' && type !== 'slice') {
    throw new Error(`Expected cell/slice at index ${index}, got ${type}`)
  }
  const cellBoc = base64.parse(value)
  const cell = Cell.fromBoc(Buffer.from(cellBoc))[0]
  return cell.beginParse().loadAddress()
}

export function parseSeqnoFromStack(stack: unknown[]): number {
  return Number(parseStackNumber(stack, 0))
}
