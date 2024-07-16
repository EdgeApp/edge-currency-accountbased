import {
  asArray,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asValue
} from 'cleaners'

export const asGetFioAddress = asObject({
  fio_addresses: asArray(
    asObject({
      fio_address: asString,
      remaining_bundled_tx: asNumber
    })
  )
})

export const asGetFioDomains = asObject({
  fio_domains: asArray(
    asObject({
      fio_domain: asString,
      expiration: asString,
      is_public: asNumber
    })
  )
})

export const asFioTxName = asMaybe(
  asValue('unstakefio', 'transfer', 'regaddress', 'trnsfiopubky'),
  null
)

export const asFioHistoryNodeAction = asObject({
  account_action_seq: asNumber,
  block_num: asNumber,
  block_time: asString,
  action_trace: asObject({
    receiver: asString,
    act: asObject({
      account: asString,
      name: asFioTxName,
      authorization: asArray(
        asObject({
          actor: asString,
          permission: asString
        })
      ),
      data: asObject({
        payee_public_key: asOptional(asString),
        amount: asOptional(asNumber),
        max_fee: asOptional(asNumber),
        actor: asOptional(asString),
        tpid: asOptional(asString),
        quantity: asOptional(asString),
        memo: asOptional(asString),
        to: asOptional(asString),
        from: asOptional(asString)
      }),
      hex_data: asString
    }),
    trx_id: asString,
    block_num: asNumber,
    block_time: asString,
    producer_block_id: asString
  })
})

export const asHistoryResponse = asObject({
  actions: asArray(asFioHistoryNodeAction)
})

export const asGetFioBalanceResponse = asObject({
  balance: asNumber,
  available: asNumber,
  staked: asNumber,
  srps: asNumber,
  roe: asString
})

export type FioTxName = ReturnType<typeof asFioTxName>
export type FioHistoryNodeAction = ReturnType<typeof asFioHistoryNodeAction>
