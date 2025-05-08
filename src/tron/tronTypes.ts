import {
  asArray,
  asBoolean,
  asEither,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asTuple,
  asUnknown,
  asValue,
  Cleaner
} from 'cleaners'
import type { JsonObject } from 'edge-core-js/types'

import { asSafeCommonWalletInfo } from '../common/types'

export const asTronInitOptions = asObject({
  smartPayPublicAddress: asOptional(
    asString,
    'TUmgPbM5J6om7Z2PJjzrbSEbXit84ZhVCj'
  ),
  smartPayUserId: asOptional(asString, 'edge')
})

export type TronInitOptions = ReturnType<typeof asTronInitOptions>

export interface TronNetworkInfo {
  tronApiServers: string[]
  tronNodeServers: string[]
  defaultDerivationPath: string
  defaultFeeLimit: number
  defaultFreezeDurationInDays: number
  trc20BalCheckerContract: string
}

export const asTxQueryCache = asObject({
  txid: asString,
  timestamp: asNumber
})

export type TxQueryCache = ReturnType<typeof asTxQueryCache>

export interface ReferenceBlock {
  hash: string
  number: number
  timestamp: number
}

export interface TronAccountResources {
  BANDWIDTH: number
  ENERGY: number
}

export interface TronNetworkFees {
  getCreateAccountFee: number
  getTransactionFee: number
  getEnergyFee: number
  getMemoFee: number
}

export const asTronWalletOtherData = asObject({
  // A one-time flag to re-process transactions to add new data
  txListReset: asMaybe(asBoolean, true),

  trc20FirstQueryCache: asMaybe(asObject(asBoolean), () => ({})),
  txQueryCache: asMaybe(asTxQueryCache, () => ({
    txid: '',
    timestamp: 0
  }))
})

export type TronWalletOtherData = ReturnType<typeof asTronWalletOtherData>

export interface TronTransferParams {
  toAddress: string
  currencyCode: string
  nativeAmount: string
  contractAddress?: string
  data?: string
  note?: string
}

const asEnergy = asValue('ENERGY')
const asBandwidth = asValue('BANDWIDTH')
const asResource = asEither(asEnergy, asBandwidth)
type Resource = ReturnType<typeof asResource>

const asEnergyV2 = asValue('ENERGY_V2')
const asBandwidthV2 = asValue('BANDWIDTH_V2')
const asResourceV2 = asEither(asEnergyV2, asBandwidthV2)
type ResourceV2 = ReturnType<typeof asResourceV2>

export interface TronUnfreezeAction {
  type: 'remove'
  params: { resource: Resource }
}

export const asTronUnfreezeAction = asObject<TronUnfreezeAction>({
  type: asValue('remove'),
  params: asObject({
    resource: asResource
  })
})

export interface TronFreezeV2Action {
  type: 'addV2'
  params: { nativeAmount: string; resource: ResourceV2 }
}

export const asTronFreezeV2Action = asObject<TronFreezeV2Action>({
  type: asValue('addV2'),
  params: asObject({
    nativeAmount: asString,
    resource: asResourceV2
  })
})

export interface TronUnfreezeV2Action {
  type: 'removeV2'
  params: { nativeAmount: string; resource: ResourceV2 }
}

export const asTronUnfreezeV2Action = asObject<TronUnfreezeV2Action>({
  type: asValue('removeV2'),
  params: asObject({
    nativeAmount: asString,
    resource: asResourceV2
  })
})

export interface TronWithdrawExpireUnfreezeAction {
  type: 'withdrawExpireUnfreeze'
}

export const asTronWithdrawExpireUnfreezeAction =
  asObject<TronWithdrawExpireUnfreezeAction>({
    type: asValue('withdrawExpireUnfreeze')
  })

export interface CalcTxFeeOpts {
  receiverAddress?: string
  unsignedTxHex: string
  note?: string
  tokenOpts?: {
    contractAddress: string
    data: string
  }
}

export interface TxBuilderParams {
  contractJson: JsonObject
  feeLimit?: number
  note?: string

  // Useful for local caches
  toAddress?: string
  contractAddress?: string
}

export interface TronTransaction {
  transaction: any
  transactionHex: string
}

//  {"chainParameter":[{"key":"getMaintenanceTimeInterval","value":21600000},{"key":"getAccountUpgradeCost","value":9999000000},{"key":"getCreateAccountFee","value":100000},{"key":"getTransactionFee","value":1000},{"key":"getAssetIssueFee","value":1024000000},{"key":"getWitnessPayPerBlock","value":16000000},{"key":"getWitnessStandbyAllowance","value":115200000000},{"key":"getCreateNewAccountFeeInSystemContract","value":1000000},{"key":"getCreateNewAccountBandwidthRate","value":1},{"key":"getAllowCreationOfContracts","value":1},{"key":"getRemoveThePowerOfTheGr","value":-1},{"key":"getEnergyFee","value":420},{"key":"getExchangeCreateFee","value":1024000000},{"key":"getMaxCpuTimeOfOneTx","value":80},{"key":"getAllowUpdateAccountName"},{"key":"getAllowSameTokenName","value":1},{"key":"getAllowDelegateResource","value":1},{"key":"getTotalEnergyLimit","value":90000000000},{"key":"getAllowTvmTransferTrc10","value":1},{"key":"getTotalEnergyCurrentLimit","value":90000000000},{"key":"getAllowMultiSign","value":1},{"key":"getAllowAdaptiveEnergy"},{"key":"getTotalEnergyTargetLimit","value":6250000},{"key":"getTotalEnergyAverageUsage"},{"key":"getUpdateAccountPermissionFee","value":100000000},{"key":"getMultiSignFee","value":1000000},{"key":"getAllowAccountStateRoot"},{"key":"getAllowProtoFilterNum"},{"key":"getAllowTvmConstantinople","value":1},{"key":"getAllowTvmSolidity059","value":1},{"key":"getAllowTvmIstanbul","value":1},{"key":"getAllowShieldedTRC20Transaction","value":1},{"key":"getForbidTransferToContract"},{"key":"getAdaptiveResourceLimitTargetRatio","value":10},{"key":"getAdaptiveResourceLimitMultiplier","value":1000},{"key":"getChangeDelegation","value":1},{"key":"getWitness127PayPerBlock","value":160000000},{"key":"getAllowMarketTransaction"},{"key":"getMarketSellFee"},{"key":"getMarketCancelFee"},{"key":"getAllowPBFT"},{"key":"getAllowTransactionFeePool"},{"key":"getMaxFeeLimit","value":15000000000},{"key":"getAllowOptimizeBlackHole","value":1},{"key":"getAllowNewResourceModel"},{"key":"getAllowTvmFreeze"},{"key":"getAllowTvmVote","value":1},{"key":"getAllowTvmLondon","value":1},{"key":"getAllowTvmCompatibleEvm"},{"key":"getAllowAccountAssetOptimization"},{"key":"getFreeNetLimit","value":600},{"key":"getTotalNetLimit","value":43200000000},{"key":"getAllowHigherLimitForMaxCpuTimeOfOneTx","value":1},{"key":"getAllowAssetOptimization","value":1},{"key":"getAllowNewReward","value":1},{"key":"getMemoFee","value":1000000},{"key":"getAllowDelegateOptimization","value":1},{"key":"getUnfreezeDelayDays","value":14},{"key":"getAllowOptimizedReturnValueOfChainId","value":1},{"key":"getAllowDynamicEnergy","value":1},{"key":"getDynamicEnergyThreshold","value":3000000000},{"key":"getDynamicEnergyIncreaseFactor","value":2000},{"key":"getDynamicEnergyMaxFactor","value":12000},{"key":"getAllowTvmShangHai","value":1},{"key":"getAllowCancelAllUnfreezeV2","value":1},{"key":"getMaxDelegateLockPeriod","value":864000}]}
export const asChainParams = asObject({
  chainParameter: asArray(
    asObject({ key: asString, value: asOptional(asNumber) })
  )
})

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
  EnergyUsed: asMaybe(asNumber, 0),
  EnergyLimit: asMaybe(asNumber, 0) // 474699462,
})

const asUnfrozenV2 = asArray(
  asEither(
    asObject({
      type: asValue('ENERGY'),
      unfreeze_amount: asNumber,
      unfreeze_expire_time: asNumber
    }),
    asObject({ unfreeze_amount: asNumber, unfreeze_expire_time: asNumber })
  )
)

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
  frozen: asOptional(
    asTuple(
      asObject({
        frozen_balance: asNumber,
        expire_time: asNumber
      })
    )
  ),
  account_resource: asObject({
    // energy_usage: 315,
    frozen_balance_for_energy: asOptional(
      asObject({
        frozen_balance: asNumber,
        expire_time: asNumber
      })
    )
    // latest_consume_time_for_energy: asNumber // 1667960226000
  }),
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
  frozenV2: asTuple(
    // bandwidth
    asObject({
      amount: asOptional(asNumber)
    }),
    asObject({
      type: asEnergy,
      amount: asOptional(asNumber)
    }),
    asObject({ type: asValue('TRON_POWER') })
  ),
  unfrozenV2: asMaybe(asUnfrozenV2, () => []),
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

export const asTransaction = asObject({
  ret: asArray(
    asObject({
      contractRet: asString, // 'SUCCESS'
      fee: asNumber // 1100000
    })
  ),
  // signature: "02e36d63f2f05ea1a25b207eaf2ef2ff56be90dc8a4eaa0cac87206ce05ea61f44e894ee04add31504297cdafb539d2d999e1a56c3bce58b6e2c9a25340bf49101",
  txID: asString, // 877db44a4aca5ae71cc5fe7d53a3316ad05ed35cdcc2d7f642061a3900aa5c1d
  // "net_usage": 0,
  // "raw_data_hex": "0a0230292208cf53f47765aeb93840c8c0b5c9b6305a66080112620a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412310a15413282aad9080d202829c8facad65a2affa26781f0121541c17c2daa0e750051c4c109e01fa54da97a06805d18e807709d83b2c9b630",
  // "net_fee": 100000,
  // "energy_usage": 0,
  unfreeze_amount: asOptional(asNumber), // for unfreeze txs only
  blockNumber: asNumber, // 44445757
  block_timestamp: asNumber, // 1663916871000
  // energy_fee: asNumber, // 0
  // energy_usage_total: asNumber // 0
  raw_data: asObject({
    data: asOptional(asString),
    contract: asArray(asUnknown)
    // ref_block_bytes: "302exp9",
    // ref_block_hash: "cf53f47765aeb938",
    // expiration: 1663916925000,
    // timestamp: 1663916867997
  })
  // "internal_transactions": []
})

export const asTRC20Transaction = asObject({
  transaction_id: asString, // "e4d81b00b274b7b5b309fc993964bd12ff38087526d68ab76705f9e5ada2005d",
  token_info: asObject({
    // symbol: asString, // "SUNOLD",
    address: asString // "TKkeiboTkxXKJpbmVFbv4a8ov5rAfRDMf9",
    // decimals: asNumber, // 18,
    // name: asString // "SUNOLD"
  }),
  block_timestamp: asNumber, // 1601020668000,
  from: asString, // "TJmmqjb1DK9TTZbQXzRQ2AuA94z4gKAPFh",
  to: asString, // "TUEYcyPAqc4hTg1fSuBCPc18vGWcJDECVw",
  type: asString, // "Transfer",
  value: asString // "1000"
})
export const asTransactionInfoById = asObject({
  // id: '7657448ab50db1d470cf48b519a91eb6b77e1f94143e28cc533ade7184c30f7e',
  blockNumber: asNumber
  // blockTimeStamp: 1742286609000,
  // contractResult: [
  //   '0000000000000000000000000000000000000000000000000000000000000001'
  // ],
  // contract_address: '4118fd0626daf3af02389aef3ed87db9c33f638ffa',
  // receipt: {
  //   energy_usage: 28532,
  //   energy_usage_total: 28532,
  //   net_usage: 346,
  //   result: 'SUCCESS'
  // },
  // log: [
  //   {
  //     address: '18fd0626daf3af02389aef3ed87db9c33f638ffa',
  //     topics: [
  //       'ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
  //       '000000000000000000000000e07466e9a9faf48351f2d93ebd9d4a139a54ae8b',
  //       '000000000000000000000000f615d248adf4d6941de111f6d7a098dc44266fbe'
  //     ],
  //     data: '000000000000000000000000000000000000000000000010396bb7e38e8fb400'
  //   }
  // ]
})
export const asTransactionById = asObject({
  ret: asArray(
    asObject({
      contractRet: asString, // 'SUCCESS'
      fee: asOptional(asNumber, 0) // 1100000
    })
  ),
  // signature: [
  //   'a0a5d0c012a6de298c12e88998b50e592a693c47700585a30983760fcff176b9d7c74b320e73e6f164a3dfc09da3ccc8594a7ea4dee0128aab485f0ab6221c0e01'
  // ],
  // txID: 'b2b8e32a745b7a9332ac9229086683907265e4328706c238bbf3232a134782a1',
  raw_data: asObject({
    data: asOptional(asString),
    contract: asArray(asUnknown)
    // contract: [
    //   {
    //     parameter: {
    //       value: {
    //         data: 'a9059cbb0000000000000000000000004398bb6f3da46edfa5a3bc5eb351babba441a5d1000000000000000000000000000000000000000000000001ccbe18194ef80000',
    //         owner_address: '41f615d248adf4d6941de111f6d7a098dc44266fbe',
    //         contract_address: '4118fd0626daf3af02389aef3ed87db9c33f638ffa'
    //       },
    //       type_url: 'type.googleapis.com/protocol.TriggerSmartContract'
    //     },
    //     type: 'TriggerSmartContract'
    //   }
    // ],
    // ref_block_bytes: '6caf',
    // ref_block_hash: '891a205051e56b23',
    // expiration: 1742286957000,
    // fee_limit: 1000000000,
    // timestamp: 1742286657000
  })
  // raw_data_hex: '0a026caf2208891a205051e56b2340c8d394c3da32520877656e206e6f74655aae01081f12a9010a31747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e54726967676572536d617274436f6e747261637412740a1541f615d248adf4d6941de111f6d7a098dc44266fbe12154118fd0626daf3af02389aef3ed87db9c33f638ffa2244a9059cbb0000000000000000000000004398bb6f3da46edfa5a3bc5eb351babba441a5d1000000000000000000000000000000000000000000000001ccbe18194ef8000070e8ab82c3da3290018094ebdc03'
})

export const asTRXTransferContract = asObject({
  parameter: asObject({
    value: asObject({
      amount: asNumber, // 1000
      owner_address: asString, // "413282aad9080d202829c8facad65a2affa26781f0",
      to_address: asString // "41c17c2daa0e750051c4c109e01fa54da97a06805d"
    })
  }),
  type: asValue('TransferContract')
})

export const asTriggerSmartContract = asObject({
  parameter: asObject({
    value: asObject({
      data: asString,
      owner_address: asString,
      contract_address: asString
    })
    // type_url: 'type.googleapis.com/protocol.TriggerSmartContract'
  }),
  type: asValue('TriggerSmartContract')
})

export const asFreezeBalanceContract = asObject({
  parameter: asObject({
    value: asObject({
      // resource: 0,
      // frozen_duration: 3,
      frozen_balance: asNumber,
      resource_type: asResource,
      // resource_value: 0,
      owner_address: asString
    })
    // type_url: 'type.googleapis.com/protocol.FreezeBalanceContract'
  }),
  type: asValue('FreezeBalanceContract')
})

export const asUnfreezeBalanceContract = asObject({
  parameter: asObject({
    value: asObject({
      // resource: 0,,
      resource_type: asResource,
      // resource_value: 0,
      owner_address: asString
    })
    // type_url: 'type.googleapis.com/protocol.FreezeBalanceContract'
  }),
  type: asValue('UnfreezeBalanceContract')
})

export const asFreezeV2BalanceContract = asObject({
  parameter: asObject({
    value: asObject({
      frozen_balance: asNumber,
      owner_address: asString
    })
  }),
  type: asValue('FreezeBalanceV2Contract')
})

export const asUnfreezeV2BalanceContract = asObject({
  parameter: asObject({
    value: asObject({
      unfreeze_balance: asNumber,
      owner_address: asString
    })
  }),
  type: asValue('UnfreezeBalanceV2Contract')
})

export const asWithdrawExpireUnfreezeContract = asObject({
  parameter: asObject({
    value: asObject({
      owner_address: asString
    })
  }),
  type: asValue('WithdrawExpireUnfreezeContract')
})

export interface TronGridQuery<T> {
  data: T[]
  success: boolean
  meta: {
    links?: {
      next: string
    }
    page_size: number
  }
}

export const asTronQuery = <T>(
  cleaner: Cleaner<T>
): Cleaner<TronGridQuery<T>> =>
  asObject({
    data: asArray(cleaner),
    success: asBoolean,
    meta: asObject({
      links: asOptional(
        asObject({
          next: asString // https://api.trongrid.io/v1/accounts/TTcGB9V76XyQUUFoU731mXsYhurrCTfSYy/transactions/?limit=200&min_timestamp=0&order_by=block_timestamp,asc&fingerprint=3wmN1yM3f1BnUF1W2s76jXwZG1cHT81ymdUTHjjhYytpdv4jJ5wzX9LVFPzzPj1nAewD3nmxwkUPK4E4M6cHtMVQeyTaycEgRqBj
        })
      ),
      page_size: asNumber // 200
    })
  })

export const asEstimateEnergy = asObject({
  energy_used: asNumber, // 14650
  energy_penalty: asOptional(asNumber, 0), // 14650
  transaction: asObject({
    ret: asArray(
      asObject({
        ret: asOptional(asString)
      })
    )
  })
})

export const asBroadcastResponse = asObject({
  result: asBoolean,
  txid: asString,
  message: asString
})

export type SafeTronWalletInfo = ReturnType<typeof asSafeTronWalletInfo>
export const asSafeTronWalletInfo = asSafeCommonWalletInfo

export interface TronKeys {
  tronMnemonic?: string
  tronKey: string
  derivationPath?: string
}
export const asTronPrivateKeys = asObject<TronKeys>({
  tronMnemonic: asOptional(asString),
  tronKey: asString,
  derivationPath: asOptional(asString)
})

//
// Info Payload
//

export const asTronInfoPayload = asObject({
  tronApiServers: asOptional(asArray(asString)),
  tronNodeServers: asOptional(asArray(asString))
})
export type TronInfoPayload = ReturnType<typeof asTronInfoPayload>
