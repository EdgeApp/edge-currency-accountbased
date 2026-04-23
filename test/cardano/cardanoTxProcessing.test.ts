import { assert } from 'chai'
import { EdgeTransaction } from 'edge-core-js'
import { describe, it } from 'mocha'

import { processCardanoTransaction } from '../../src/cardano/CardanoEngine'
import { asKoiosTransaction } from '../../src/cardano/cardanoTypes'
import cardanoTransactions from '../fixtures/cardanoFixtures.json'

const address =
  'addr_test1qzn854grsysvrgwynsnve629589nkdp0k5a2l2k0jhur090fzuaa62z9yp3w5nyhl03rzvpa3zdpgqaqjgmvyhx46j3snvc7tr'
const walletId = 'DMUCbkMAAmIOoyp5wuI3y+IiB+LQx2TYvcrQENPaEEU='

describe(`Cardano engine`, function () {
  it('processTx', function () {
    const transactions: Record<string, EdgeTransaction[]> = { ADA: [] }

    for (const rawTx of cardanoTransactions.input) {
      const cleanTx = asKoiosTransaction(rawTx)
      const edgeTx = processCardanoTransaction({
        currencyCode: 'ADA',
        address,
        tokenId: null,
        tx: cleanTx,
        walletId
      })

      transactions.ADA.push(edgeTx)
    }

    assert.equal(
      JSON.stringify(transactions, null, 2),
      JSON.stringify(cardanoTransactions.output, null, 2)
    )
  })
})
