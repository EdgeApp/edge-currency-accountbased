import type { BalanceChange } from '@mysten/sui/client'
import { normalizeStructTag, SUI_TYPE_ARG } from '@mysten/sui/utils'
import {
  asArray,
  asBoolean,
  asEither,
  asMaybe,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner
} from 'cleaners'
import { base64 } from 'rfc4648'

import type { SuiHistoryTx } from './suiTypes'

/**
 * Digests per `multiGetTransactions` request. The service takes 200 keys but
 * caps the request body at 5000 bytes, which 50 digests stay well inside. A
 * JSON-RPC page holds at most 50 transactions, so one page is one request.
 */
export const GRAPHQL_TRANSACTIONS_PER_REQUEST = 50

/** The most balance changes the service returns for one transaction at once. */
const BALANCE_CHANGES_PER_PAGE = 50

const BALANCE_CHANGES_FIELDS = `
  pageInfo { hasNextPage endCursor }
  nodes { amount coinType { repr } owner { address } }
`

export const TRANSACTIONS_QUERY = `
  query ($keys: [String!]!) {
    multiGetTransactions(keys: $keys) {
      digest
      transactionBcs
      signatures { signatureBytes }
      effects {
        timestamp
        checkpoint { sequenceNumber }
        gasEffects {
          gasSummary {
            computationCost
            storageCost
            storageRebate
            nonRefundableStorageFee
          }
        }
        balanceChanges(first: ${BALANCE_CHANGES_PER_PAGE}) {
          ${BALANCE_CHANGES_FIELDS}
        }
      }
    }
  }
`

export const BALANCE_CHANGES_QUERY = `
  query ($digest: String!, $after: String) {
    transaction(digest: $digest) {
      effects {
        balanceChanges(first: ${BALANCE_CHANGES_PER_PAGE}, after: $after) {
          ${BALANCE_CHANGES_FIELDS}
        }
      }
    }
  }
`

/** GraphQL sends `UInt53` as a JSON number and `BigInt` as a string. */
const asIntegerString: Cleaner<string> = raw => {
  const value = asEither(asString, asNumber)(raw)
  const out = typeof value === 'number' ? value.toFixed(0) : value
  if (!/^-?\d+$/.test(out)) throw new TypeError(`Expected an integer: ${out}`)
  return out
}

const asGraphqlBalanceChanges = asObject({
  pageInfo: asObject({
    hasNextPage: asBoolean,
    endCursor: asOptional(asEither(asString, asNull), null)
  }),
  nodes: asArray(
    asObject({
      amount: asIntegerString,
      coinType: asObject({ repr: asString }),
      // Null when the service cannot name an owner. No such row can belong to
      // the wallet, so the conversion below leaves it out.
      owner: asOptional(asEither(asObject({ address: asString }), asNull), null)
    })
  )
})
export type SuiGraphqlBalanceChanges = ReturnType<
  typeof asGraphqlBalanceChanges
>

/**
 * A transaction as `TRANSACTIONS_QUERY` returns it. Everything history sync
 * reads is required, so a partial answer fails here instead of turning into a
 * transaction the wallet silently never shows.
 */
const asGraphqlTransaction = asObject({
  digest: asString,
  transactionBcs: asString,
  signatures: asArray(asObject({ signatureBytes: asString })),
  effects: asObject({
    timestamp: asString,
    checkpoint: asObject({ sequenceNumber: asIntegerString }),
    gasEffects: asObject({
      gasSummary: asObject({
        computationCost: asIntegerString,
        storageCost: asIntegerString,
        storageRebate: asIntegerString,
        nonRefundableStorageFee: asIntegerString
      })
    }),
    balanceChanges: asGraphqlBalanceChanges
  })
})
export type SuiGraphqlTransaction = ReturnType<typeof asGraphqlTransaction>

const asGraphqlErrors = asOptional(
  asEither(asArray(asObject({ message: asString })), asNull),
  null
)

const asGraphqlTransactionsResponse = asObject({
  errors: asGraphqlErrors,
  data: asOptional(
    asEither(
      asObject({
        // The service answers null for a digest it does not hold. The row
        // cleaner runs later, per transaction, so one bad row is reported by
        // its digest.
        multiGetTransactions: asArray(raw => raw)
      }),
      asNull
    ),
    null
  )
})

const asGraphqlBalanceChangesResponse = asObject({
  errors: asGraphqlErrors,
  data: asOptional(
    asEither(
      asObject({
        transaction: asEither(
          asObject({
            effects: asObject({ balanceChanges: asGraphqlBalanceChanges })
          }),
          asNull
        )
      }),
      asNull
    ),
    null
  )
})

const throwGraphqlErrors = (
  errors: Array<{ message: string }> | null
): void => {
  if (errors == null || errors.length === 0) return
  throw new Error(
    `Sui GraphQL error: ${errors.map(error => error.message).join('; ')}`
  )
}

/**
 * Reads a `TRANSACTIONS_QUERY` response for `digests`, in the order asked.
 * Throws when any of them is missing or incomplete: the caller advances its
 * history cursor past every transaction it is handed, so a gap has to stop
 * the sweep, not pass through it.
 */
export const cleanGraphqlTransactions = (
  raw: unknown,
  digests: string[]
): SuiGraphqlTransaction[] => {
  const { data, errors } = asGraphqlTransactionsResponse(raw)
  throwGraphqlErrors(errors)

  const byDigest = new Map<string, unknown>()
  for (const row of data?.multiGetTransactions ?? []) {
    const clean = asMaybe(asObject({ digest: asString }))(row)
    if (clean != null) byDigest.set(clean.digest, row)
  }

  return digests.map(digest => {
    const row = byDigest.get(digest)
    if (row == null) {
      throw new Error(`Sui GraphQL has no transaction ${digest}`)
    }
    try {
      return asGraphqlTransaction(row)
    } catch (error: unknown) {
      throw new Error(
        `Sui GraphQL transaction ${digest} is incomplete: ${String(error)}`
      )
    }
  })
}

/** Reads a `BALANCE_CHANGES_QUERY` response for one transaction. */
export const cleanGraphqlBalanceChanges = (
  raw: unknown,
  digest: string
): SuiGraphqlBalanceChanges => {
  const { data, errors } = asGraphqlBalanceChangesResponse(raw)
  throwGraphqlErrors(errors)
  if (data?.transaction == null) {
    throw new Error(`Sui GraphQL has no transaction ${digest}`)
  }
  return data.transaction.effects.balanceChanges
}

const NATIVE_COIN_TYPE = normalizeStructTag(SUI_TYPE_ARG)

/**
 * GraphQL writes every address at full length, while JSON-RPC writes the
 * native coin as `0x2::sui::SUI`, which is the spelling the engine compares
 * against. Token coin types pass through: the token id derived from them is
 * the same at either length.
 */
const toRpcCoinType = (repr: string): string =>
  normalizeStructTag(repr) === NATIVE_COIN_TYPE ? SUI_TYPE_ARG : repr

export const toRpcBalanceChanges = (
  nodes: SuiGraphqlBalanceChanges['nodes']
): BalanceChange[] => {
  const out: BalanceChange[] = []
  for (const node of nodes) {
    if (node.owner == null) continue
    out.push({
      amount: node.amount,
      coinType: toRpcCoinType(node.coinType.repr),
      owner: { AddressOwner: node.owner.address }
    })
  }
  return out
}

const uleb128 = (value: number): number[] => {
  const out: number[] = []
  let rest = value
  while (rest >= 0x80) {
    out.push((rest % 0x80) + 0x80)
    rest = Math.floor(rest / 0x80)
  }
  out.push(rest)
  return out
}

/**
 * Rebuilds what JSON-RPC calls `rawTransaction`. GraphQL returns the
 * transaction data and its signatures separately, and JSON-RPC returns them
 * as one BCS `SenderSignedData`: a one-element vector holding the intent
 * (three zero bytes for a user transaction), the transaction data, and the
 * signatures as a vector of byte vectors.
 */
const toRawTransaction = (
  transactionBcs: string,
  signatures: Array<{ signatureBytes: string }>
): string => {
  const bytes: number[] = [1, 0, 0, 0, ...base64.parse(transactionBcs)]
  bytes.push(...uleb128(signatures.length))
  for (const { signatureBytes } of signatures) {
    const signature = base64.parse(signatureBytes)
    bytes.push(...uleb128(signature.length), ...signature)
  }
  return base64.stringify(bytes)
}

/**
 * Converts a GraphQL transaction into the JSON-RPC shape, so history sync
 * stores the same transaction whichever service supplied it. `balanceChanges`
 * is the transaction's full list, which the caller gathers when it runs past
 * the first page.
 */
export const toSuiHistoryTx = (
  tx: SuiGraphqlTransaction,
  balanceChanges: SuiGraphqlBalanceChanges['nodes']
): SuiHistoryTx => {
  const { checkpoint, gasEffects, timestamp } = tx.effects

  const timestampMs = Date.parse(timestamp)
  if (Number.isNaN(timestampMs)) {
    throw new Error(
      `Sui GraphQL transaction ${tx.digest} has a bad timestamp: ${timestamp}`
    )
  }

  return {
    digest: tx.digest,
    checkpoint: checkpoint.sequenceNumber,
    timestampMs: timestampMs.toFixed(0),
    rawTransaction: toRawTransaction(tx.transactionBcs, tx.signatures),
    effects: { gasUsed: gasEffects.gasSummary },
    balanceChanges: toRpcBalanceChanges(balanceChanges)
  }
}
