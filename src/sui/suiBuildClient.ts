import type { ClientWithCoreApi } from '@mysten/sui/experimental'
import { toBase64 } from '@mysten/sui/utils'

import {
  cleanGraphqlCoins,
  cleanGraphqlExecution,
  cleanGraphqlMoveFunction,
  cleanGraphqlObjects,
  cleanGraphqlReferenceGasPrice,
  cleanGraphqlSimulation,
  coinObjectType,
  COINS_QUERY,
  EXECUTE_MUTATION,
  GraphqlCaller,
  MOVE_FUNCTION_QUERY,
  OBJECTS_QUERY,
  REFERENCE_GAS_PRICE_QUERY,
  SIMULATE_QUERY,
  SuiGraphqlSimulation
} from './suiGraphql'

/**
 * Simulates a transaction from its BCS bytes, as `dryRunTransactionBlock`
 * would have.
 */
export const simulateTransaction = async (
  call: GraphqlCaller,
  transaction: Uint8Array | string
): Promise<SuiGraphqlSimulation> => {
  const value =
    typeof transaction === 'string' ? transaction : toBase64(transaction)
  return cleanGraphqlSimulation(
    await call(SIMULATE_QUERY, { transaction: { bcs: { value } } })
  )
}

/** Submits a signed transaction and returns its digest. */
export const executeTransaction = async (
  call: GraphqlCaller,
  bytes: string,
  signature: string
): Promise<string> => {
  return cleanGraphqlExecution(
    await call(EXECUTE_MUTATION, {
      transaction: bytes,
      signatures: [signature]
    })
  )
}

/**
 * A stand-in for `SuiClient` that `Transaction.build` can resolve against.
 *
 * Handed a client without the `core` API, `Transaction.build` falls back to
 * the SDK's JSON-RPC resolver, which needs exactly these five methods. Each
 * answers from GraphQL in the shape its JSON-RPC namesake returns, so the
 * SDK's own gas, coin, object, and argument resolution runs unchanged. The
 * SDK 1.x GraphQL client cannot resolve transactions itself.
 */
export const makeSuiBuildClient = (call: GraphqlCaller): ClientWithCoreApi => {
  const client = {
    async getReferenceGasPrice(): Promise<bigint> {
      return BigInt(
        cleanGraphqlReferenceGasPrice(await call(REFERENCE_GAS_PRICE_QUERY, {}))
      )
    },

    async getCoins(params: {
      owner: string
      coinType: string
      cursor?: string | null
    }) {
      const { owner, coinType, cursor = null } = params
      const page = cleanGraphqlCoins(
        await call(COINS_QUERY, {
          owner,
          type: coinObjectType(coinType),
          after: cursor
        })
      )
      return {
        data: page.coins.map(coin => ({ ...coin, coinType })),
        hasNextPage: page.hasNextPage,
        nextCursor: page.endCursor
      }
    },

    async multiGetObjects(params: { ids: string[] }) {
      const { ids } = params
      const objects = cleanGraphqlObjects(
        await call(OBJECTS_QUERY, { keys: ids.map(address => ({ address })) }),
        ids
      )
      return objects.map((data, i) =>
        data == null
          ? { error: { code: 'notExists', object_id: ids[i] } }
          : { data }
      )
    },

    async getNormalizedMoveFunction(params: {
      package: string
      module: string
      function: string
    }) {
      const target = `${params.package}::${params.module}::${params.function}`
      const parameters = cleanGraphqlMoveFunction(
        await call(MOVE_FUNCTION_QUERY, {
          package: params.package,
          module: params.module,
          function: params.function
        }),
        target
      )
      return { parameters }
    },

    async dryRunTransactionBlock(params: {
      transactionBlock: Uint8Array | string
    }) {
      const { error, gasUsed, status } = await simulateTransaction(
        call,
        params.transactionBlock
      )
      return { effects: { status: { status, error }, gasUsed } }
    }
  }

  // The resolver is typed against the full client, but these five methods are
  // all it calls when `core` is absent.
  return client as unknown as ClientWithCoreApi
}
