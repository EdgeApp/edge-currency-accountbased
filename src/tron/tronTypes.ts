import { asMaybe, asNumber, asObject, asString, asTuple } from 'cleaners'

export interface TronSettings {
  tronApiServers: string[]
  tronNodeServers: string[]
  defaultFeeLimit: number
}

export interface TxQueryCache {
  txid: string
  timestamp: number
}

export interface ReferenceBlock {
  hash: string
  number: number
  timestamp: number
}

export interface TronAccountResources {
  bandwidth: number
  energy: number
}

export interface TronOtherdata {
  lastAddressQueryHeight: number
  mostRecentTxid: string
  txQueryCache: {
    mainnet: TxQueryCache
    trc20: TxQueryCache
  }
}

export const asTronBlockHeight = asObject({
  blockID: asString, // "0000000002bcfcd64f36c254e7161b145f25f1e84e874d213cc36b223c830966"
  block_header: asObject({
    raw_data: asObject({
      number: asNumber,
      timestamp: asNumber
    })
  })
})

export const asAccountResources = asObject({
  freeNetUsed: asMaybe(asNumber, 0), // 983,
  freeNetLimit: asNumber, // 1500,
  EnergyLimit: asMaybe(asNumber, 0) // 474699462,
})

export const asTRXBalance = asObject({
  // latest_opration_time: asNumber, // 1667960226000
  // owner_permission: asObject({
  //   keys: asArray(
  //     asObject({
  //       address: asString, // 'TVLGjurAk9iYb1HUzHTt9VWS343xWnwGjm'
  //       weight: asNumber // 1
  //     })
  //   ),
  //   threshold: asNumber, // 1,
  //   permission_name: asValue('owner')
  // }),
  // free_asset_net_usageV2: asArray(
  //   asObject({
  //     value: asNumber, // 0
  //     key: asString // '1004801'
  //   })
  // ),
  // free_net_usage: asMaybe(asNumber, 0), // 1362
  // account_resource: asObject({
  //   latest_consume_time_for_energy: asNumber // 1667960226000
  // }),
  // active_permission: asArray(
  //   asObject({
  //     operations: asString, // '7fff1fc0033e0300000000000000000000000000000000000000000000000000'
  //     keys: asArray(
  //       asObject({
  //         address: asString, // 'TVLGjurAk9iYb1HUzHTt9VWS343xWnwGjm'
  //         weight: asNumber // 1
  //       })
  //     ),
  //     threshold: asNumber, // 1
  //     id: asNumber, // 2
  //     type: asString, // 'Active'
  //     permission_name: asString // 'active'
  //   })
  // ),
  // assetV2: asArray(
  //   asObject({
  //     value: asNumber, // 3330
  //     key: asString // '1001611'
  //   })
  // ),
  // address: asString, // '41d4663f01b208b180015ec840b5228df7e69150f0'
  balance: asMaybe(asNumber, 0) // 102213111
  // create_time: asNumber, // 1654096560000
  // trc20: asArray(
  //   asObject(asString) // [{ TJ7C9ajLYi5TD6zcuHWxGsLXLHfEpQV1m4: '1499997888000000000000000' }]
  // )
  // latest_consume_free_time: asNumber // 1667957493000
})

export const asTRC20Balance = asObject({
  // "result": {
  //     "result": true
  // },
  // "energy_used": 935,
  constant_result: asTuple(asString) // '0000000000000000000000000000000000000000000000000000001013d707c7'
  // "transaction": {
  //     "ret": [
  //         {}
  //     ],
  //     "visible": false,
  //     "txID": "b35e43b18a152c2ed7b8c03cf8d67ae97ebf37d810cf68330e5dadb8b104db8d",
  //     "raw_data": {
  //         "contract": [
  //             {
  //                 "parameter": {
  //                     "value": {
  //                         "data": "70a08231000000000000000000000041d0944e8407299d9e2bdc4917cfd33f221f1349e7",
  //                         "owner_address": "41d0944e8407299d9e2bdc4917cfd33f221f1349e7",
  //                         "contract_address": "41a614f803b6fd780986a42c78ec9c7f77e6ded13c"
  //                     },
  //                     "type_url": "type.googleapis.com/protocol.TriggerSmartContract"
  //                 },
  //                 "type": "TriggerSmartContract"
  //             }
  //         ],
  //         "ref_block_bytes": "92b0",
  //         "ref_block_hash": "20482bcd5c141696",
  //         "expiration": 1668123789000,
  //         "timestamp": 1668123729781
  //     },
  //     "raw_data_hex": "0a0292b0220820482bcd5c14169640c88db49fc6305a8e01081f1289010a31747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e54726967676572536d617274436f6e747261637412540a1541d0944e8407299d9e2bdc4917cfd33f221f1349e7121541a614f803b6fd780986a42c78ec9c7f77e6ded13c222470a08231000000000000000000000041d0944e8407299d9e2bdc4917cfd33f221f1349e770f5beb09fc630"
  // }
})
