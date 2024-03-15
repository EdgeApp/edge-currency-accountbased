import {
  asArray,
  asCodec,
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
