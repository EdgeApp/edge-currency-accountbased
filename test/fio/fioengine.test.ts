import { assert } from 'chai'
import { EdgeTransaction } from 'edge-core-js'
import { describe, it } from 'mocha'

import {
  FindTransaction,
  GetTransactionList,
  parseAction
} from '../../src/fio/FioEngine'
import { asFioHistoryNodeAction } from '../../src/fio/fioSchema'
import fioactions from '../fixtures/fioactions.json'

describe(`Fio engine`, function () {
  it('parseAction', function () {
    const transactions: Record<string, EdgeTransaction[]> = { FIO: [] }
    const findTransaction: FindTransaction = (
      currencyCode: string,
      txid: string
    ) => transactions.FIO.findIndex(tx => tx.txid === txid)

    const getTransactionList: GetTransactionList = (currencyCode: string) =>
      transactions[currencyCode]

    for (const rawAction of fioactions.input) {
      const action = asFioHistoryNodeAction(rawAction)
      const result = parseAction({
        action,
        actor: 'wpvee4fsdbvu',
        currencyCode: 'FIO',
        denom: {
          name: 'FIO',
          multiplier: '1000000000',
          symbol: 'ᵮ'
        },
        highestTxHeight: 0,
        publicKey: 'FIO73pdX8TKfEn4XRnzS6C2T65QW2RtrD6NBNzoAYxUg9D1BtgR5f',
        walletId: 'FIO_fake_walletId',
        findTransaction,
        getTransactionList
      })
      const { transaction } = result
      if (transaction != null) {
        transactions.FIO.push(transaction)
      }
    }

    assert.equal(
      JSON.stringify(transactions, null, 2),
      JSON.stringify(fioactions.output, null, 2)
    )
  })
})
