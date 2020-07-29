import { asArray, asNumber, asObject, asOptional, asString } from 'cleaners'

export const asFioHistoryNodeAction = asObject({
  account_action_seq: asNumber,
  block_num: asNumber,
  block_time: asString,
  action_trace: asObject({
    receiver: asString,
    act: asObject({
      account: asString,
      name: asString,
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

export type FioHistoryNodeAction = $Call<typeof asFioHistoryNodeAction>
