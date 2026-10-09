import { assert } from 'chai'
import { describe, it } from 'mocha'

import {
  cleanGraphqlBalanceChanges,
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
