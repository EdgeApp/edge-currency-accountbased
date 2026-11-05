import type {
  BalanceChange,
  GasCostSummary,
  SuiMoveNormalizedType
} from '@mysten/sui/client'
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
import type { JsonObject } from 'edge-core-js/types'
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

/** One transaction, with everything history sync reads. */
const TRANSACTION_FIELDS = `
  digest
  transactionBcs
  sender { address }
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
`

/**
 * One page of the transactions that touch an address, oldest first. The
 * service pages at most 50 at a time, and its cursors stay valid across
 * sessions, so a wallet resumes its walk where the last page ended.
 */
export const ADDRESS_TRANSACTIONS_QUERY = `
  query ($owner: SuiAddress!, $after: String) {
    transactions(first: 50, after: $after, filter: { affectedAddress: $owner }) {
      pageInfo { hasNextPage endCursor }
      nodes {
        ${TRANSACTION_FIELDS}
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
  // Null for the system transactions that no address signs.
  sender: asOptional(asEither(asObject({ address: asString }), asNull), null),
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
    sender: tx.sender?.address ?? null,
    checkpoint: checkpoint.sequenceNumber,
    timestampMs: timestampMs.toFixed(0),
    rawTransaction: toRawTransaction(tx.transactionBcs, tx.signatures),
    effects: { gasUsed: gasEffects.gasSummary },
    balanceChanges: toRpcBalanceChanges(balanceChanges)
  }
}

const asPageInfo = asObject({
  hasNextPage: asBoolean,
  endCursor: asOptional(asEither(asString, asNull), null)
})

/**
 * Reads `data` from a GraphQL response, throwing on any reported error. The
 * service answers some failures as an error with partial or null data, so
 * an error always wins over whatever data came with it.
 */
const asGraphqlData =
  <T>(asData: Cleaner<T>): Cleaner<T> =>
  raw => {
    const { data, errors } = asObject({
      errors: asGraphqlErrors,
      data: asOptional(raw => raw, null)
    })(raw)
    throwGraphqlErrors(errors)
    if (data == null) throw new Error('Sui GraphQL returned no data')
    return asData(data)
  }

//
// History
//

export interface SuiGraphqlTransactionPage {
  transactions: SuiGraphqlTransaction[]
  hasNextPage: boolean
  endCursor: string | null
}

/**
 * Reads an `ADDRESS_TRANSACTIONS_QUERY` response. Like
 * `cleanGraphqlTransactions`, one incomplete row fails the page, since the
 * caller advances its cursor past everything on it.
 */
export const cleanGraphqlTransactionPage = (
  raw: unknown
): SuiGraphqlTransactionPage => {
  const { transactions } = asGraphqlData(
    asObject({
      transactions: asObject({
        pageInfo: asPageInfo,
        nodes: asArray(raw => raw)
      })
    })
  )(raw)

  return {
    transactions: transactions.nodes.map(row => {
      try {
        return asGraphqlTransaction(row)
      } catch (error: unknown) {
        const digest = asMaybe(asObject({ digest: asString }))(row)?.digest
        throw new Error(
          `Sui GraphQL transaction ${String(digest)} is incomplete: ${String(
            error
          )}`
        )
      }
    }),
    hasNextPage: transactions.pageInfo.hasNextPage,
    endCursor: transactions.pageInfo.endCursor
  }
}

//
// Balances
//

export const BALANCES_QUERY = `
  query ($owner: SuiAddress!, $after: String) {
    address(address: $owner) {
      balances(first: 50, after: $after) {
        pageInfo { hasNextPage endCursor }
        nodes { coinType { repr } totalBalance }
      }
    }
  }
`

export interface SuiGraphqlBalancePage {
  /** Coin types in the JSON-RPC spelling, so SUI is `0x2::sui::SUI`. */
  balances: Array<{ coinType: string; totalBalance: string }>
  hasNextPage: boolean
  endCursor: string | null
}

export const cleanGraphqlBalances = (raw: unknown): SuiGraphqlBalancePage => {
  const { address } = asGraphqlData(
    asObject({
      address: asObject({
        balances: asObject({
          pageInfo: asPageInfo,
          nodes: asArray(
            asObject({
              coinType: asObject({ repr: asString }),
              totalBalance: asIntegerString
            })
          )
        })
      })
    })
  )(raw)
  const { nodes, pageInfo } = address.balances

  return {
    balances: nodes.map(node => ({
      coinType: toRpcCoinType(node.coinType.repr),
      totalBalance: node.totalBalance
    })),
    hasNextPage: pageInfo.hasNextPage,
    endCursor: pageInfo.endCursor
  }
}

//
// Transaction building
//

export const REFERENCE_GAS_PRICE_QUERY = `
  query { epoch { referenceGasPrice } }
`

export const cleanGraphqlReferenceGasPrice = (raw: unknown): string =>
  asGraphqlData(
    asObject({ epoch: asObject({ referenceGasPrice: asIntegerString }) })
  )(raw).epoch.referenceGasPrice

export const COINS_QUERY = `
  query ($owner: SuiAddress!, $type: String!, $after: String) {
    address(address: $owner) {
      objects(first: 50, after: $after, filter: { type: $type }) {
        pageInfo { hasNextPage endCursor }
        nodes { address version digest contents { json } }
      }
    }
  }
`

/** The object type filter that matches the coins of `coinType`. */
export const coinObjectType = (coinType: string): string =>
  `0x2::coin::Coin<${coinType}>`

export interface SuiGraphqlCoin {
  coinObjectId: string
  version: string
  digest: string
  balance: string
}

export interface SuiGraphqlCoinPage {
  coins: SuiGraphqlCoin[]
  hasNextPage: boolean
  endCursor: string | null
}

export const cleanGraphqlCoins = (raw: unknown): SuiGraphqlCoinPage => {
  const { address } = asGraphqlData(
    asObject({
      address: asObject({
        objects: asObject({
          pageInfo: asPageInfo,
          nodes: asArray(
            asObject({
              address: asString,
              version: asIntegerString,
              digest: asString,
              contents: asObject({
                json: asObject({ balance: asIntegerString })
              })
            })
          )
        })
      })
    })
  )(raw)
  const { nodes, pageInfo } = address.objects

  return {
    coins: nodes.map(node => ({
      coinObjectId: node.address,
      version: node.version,
      digest: node.digest,
      balance: node.contents.json.balance
    })),
    hasNextPage: pageInfo.hasNextPage,
    endCursor: pageInfo.endCursor
  }
}

export const OBJECTS_QUERY = `
  query ($keys: [ObjectKey!]!) {
    multiGetObjects(keys: $keys) {
      address
      version
      digest
      owner {
        __typename
        ... on AddressOwner { address { address } }
        ... on ObjectOwner { address { address } }
        ... on Shared { initialSharedVersion }
        ... on ConsensusAddressOwner { startVersion address { address } }
      }
    }
  }
`

/** An object's owner in the JSON-RPC shape the SDK's resolver reads. */
export type SuiRpcObjectOwner =
  | { AddressOwner: string }
  | { ObjectOwner: string }
  | { Shared: { initial_shared_version: string } }
  | { ConsensusAddressOwner: { owner: string; start_version: string } }
  | 'Immutable'

export interface SuiGraphqlObject {
  objectId: string
  version: string
  digest: string
  owner: SuiRpcObjectOwner
}

const asOwnerAddress = asObject({ address: asObject({ address: asString }) })

const asGraphqlOwner: Cleaner<SuiRpcObjectOwner> = raw => {
  const { __typename: typename } = asObject({ __typename: asString })(raw)
  switch (typename) {
    case 'AddressOwner':
      return { AddressOwner: asOwnerAddress(raw).address.address }
    case 'ObjectOwner':
      return { ObjectOwner: asOwnerAddress(raw).address.address }
    case 'Shared': {
      const { initialSharedVersion } = asObject({
        initialSharedVersion: asIntegerString
      })(raw)
      return { Shared: { initial_shared_version: initialSharedVersion } }
    }
    case 'ConsensusAddressOwner': {
      const { startVersion } = asObject({ startVersion: asIntegerString })(raw)
      return {
        ConsensusAddressOwner: {
          owner: asOwnerAddress(raw).address.address,
          start_version: startVersion
        }
      }
    }
    case 'Immutable':
      return 'Immutable'
    default:
      throw new TypeError(`Unknown Sui object owner: ${typename}`)
  }
}

/**
 * Reads an `OBJECTS_QUERY` response in the order of `objectIds`, with null
 * for an object the service does not hold.
 */
export const cleanGraphqlObjects = (
  raw: unknown,
  objectIds: string[]
): Array<SuiGraphqlObject | null> => {
  const { multiGetObjects } = asGraphqlData(
    asObject({
      multiGetObjects: asArray(
        asEither(
          asObject({
            address: asString,
            version: asIntegerString,
            digest: asString,
            owner: asGraphqlOwner
          }),
          asNull
        )
      )
    })
  )(raw)
  if (multiGetObjects.length !== objectIds.length) {
    throw new Error(
      `Sui GraphQL returned ${multiGetObjects.length} objects for ${objectIds.length} ids`
    )
  }

  return multiGetObjects.map(object =>
    object == null
      ? null
      : {
          objectId: object.address,
          version: object.version,
          digest: object.digest,
          owner: object.owner
        }
  )
}

export const MOVE_FUNCTION_QUERY = `
  query ($package: SuiAddress!, $module: String!, $function: String!) {
    package(address: $package) {
      module(name: $module) {
        function(name: $function) {
          parameters { signature }
        }
      }
    }
  }
`

const MOVE_PRIMITIVES: { [body: string]: SuiMoveNormalizedType } = {
  address: 'Address',
  bool: 'Bool',
  signer: 'Signer',
  u8: 'U8',
  u16: 'U16',
  u32: 'U32',
  u64: 'U64',
  u128: 'U128',
  u256: 'U256'
}

/**
 * GraphQL describes a Move type as `{ ref, body }`, the shape the SDK
 * converts JSON-RPC's normalized types into. The resolver only accepts the
 * normalized form, so this converts back.
 */
const toNormalizedBody = (body: unknown): SuiMoveNormalizedType => {
  if (typeof body === 'string') {
    const primitive = MOVE_PRIMITIVES[body]
    if (primitive == null) throw new TypeError(`Unknown Sui Move type: ${body}`)
    return primitive
  }
  const { datatype, typeParameter, vector } = asObject({
    datatype: asOptional(
      asObject({
        package: asString,
        module: asString,
        type: asString,
        typeParameters: asArray(raw => raw)
      })
    ),
    typeParameter: asOptional(asNumber),
    vector: asOptional(raw => raw)
  })(body)

  if (vector != null) return { Vector: toNormalizedBody(vector) }
  if (typeParameter != null) return { TypeParameter: typeParameter }
  if (datatype != null) {
    return {
      Struct: {
        address: datatype.package,
        module: datatype.module,
        name: datatype.type,
        typeArguments: datatype.typeParameters.map(toNormalizedBody)
      }
    }
  }
  throw new TypeError(`Unknown Sui Move type: ${JSON.stringify(body)}`)
}

export const asMoveSignature: Cleaner<SuiMoveNormalizedType> = raw => {
  const { body, ref } = asObject({
    body: raw => raw,
    ref: asOptional(asEither(asString, asNull), null)
  })(raw)
  const type = toNormalizedBody(body)
  if (ref === '&') return { Reference: type }
  if (ref === '&mut') return { MutableReference: type }
  return type
}

/** Reads a `MOVE_FUNCTION_QUERY` response as normalized parameter types. */
export const cleanGraphqlMoveFunction = (
  raw: unknown,
  target: string
): SuiMoveNormalizedType[] => {
  const asParameters = asObject({
    parameters: asArray(asObject({ signature: asMoveSignature }))
  })
  const { package: movePackage } = asGraphqlData(
    asObject({
      package: asEither(
        asObject({
          module: asEither(
            asObject({ function: asEither(asParameters, asNull) }),
            asNull
          )
        }),
        asNull
      )
    })
  )(raw)
  const moveFunction = movePackage?.module?.function
  if (moveFunction == null) {
    throw new Error(`Sui GraphQL has no Move function ${target}`)
  }
  return moveFunction.parameters.map(parameter => parameter.signature)
}

export const SIMULATE_QUERY = `
  query ($transaction: JSON!) {
    simulateTransaction(transaction: $transaction) {
      effects {
        status
        executionError { message }
        gasEffects {
          gasSummary {
            computationCost
            storageCost
            storageRebate
            nonRefundableStorageFee
          }
        }
      }
    }
  }
`

export interface SuiGraphqlSimulation {
  /** JSON-RPC's spelling, which the SDK's resolver compares against. */
  status: 'success' | 'failure'
  error?: string
  gasUsed: GasCostSummary
}

export const cleanGraphqlSimulation = (raw: unknown): SuiGraphqlSimulation => {
  const { simulateTransaction } = asGraphqlData(
    asObject({
      simulateTransaction: asObject({
        effects: asObject({
          status: asString,
          executionError: asOptional(
            asEither(asObject({ message: asString }), asNull),
            null
          ),
          gasEffects: asObject({
            gasSummary: asObject({
              computationCost: asIntegerString,
              storageCost: asIntegerString,
              storageRebate: asIntegerString,
              nonRefundableStorageFee: asIntegerString
            })
          })
        })
      })
    })
  )(raw)
  const { executionError, gasEffects, status } = simulateTransaction.effects

  return {
    status: status === 'SUCCESS' ? 'success' : 'failure',
    error: executionError?.message,
    gasUsed: gasEffects.gasSummary
  }
}

//
// Broadcast
//

export const EXECUTE_MUTATION = `
  mutation ($transaction: Base64!, $signatures: [Base64!]!) {
    executeTransaction(
      transactionDataBcs: $transaction
      signatures: $signatures
    ) {
      effects { digest }
    }
  }
`

/** Reads an `EXECUTE_MUTATION` response as the executed digest. */
export const cleanGraphqlExecution = (raw: unknown): string =>
  asGraphqlData(
    asObject({
      executeTransaction: asObject({
        effects: asObject({ digest: asString })
      })
    })
  )(raw).executeTransaction.effects.digest

/** Sends one query to one GraphQL node and returns the raw response. */
export type GraphqlCaller = (
  query: string,
  variables: JsonObject
) => Promise<unknown>
