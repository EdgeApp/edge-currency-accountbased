import { assert } from 'chai'
import { describe, it } from 'mocha'

import {
  asMoveSignature,
  cleanGraphqlBalanceChanges,
  cleanGraphqlBalances,
  cleanGraphqlExecution,
  cleanGraphqlMoveFunction,
  cleanGraphqlObjects,
  cleanGraphqlSimulation,
  cleanGraphqlTransactionPage,
  cleanGraphqlTransactions,
  toRpcBalanceChanges,
  toSuiHistoryTx
} from '../../src/sui/suiGraphql'
import type { SuiHistoryTx } from '../../src/sui/suiTypes'

// One mainnet transaction with two signatures, as each service returned it on
// 2026-10-07.
const DIGEST = '2WbsXjQJuKV2xc3du8GXwhCzch9gppCe89rb65c3nqZm'
const OWNER =
  '0x7ba661f0e68dcfa31c8c20f21d42bc0b973920ee79904bd5683c9259a9925fdf'

const graphqlTransaction = {
  digest: DIGEST,
  transactionBcs:
    'AAAAANJlZycwsFQP/TVpUwaCoPAu+YS3A0V3kFVOsOGTKWY6AQsfM9gXuTa1csBEkRAW6dMrVBnLPTPrVnZrjYObIiyALpXxPQAAAAAgz7sjRgMLXme5So+RfP6R0WAOGzYkwmjwk5TZMLAuWLR7pmHw5o3PoxyMIPIdQrwLlzkg7nmQS9VoPJJZqZJf32QAAAAAAAAAQA0DAAAAAAAA',
  signatures: [
    {
      signatureBytes:
        'AD3v1Gd/koG1bIcGcXEGoY5vKSBh8kogDtYmbMIc+1dUFHcS+uRLz/EimfXYV5y/z24Y2PbsHU40RRBDV4KU/gvdnFBZGfI80NAYBqcGroo/JjP29TZmx58X705TZ5g5nA=='
    },
    {
      signatureBytes:
        'AEQ6TJLFqxBgKkS02K9BAQ8bgWpnqbbSicZ9AbDfyWteJZqEE7LPHDBltXEx625etRTAqIXRz0oB6WdWCAuGTwpE7P2WNqhgK7qaGFEMIbzdcssd5oPz/qtRP8Qq30f2Yw=='
    }
  ],
  effects: {
    timestamp: '2026-10-07T22:02:23.883Z',
    checkpoint: { sequenceNumber: 331457430 },
    gasEffects: {
      gasSummary: {
        computationCost: 100000,
        storageCost: 988000,
        storageRebate: 978120,
        nonRefundableStorageFee: 9880
      }
    },
    balanceChanges: {
      pageInfo: { hasNextPage: false, endCursor: 'MA==' },
      nodes: [
        {
          amount: '-109880',
          coinType: {
            repr: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
          },
          owner: { address: OWNER }
        }
      ]
    }
  }
}

const jsonRpcTransaction: SuiHistoryTx = {
  digest: DIGEST,
  sender: null,
  checkpoint: '331457430',
  timestampMs: '1791410543883',
  rawTransaction:
    'AQAAAAAAAADSZWcnMLBUD/01aVMGgqDwLvmEtwNFd5BVTrDhkylmOgELHzPYF7k2tXLARJEQFunTK1QZyz0z61Z2a42DmyIsgC6V8T0AAAAAIM+7I0YDC15nuUqPkXz+kdFgDhs2JMJo8JOU2TCwLli0e6Zh8OaNz6McjCDyHUK8C5c5IO55kEvVaDySWamSX99kAAAAAAAAAEANAwAAAAAAAAJhAD3v1Gd/koG1bIcGcXEGoY5vKSBh8kogDtYmbMIc+1dUFHcS+uRLz/EimfXYV5y/z24Y2PbsHU40RRBDV4KU/gvdnFBZGfI80NAYBqcGroo/JjP29TZmx58X705TZ5g5nGEARDpMksWrEGAqRLTYr0EBDxuBamepttKJxn0BsN/Ja14lmoQTss8cMGW1cTHrbl61FMCohdHPSgHpZ1YIC4ZPCkTs/ZY2qGArupoYUQwhvN1yyx3mg/P+q1E/xCrfR/Zj',
  effects: {
    gasUsed: {
      computationCost: '100000',
      storageCost: '988000',
      storageRebate: '978120',
      nonRefundableStorageFee: '9880'
    }
  },
  balanceChanges: [
    {
      owner: { AddressOwner: OWNER },
      coinType: '0x2::sui::SUI',
      amount: '-109880'
    }
  ]
}

const makeResponse = (rows: unknown[]): unknown => ({
  data: { multiGetTransactions: rows }
})

describe('toSuiHistoryTx', function () {
  it('rebuilds the transaction JSON-RPC returns', function () {
    const [tx] = cleanGraphqlTransactions(makeResponse([graphqlTransaction]), [
      DIGEST
    ])
    assert.deepEqual(
      toSuiHistoryTx(tx, tx.effects.balanceChanges.nodes),
      jsonRpcTransaction
    )
  })

  it('reads the sender', function () {
    const [tx] = cleanGraphqlTransactions(
      makeResponse([{ ...graphqlTransaction, sender: { address: OWNER } }]),
      [DIGEST]
    )
    const out = toSuiHistoryTx(tx, tx.effects.balanceChanges.nodes)
    assert.equal(out.sender, OWNER)
  })

  it('uses the balance changes it is handed', function () {
    const [tx] = cleanGraphqlTransactions(makeResponse([graphqlTransaction]), [
      DIGEST
    ])
    const { nodes } = tx.effects.balanceChanges
    const out = toSuiHistoryTx(tx, [...nodes, ...nodes])
    assert.equal(out.balanceChanges?.length, 2)
  })
})

describe('toRpcBalanceChanges', function () {
  const usdc =
    '0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC'

  it('leaves token coin types as they are', function () {
    const [change] = toRpcBalanceChanges([
      { amount: '5', coinType: { repr: usdc }, owner: { address: OWNER } }
    ])
    assert.equal(change.coinType, usdc)
  })

  it('leaves out a change with no owner', function () {
    const changes = toRpcBalanceChanges([
      { amount: '5', coinType: { repr: usdc }, owner: null }
    ])
    assert.deepEqual(changes, [])
  })
})

describe('cleanGraphqlTransactions', function () {
  const other = { ...graphqlTransaction, digest: 'other' }

  it('returns transactions in the order asked', function () {
    const txs = cleanGraphqlTransactions(
      makeResponse([graphqlTransaction, other]),
      ['other', DIGEST]
    )
    assert.deepEqual(
      txs.map(tx => tx.digest),
      ['other', DIGEST]
    )
  })

  it('throws when the service does not hold a digest', function () {
    assert.throws(
      () =>
        cleanGraphqlTransactions(makeResponse([graphqlTransaction, null]), [
          DIGEST,
          'other'
        ]),
      /no transaction other/
    )
  })

  it('throws when a transaction is missing what history sync reads', function () {
    for (const effects of [
      null,
      { ...graphqlTransaction.effects, checkpoint: null },
      { ...graphqlTransaction.effects, timestamp: null },
      { ...graphqlTransaction.effects, gasEffects: null }
    ]) {
      assert.throws(
        () =>
          cleanGraphqlTransactions(
            makeResponse([{ ...graphqlTransaction, effects }]),
            [DIGEST]
          ),
        /is incomplete/
      )
    }
  })

  it('throws on a GraphQL error', function () {
    assert.throws(
      () =>
        cleanGraphqlTransactions(
          { data: null, errors: [{ message: 'Request timed out' }] },
          [DIGEST]
        ),
      /Request timed out/
    )
  })
})

describe('cleanGraphqlBalanceChanges', function () {
  it('returns one page of balance changes', function () {
    const { balanceChanges } = graphqlTransaction.effects
    const page = cleanGraphqlBalanceChanges(
      { data: { transaction: { effects: { balanceChanges } } } },
      DIGEST
    )
    assert.equal(page.nodes[0].amount, '-109880')
    assert.equal(page.pageInfo.hasNextPage, false)
  })

  it('throws when the service does not hold the transaction', function () {
    assert.throws(
      () => cleanGraphqlBalanceChanges({ data: { transaction: null } }, DIGEST),
      /no transaction/
    )
  })
})

const SUI_REPR =
  '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'

describe('cleanGraphqlTransactionPage', function () {
  const makePage = (nodes: unknown[]): unknown => ({
    data: {
      transactions: {
        pageInfo: { hasNextPage: true, endCursor: 'next' },
        nodes
      }
    }
  })

  it('returns the transactions and where the next page starts', function () {
    const page = cleanGraphqlTransactionPage(makePage([graphqlTransaction]))
    assert.deepEqual(
      page.transactions.map(tx => tx.digest),
      [DIGEST]
    )
    assert.equal(page.hasNextPage, true)
    assert.equal(page.endCursor, 'next')
  })

  it('throws when a transaction is incomplete', function () {
    assert.throws(
      () =>
        cleanGraphqlTransactionPage(
          makePage([{ ...graphqlTransaction, effects: null }])
        ),
      new RegExp(`${DIGEST} is incomplete`)
    )
  })

  it('throws on a GraphQL error, even with data', function () {
    assert.throws(
      () =>
        cleanGraphqlTransactionPage({
          ...(makePage([]) as object),
          errors: [{ message: 'Invalid cursor' }]
        }),
      /Invalid cursor/
    )
  })
})

describe('cleanGraphqlBalances', function () {
  it('spells SUI the way JSON-RPC does', function () {
    const page = cleanGraphqlBalances({
      data: {
        address: {
          balances: {
            pageInfo: { hasNextPage: false, endCursor: null },
            nodes: [{ coinType: { repr: SUI_REPR }, totalBalance: '42' }]
          }
        }
      }
    })
    assert.deepEqual(page, {
      balances: [{ coinType: '0x2::sui::SUI', totalBalance: '42' }],
      hasNextPage: false,
      endCursor: null
    })
  })
})

describe('cleanGraphqlObjects', function () {
  const object = (owner: unknown): unknown => ({
    address: '0x5',
    version: 7,
    digest: DIGEST,
    owner
  })
  const address = { address: { address: OWNER } }

  it('converts each kind of owner', function () {
    const owners = [
      { __typename: 'AddressOwner', ...address },
      { __typename: 'ObjectOwner', ...address },
      { __typename: 'Shared', initialSharedVersion: 1 },
      { __typename: 'ConsensusAddressOwner', startVersion: 3, ...address },
      { __typename: 'Immutable' }
    ]
    const objects = cleanGraphqlObjects(
      { data: { multiGetObjects: owners.map(object) } },
      owners.map(() => '0x5')
    )
    assert.deepEqual(
      objects.map(object => object?.owner),
      [
        { AddressOwner: OWNER },
        { ObjectOwner: OWNER },
        { Shared: { initial_shared_version: '1' } },
        { ConsensusAddressOwner: { owner: OWNER, start_version: '3' } },
        'Immutable'
      ]
    )
    assert.equal(objects[0]?.version, '7')
  })

  it('returns null for an object the service does not hold', function () {
    const objects = cleanGraphqlObjects({ data: { multiGetObjects: [null] } }, [
      '0x6'
    ])
    assert.deepEqual(objects, [null])
  })

  it('throws when the answer does not match the ids', function () {
    assert.throws(
      () => cleanGraphqlObjects({ data: { multiGetObjects: [] } }, ['0x5']),
      /0 objects for 1 ids/
    )
  })
})

describe('asMoveSignature', function () {
  // GraphQL spells framework packages at full length, where the SDK's
  // resolver compares against the short `0x2` JSON-RPC sent:
  const datatype = (type: string, typeParameters: unknown[] = []): unknown => ({
    datatype: {
      package:
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      module: 'm',
      type,
      typeParameters
    }
  })

  it('converts references and primitives', function () {
    assert.deepEqual(asMoveSignature({ ref: '&', body: 'u64' }), {
      Reference: 'U64'
    })
    assert.deepEqual(asMoveSignature({ ref: '&mut', body: 'address' }), {
      MutableReference: 'Address'
    })
    assert.equal(asMoveSignature({ ref: null, body: 'bool' }), 'Bool')
  })

  it('converts vectors, type parameters, and structs', function () {
    assert.deepEqual(asMoveSignature({ body: { vector: 'u8' } }), {
      Vector: 'U8'
    })
    assert.deepEqual(asMoveSignature({ body: { typeParameter: 0 } }), {
      TypeParameter: 0
    })
    assert.deepEqual(
      asMoveSignature({ body: datatype('Coin', [datatype('SUI')]) }),
      {
        Struct: {
          address: '0x2',
          module: 'm',
          name: 'Coin',
          typeArguments: [
            {
              Struct: {
                address: '0x2',
                module: 'm',
                name: 'SUI',
                typeArguments: []
              }
            }
          ]
        }
      }
    )
  })

  it('throws on an unknown type', function () {
    assert.throws(() => asMoveSignature({ body: 'u512' }), /u512/)
  })
})

describe('cleanGraphqlMoveFunction', function () {
  it('throws when the function does not exist', function () {
    assert.throws(
      () =>
        cleanGraphqlMoveFunction(
          { data: { package: { module: null } } },
          '0x2::m::f'
        ),
      /no Move function 0x2::m::f/
    )
  })
})

describe('cleanGraphqlSimulation', function () {
  const simulation = (status: string, executionError: unknown): unknown => ({
    data: {
      simulateTransaction: {
        effects: {
          status,
          executionError,
          gasEffects: {
            gasSummary: {
              computationCost: 1000,
              storageCost: 2000,
              storageRebate: 500,
              nonRefundableStorageFee: 5
            }
          }
        }
      }
    }
  })

  it('reads a success with the gas used', function () {
    assert.deepEqual(cleanGraphqlSimulation(simulation('SUCCESS', null)), {
      status: 'success',
      error: undefined,
      gasUsed: {
        computationCost: '1000',
        storageCost: '2000',
        storageRebate: '500',
        nonRefundableStorageFee: '5'
      }
    })
  })

  it('reads a failure with its message', function () {
    const out = cleanGraphqlSimulation(
      simulation('FAILURE', { message: 'InsufficientCoinBalance' })
    )
    assert.equal(out.status, 'failure')
    assert.equal(out.error, 'InsufficientCoinBalance')
  })
})

describe('cleanGraphqlExecution', function () {
  it('returns the digest', function () {
    assert.equal(
      cleanGraphqlExecution({
        data: { executeTransaction: { effects: { digest: DIGEST } } }
      }),
      DIGEST
    )
  })

  it('throws on a rejected transaction', function () {
    assert.throws(
      () =>
        cleanGraphqlExecution({
          data: null,
          errors: [{ message: 'Invalid user signature' }]
        }),
      /Invalid user signature/
    )
  })
})
