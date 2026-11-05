import { Transaction } from '@mysten/sui/transactions'
import { assert } from 'chai'
import { describe, it } from 'mocha'

import { makeSuiBuildClient } from '../../src/sui/suiBuildClient'
import {
  COINS_QUERY,
  MOVE_FUNCTION_QUERY,
  OBJECTS_QUERY,
  REFERENCE_GAS_PRICE_QUERY,
  SIMULATE_QUERY
} from '../../src/sui/suiGraphql'

const OWNER =
  '0x7ba661f0e68dcfa31c8c20f21d42bc0b973920ee79904bd5683c9259a9925fdf'
const COIN_ID =
  '0x1111111111111111111111111111111111111111111111111111111111111111'
const DIGEST = '2WbsXjQJuKV2xc3du8GXwhCzch9gppCe89rb65c3nqZm'
const SYSTEM_STATE =
  '0x0000000000000000000000000000000000000000000000000000000000000005'

const datatype = (
  pkg: string,
  module: string,
  type: string,
  typeParameters: unknown[] = []
): unknown => ({
  datatype: { package: pkg, module, type, typeParameters }
})

/**
 * Answers each query the resolver sends the way the live service did on
 * 2026-11-05, and records the queries in order.
 */
const makeFakeCall = (): {
  call: (query: string, variables: object) => Promise<unknown>
  queries: string[]
  simulated: unknown[]
} => {
  const queries: string[] = []
  const simulated: unknown[] = []
  const call = async (query: string, variables: object): Promise<unknown> => {
    switch (query) {
      case REFERENCE_GAS_PRICE_QUERY:
        queries.push('gasPrice')
        return { data: { epoch: { referenceGasPrice: '750' } } }
      case COINS_QUERY:
        queries.push('coins')
        return {
          data: {
            address: {
              objects: {
                pageInfo: { hasNextPage: false, endCursor: null },
                nodes: [
                  {
                    address: COIN_ID,
                    version: 12,
                    digest: DIGEST,
                    contents: { json: { balance: '5000000000' } }
                  }
                ]
              }
            }
          }
        }
      case OBJECTS_QUERY:
        queries.push('objects')
        return {
          data: {
            multiGetObjects: [
              {
                address: SYSTEM_STATE,
                version: 1074011348,
                digest: DIGEST,
                owner: { __typename: 'Shared', initialSharedVersion: 1 }
              }
            ]
          }
        }
      case MOVE_FUNCTION_QUERY:
        queries.push('moveFunction')
        return {
          data: {
            package: {
              module: {
                function: {
                  parameters: [
                    {
                      signature: {
                        ref: '&mut',
                        body: datatype('0x3', 'sui_system', 'SuiSystemState')
                      }
                    },
                    {
                      signature: {
                        body: datatype('0x2', 'coin', 'Coin', [
                          datatype('0x2', 'sui', 'SUI')
                        ])
                      }
                    },
                    { signature: { body: 'address' } },
                    {
                      signature: {
                        ref: '&mut',
                        body: datatype('0x2', 'tx_context', 'TxContext')
                      }
                    }
                  ]
                }
              }
            }
          }
        }
      case SIMULATE_QUERY:
        queries.push('simulate')
        simulated.push(variables)
        return {
          data: {
            simulateTransaction: {
              effects: {
                status: 'SUCCESS',
                executionError: null,
                gasEffects: {
                  gasSummary: {
                    computationCost: 750000,
                    storageCost: 1976000,
                    storageRebate: 978120,
                    nonRefundableStorageFee: 9880
                  }
                }
              }
            }
          }
        }
    }
    throw new Error(`Unexpected query: ${query}`)
  }
  return { call, queries, simulated }
}

describe('makeSuiBuildClient', function () {
  it('builds a native transfer', async function () {
    const { call, queries, simulated } = makeFakeCall()
    const tx = new Transaction()
    const [coin] = tx.splitCoins(tx.gas, [1000])
    tx.transferObjects([coin], OWNER)
    tx.setSender(OWNER)

    await tx.build({ client: makeSuiBuildClient(call) })
    const data = tx.getData()

    assert.deepEqual(queries, ['gasPrice', 'simulate', 'coins'])
    assert.equal(data.gasData.price, '750')
    // Computation plus the SDK's overhead (1000 * price), plus net storage:
    assert.equal(
      data.gasData.budget,
      String(750000 + 750000 + 1976000 - 978120)
    )
    assert.deepEqual(data.gasData.payment, [
      { objectId: COIN_ID, version: '12', digest: DIGEST }
    ])
    assert.match(
      String((simulated[0] as any).transaction.bcs.value),
      /^[A-Za-z0-9+/]+=*$/
    )
  })

  it('resolves a Move call with a shared object', async function () {
    const { call, queries } = makeFakeCall()
    const tx = new Transaction()
    const [coin] = tx.splitCoins(tx.gas, [1000000000])
    tx.moveCall({
      target: '0x3::sui_system::request_add_stake',
      arguments: [tx.object('0x5'), coin, tx.pure.address(OWNER)]
    })
    tx.setSender(OWNER)

    await tx.build({ client: makeSuiBuildClient(call) })
    const shared = tx
      .getData()
      .inputs.map(input => input.Object?.SharedObject)
      .find(object => object != null)

    assert.includeMembers(queries, ['objects', 'moveFunction'])
    assert.equal(shared?.objectId, SYSTEM_STATE)
    assert.equal(shared?.initialSharedVersion, '1')
    // Mutable because the function takes `&mut SuiSystemState`:
    assert.equal(shared?.mutable, true)
  })

  it('reports a missing object', async function () {
    const { call } = makeFakeCall()
    const missing = async (
      query: string,
      variables: object
    ): Promise<unknown> =>
      query === OBJECTS_QUERY
        ? { data: { multiGetObjects: [null] } }
        : await call(query, variables)
    const tx = new Transaction()
    tx.moveCall({
      target: '0x3::sui_system::request_add_stake',
      arguments: [tx.object('0x5'), tx.gas, tx.pure.address(OWNER)]
    })
    tx.setSender(OWNER)

    let message = ''
    await tx.build({ client: makeSuiBuildClient(missing) }).catch(error => {
      message = String(error)
    })
    assert.match(message, /notExists/)
  })
})
