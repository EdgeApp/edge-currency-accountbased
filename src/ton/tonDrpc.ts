import { asArray, asNumber, asObject, asString } from 'cleaners'
import { EdgeIo } from 'edge-core-js/types'

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

export function parseSeqnoFromStack(stack: unknown[]): number {
  if (stack.length === 0) {
    throw new Error('Empty stack for seqno')
  }
  const entry = stack[0]
  if (!Array.isArray(entry) || entry.length < 2) {
    throw new Error('Unexpected seqno stack format')
  }
  const [type, value] = entry
  if (type !== 'num') {
    throw new Error(`Unexpected seqno stack type: ${String(type)}`)
  }
  return Number(value)
}
