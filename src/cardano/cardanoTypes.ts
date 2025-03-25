import {
  asArray,
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asTuple,
  asUnknown,
  Cleaner,
  uncleaner
} from 'cleaners'

import { asAny, asWalletInfo } from '../common/types'

export interface CardanoNetworkInfo {
  networkId: number
  koiosServer: string
  blockfrostServer: string
  maestroServer: string
}

export type SafeCardanoWalletInfo = ReturnType<typeof asSafeCardanoWalletInfo>
export const asSafeCardanoWalletInfo = asWalletInfo(
  asObject({
    bech32Address: asString,
    publicKey: asString
  })
)

export interface CardanoPrivateKeys {
  mnemonic: string
  // Backwards-compatible, bech32-formatted derived key on path m/1852'/1815'/0'
  accountKey?: string
  // Backwards-compatible, bech32-formatted root key from mnemonic
  privateKey?: string
}
export const asCardanoPrivateKeys = (
  pluginId: string
): Cleaner<CardanoPrivateKeys> => {
  return asCodec(
    raw => {
      const keysObject = asObject(asAny)(raw)
      return asObject({
        mnemonic: asString,
        accountKey: asOptional(asString),
        privateKey: asOptional(asString)
      })({
        ...keysObject,
        mnemonic: keysObject[`${pluginId}Mnemonic`]
      })
    },
    clean => {
      return {
        [`${pluginId}Mnemonic`]: clean.mnemonic,
        accountKey: clean.accountKey,
        privateKey: clean.privateKey
      }
    }
  )
}
export const wasCardanoPrivateKeys = (
  pluginId: string
): Cleaner<CardanoPrivateKeys> => uncleaner(asCardanoPrivateKeys(pluginId))

export const asKoiosBlockheight = asTuple(
  asObject({
    // hash: 'e8c6992d52cd74b577b79251e0351be25070797a0dbc486b2c284d0bf7aeea9c',
    epoch_no: asNumber, // 321,
    abs_slot: asNumber, // 53384242,
    // epoch_slot: 75442,
    block_no: asNumber // 42325043,
    // block_time: 1506635091
  })
)

export const asKoiosUtxo = asObject({
  // asset_name: '444f4e545350414d',
  asset_list: asArray(asUnknown),
  // block_height: 42325043,
  // block_time: 1506635091,
  // fingerprint: 'asset1ua6pz3yd5mdka946z8jw2fld3f8d0mmxt75gv9',
  // datum_hash:
  //   '5a595ce795815e81d22a1a522cf3987d546dc5bb016de61b002edd63a5413ec4',
  // decimals: 0,
  // inline_datum: {
  //   bytes: '19029a',
  //   value: {
  //     int: 666
  //   }
  // },
  // policy_id:
  //   'd3501d9531fcc25e3ca4b6429318c2cc374dbdbcf5e99c1c1e5da1ff',
  // quantity: 1
  // reference_script: {
  //   hash: '67f33146617a5e61936081db3b2117cbf59bd2123748f58ac9678656',
  //   size: 14,
  //   type: 'plutusV1',
  //   bytes: '4e4d01000033222220051200120011',
  //   value: 'null'
  // },
  tx_hash: asString, // 'f144a8264acf4bdfe2e1241170969c930d64ab6b0996a4a45237b623f1dd670e',
  tx_index: asNumber, // 0,
  value: asString // 157832856,
})

export type KoiosUtxo = ReturnType<typeof asKoiosUtxo>

export const asKoiosBalance = asArray(
  asObject({
    // address: 'addr1qxkfe8s6m8qt5436lec3f0320hrmpppwqgs2gah4360krvyssntpwjcz303mx3h4avg7p29l3zd8u3jyglmewds9ezrqdc3cxp',
    balance: asString, // 10723473983,
    // stake_address: null,
    // script_address: true,
    utxo_set: asArray(asKoiosUtxo)
  })
)

export const asCardanoWalletOtherData = asObject({
  latestQueryTransactionsBlockHeight: asMaybe(asNumber, 0),
  latestQueryTransactionsTxid: asMaybe(asString, '')
})
export type CardanoWalletOtherData = ReturnType<typeof asCardanoWalletOtherData>

export const asKoiosAddressTransactions = asArray(
  asObject({
    tx_hash: asString, // 'f144a8264acf4bdfe2e1241170969c930d64ab6b0996a4a45237b623f1dd670e',
    // epoch_no: asNumber, // 321,
    block_height: asNumber // 42325043,
    // block_time: asNumber // 1506635091
  })
)

const asPaymentAddr = asObject({
  bech32: asString
  // cred: asOptional(asString)
})

const asInputOrOutput = asObject({
  payment_addr: asPaymentAddr,
  // stake_addr: asOptional(asString),
  // tx_hash: asString,
  // tx_index: asNumber,
  value: asString
  // datum_hash: asOptional(asString),
  // inline_datum: asOptional(
  //   asObject({
  //     bytes: asString,
  //     value: asObject({ int: asNumber })
  //   })
  // ),
  // reference_script: asOptional(
  //   asObject({
  //     hash: asString,
  //     size: asNumber,
  //     type: asString,
  //     bytes: asString,
  //     value: asOptional(asString)
  //   })
  // ),
  // asset_list: asOptional(
  //   asArray(
  //     asObject({
  //       policy_id: asString,
  //       asset_name: asString,
  //       fingerprint: asString,
  //       decimals: asNumber,
  //       quantity: asString
  //     })
  //   )
  // )
})

export const asKoiosTransaction = asObject({
  tx_hash: asString,
  // block_hash: asString,
  block_height: asNumber,
  // epoch_no: asNumber,
  // epoch_slot: asNumber,
  // absolute_slot: asNumber,
  tx_timestamp: asNumber,
  // tx_block_index: asNumber,
  // tx_size: asNumber,
  // total_output: asString,
  fee: asString,
  // deposit: asOptional(asString),
  // invalid_before: asOptional(asString),
  // invalid_after: asOptional(asString),
  // collateral_inputs:
  // collateral_output:
  // reference_inputs:
  inputs: asArray(asInputOrOutput),
  outputs: asArray(asInputOrOutput)
})
export type KoiosNetworkTx = ReturnType<typeof asKoiosTransaction>

export const asKoiosTransactionsRes = asArray(asKoiosTransaction)

export interface CardanoTxOtherParams {
  isStakeTx?: boolean
  /**
   * Whether the transaction is spendable wallet by comparison of the wallet's
   * utxos with the transaction's inputs. This can happen from decoding a tx
   * template created externally form the engine (e.g. Kiln).
   **/
  isSpendable?: boolean
  unsignedTx: string
}
export const asCardanoTxOtherParams = asObject<CardanoTxOtherParams>({
  isStakeTx: asOptional(asBoolean),
  isSpendable: asOptional(asBoolean),
  unsignedTx: asString
})

export const asKoiosNetworkParameters = asObject({
  epoch_no: asNumber, // 472,
  min_fee_a: asNumber, // 44,
  min_fee_b: asNumber, // 155381,
  //   max_block_size: 90112,
  max_tx_size: asNumber, // 16384,
  //   max_bh_size: 1100,
  key_deposit: asString, // '2000000',
  pool_deposit: asString, // '500000000',
  //   max_epoch: 18,
  //   optimal_pool_count: 500,
  //   influence: 0.3,
  //   monetary_expand_rate: 0.003,
  //   treasury_growth_rate: 0.2,
  //   decentralisation: 0,
  //   extra_entropy: null,
  //   protocol_major: 8,
  //   protocol_minor: 0,
  //   min_utxo_value: '0',
  //   min_pool_cost: '170000000',
  //   nonce: 'ba23e6005679ca65969dbda097792a868da554937d32619907d227c4d490c2de',
  //   block_hash:
  //     'fa0e20014b0f59557b5299a487a881c8df6150d0a2d47fee44a3765da5afc887',
  //   cost_models: {
  //     PlutusV1: [
  //       205665, 812, 1, 1, 1000, 571, 0, 1, 1000, 24177, 4, 1, 1000, 32, 117366,
  //       10475, 4, 23000, 100, 23000, 100, 23000, 100, 23000, 100, 23000, 100,
  //       23000, 100, 100, 100, 23000, 100, 19537, 32, 175354, 32, 46417, 4,
  //       221973, 511, 0, 1, 89141, 32, 497525, 14068, 4, 2, 196500, 453240, 220,
  //       0, 1, 1, 1000, 28662, 4, 2, 245000, 216773, 62, 1, 1060367, 12586, 1,
  //       208512, 421, 1, 187000, 1000, 52998, 1, 80436, 32, 43249, 32, 1000, 32,
  //       80556, 1, 57667, 4, 1000, 10, 197145, 156, 1, 197145, 156, 1, 204924,
  //       473, 1, 208896, 511, 1, 52467, 32, 64832, 32, 65493, 32, 22558, 32,
  //       16563, 32, 76511, 32, 196500, 453240, 220, 0, 1, 1, 69522, 11687, 0, 1,
  //       60091, 32, 196500, 453240, 220, 0, 1, 1, 196500, 453240, 220, 0, 1, 1,
  //       806990, 30482, 4, 1927926, 82523, 4, 265318, 0, 4, 0, 85931, 32, 205665,
  //       812, 1, 1, 41182, 32, 212342, 32, 31220, 32, 32696, 32, 43357, 32,
  //       32247, 32, 38314, 32, 57996947, 18975, 10
  //     ],
  //     PlutusV2: [
  //       205665, 812, 1, 1, 1000, 571, 0, 1, 1000, 24177, 4, 1, 1000, 32, 117366,
  //       10475, 4, 23000, 100, 23000, 100, 23000, 100, 23000, 100, 23000, 100,
  //       23000, 100, 100, 100, 23000, 100, 19537, 32, 175354, 32, 46417, 4,
  //       221973, 511, 0, 1, 89141, 32, 497525, 14068, 4, 2, 196500, 453240, 220,
  //       0, 1, 1, 1000, 28662, 4, 2, 245000, 216773, 62, 1, 1060367, 12586, 1,
  //       208512, 421, 1, 187000, 1000, 52998, 1, 80436, 32, 43249, 32, 1000, 32,
  //       80556, 1, 57667, 4, 1000, 10, 197145, 156, 1, 197145, 156, 1, 204924,
  //       473, 1, 208896, 511, 1, 52467, 32, 64832, 32, 65493, 32, 22558, 32,
  //       16563, 32, 76511, 32, 196500, 453240, 220, 0, 1, 1, 69522, 11687, 0, 1,
  //       60091, 32, 196500, 453240, 220, 0, 1, 1, 196500, 453240, 220, 0, 1, 1,
  //       1159724, 392670, 0, 2, 806990, 30482, 4, 1927926, 82523, 4, 265318, 0,
  //       4, 0, 85931, 32, 205665, 812, 1, 1, 41182, 32, 212342, 32, 31220, 32,
  //       32696, 32, 43357, 32, 32247, 32, 38314, 32, 35892428, 10, 57996947,
  //       18975, 10, 38887044, 32947, 10
  //     ]
  //   },
  //   price_mem: 0.0577,
  //   price_step: 0.0000721,
  //   max_tx_ex_mem: 14000000,
  //   max_tx_ex_steps: 10000000000,
  //   max_block_ex_mem: 62000000,
  //   max_block_ex_steps: 20000000000,
  max_val_size: asNumber, // 5000,
  //   collateral_percent: 150,
  //   max_collateral_inputs: 3,
  coins_per_utxo_size: asString // '4310'
})
export type EpochParams = ReturnType<typeof asKoiosNetworkParameters>

export const asCardanoInitOptions = asObject({
  koiosApiKey: asOptional(asString),
  blockfrostProjectId: asOptional(asString),
  maestroApiKey: asOptional(asString)
})
export type CardanoInitOptions = ReturnType<typeof asCardanoInitOptions>

//
// Info Payload
//

export const asCardanoInfoPayload = asObject({
  koiosServer: asOptional(asString),
  blockfrostServer: asOptional(asString),
  maestroServer: asOptional(asString)
})
export type CardanoInfoPayload = ReturnType<typeof asCardanoInfoPayload>
