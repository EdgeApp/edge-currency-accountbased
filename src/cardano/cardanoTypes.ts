import {
  asArray,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asString,
  asTuple,
  Cleaner
} from 'cleaners'

import { asWalletInfo } from '../common/types'

export interface CardanoNetworkInfo {
  networkId: number
  rpcServer: string
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
}
export const asCardanoPrivateKeys = (
  pluginId: string
): Cleaner<CardanoPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return { mnemonic: clean[`${pluginId}Mnemonic`] }
    },
    clean => {
      return { [`${pluginId}Mnemonic`]: clean.mnemonic }
    }
  )
}

export const asKoiosBlockheight = asTuple(
  asObject({
    // hash: 'e8c6992d52cd74b577b79251e0351be25070797a0dbc486b2c284d0bf7aeea9c',
    // epoch_no: asNumber, // 321,
    // abs_slot: 53384242,
    // epoch_slot: 75442,
    block_no: asNumber // 42325043,
    // block_time: 1506635091
  })
)

export const asKoiosBalance = asArray(
  asObject({
    // address: 'addr1qxkfe8s6m8qt5436lec3f0320hrmpppwqgs2gah4360krvyssntpwjcz303mx3h4avg7p29l3zd8u3jyglmewds9ezrqdc3cxp',
    balance: asString, // 10723473983,
    // stake_address: null,
    // script_address: true,
    utxo_set: asArray(
      asObject({
        tx_hash: asString, // 'f144a8264acf4bdfe2e1241170969c930d64ab6b0996a4a45237b623f1dd670e',
        tx_index: asNumber, // 0,
        // block_height: 42325043,
        // block_time: 1506635091,
        value: asString // 157832856,
        // datum_hash:
        //   '5a595ce795815e81d22a1a522cf3987d546dc5bb016de61b002edd63a5413ec4',
        // inline_datum: {
        //   bytes: '19029a',
        //   value: {
        //     int: 666
        //   }
        // },
        // reference_script: {
        //   hash: '67f33146617a5e61936081db3b2117cbf59bd2123748f58ac9678656',
        //   size: 14,
        //   type: 'plutusV1',
        //   bytes: '4e4d01000033222220051200120011',
        //   value: 'null'
        // },
        // asset_list: [
        //   {
        //     policy_id:
        //       'd3501d9531fcc25e3ca4b6429318c2cc374dbdbcf5e99c1c1e5da1ff',
        //     asset_name: '444f4e545350414d',
        //     fingerprint: 'asset1ua6pz3yd5mdka946z8jw2fld3f8d0mmxt75gv9',
        //     decimals: 0,
        //     quantity: 1
        //   }
        // ]
      })
    )
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
