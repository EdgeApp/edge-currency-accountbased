

import { asNumber, asObject, asString } from 'cleaners'
export type TezosSettings = {
  tezosRpcNodes: string[]
}

export const asXtzGetTransaction = asObject({
  level: asNumber,
  timestamp: asString,
  hash: asString,
  sender: asObject({
    address: asString
  }),
  bakerFee: asNumber,
  allocationFee: asNumber,
  target: asObject({
    address: asString
  }),
  amount: asNumber,
  status: asString
})

export type XtzGetTransaction = ReturnType<typeof asXtzGetTransaction>

export type UriTransaction = {
  kind: 'transaction',
  amount: string,
  destination: string
}

export type HeadInfo = {
  protocol: string,
  chain_id: string,
  hash: string,
  level: number,
  proto: number,
  predecessor: string,
  timestamp: string,
  validation_pass: number,
  operation_hash: string,
  fitness: any,
  context: string,
  priority: number,
  proof_of_work_nonce: string,
  signature: string
}

export type TezosReveal = {
  kind: 'reveal',
  source: string,
  fee: string,
  counter: string | number,
  gas_limit: string | number,
  storage_limit: string | number,
  public_key: string
}

export type TezosTransaction = {
  kind: 'transaction',
  source: string,
  fee: string,
  counter: string | number,
  gas_limit: string | number,
  storage_limit: string | number,
  amount: string | number,
  destination: string,
  parameters?: string
}

export type TezosOrigination = {
  kind: 'origination',
  source: string,
  fee: string,
  counter: string | number,
  gas_limit: string | number,
  storage_limit: string | number,
  manager_pubkey: string,
  balance: string | number,
  spendable: true,
  delegatable: true,
  delegate?: string
}

export type TezosDelegation = {
  kind: 'delegation',
  source: string,
  fee: string,
  counter: string | number,
  gas_limit: string | number,
  storage_limit: string | number,
  delegate?: string
}

export type TezosOperation =
  | TezosReveal
  | TezosTransaction
  | TezosOrigination
  | TezosDelegation

export type TezosOperations = TezosOperation[]

export type OperationsContainer = {
  opbytes: string,
  opOb: {
    branch: string,
    contents: TezosOperations,
    signature?: string
  }
}
