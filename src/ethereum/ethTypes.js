/**
 * Created by paul on 8/26/17.
 */
// @flow

import {
  asArray,
  asBoolean,
  asEither,
  asMap,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'

export type EthereumInitOptions = {
  blockcypherApiKey?: string,
  etherscanApiKey?: string | string[],
  infuraProjectId?: string,
  blockchairApiKey?: string,
  alethioApiKey?: string,
  amberdataApiKey?: string,
  ethGasStationApiKey?: string,
  alchemyApiKey?: string
}

export type EthereumSettings = {
  etherscanApiServers: string[],
  blockcypherApiServers: string[],
  blockbookServers: string[],
  iosAllowedTokens: { [currencyCode: string]: boolean }
}

type EthereumFeesGasLimit = {
  regularTransaction: string,
  tokenTransaction: string
}

export type EthereumFeesGasPrice = {
  lowFee: string,
  standardFeeLow: string,
  standardFeeHigh: string,

  // The amount of wei which will be charged the standardFeeLow
  standardFeeLowAmount: string,

  // The amount of wei which will be charged the standardFeeHigh
  standardFeeHighAmount: string,
  highFee: string
}

export type EthereumFee = {
  gasLimit: EthereumFeesGasLimit,
  gasPrice?: EthereumFeesGasPrice
}

export type EthereumFees = {
  [address: string]: EthereumFee
}

export type EthereumCalcedFees = {
  gasPrice: string,
  gasLimit: string,
  useDefaults: boolean
}

export type LastEstimatedGasLimit = {
  publicAddress: string,
  contractAddress: string | void,
  gasLimit: string
}

export const asEtherscanTokenTransaction = asObject({
  blockNumber: asString,
  timeStamp: asString,
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  to: asString,
  from: asString,
  value: asString,
  nonce: asString,
  gasPrice: asString,
  gas: asString,
  cumulativeGasUsed: asString,
  gasUsed: asString,
  confirmations: asString,
  contractAddress: asString,
  tokenName: asString,
  tokenSymbol: asString,
  tokenDecimal: asString
})

export type EtherscanTokenTransaction = $Call<
  typeof asEtherscanTokenTransaction
>

export const asEtherscanTransaction = asObject({
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  blockNumber: asString,
  timeStamp: asString,
  gasPrice: asString,
  gasUsed: asString,
  value: asString,
  nonce: asString,
  from: asString,
  to: asString,
  gas: asString,
  isError: asString,
  cumulativeGasUsed: asString,
  confirmations: asOptional(asString)
})

export type EtherscanTransaction = $Call<typeof asEtherscanTransaction>

export const asEtherscanInternalTransaction = asObject({
  hash: asOptional(asString),
  transactionHash: asOptional(asString),
  blockNumber: asString,
  timeStamp: asString,
  gasUsed: asString,
  value: asString,
  from: asString,
  to: asString,
  gas: asString,
  isError: asString,
  contractAddress: asOptional(asString)
})

export type EtherscanInternalTransaction = $Call<
  typeof asEtherscanInternalTransaction
>

export type EthereumTxOtherParams = {
  from: string[],
  to: string[],
  gas: string,
  gasPrice: string,
  gasUsed: string,
  cumulativeGasUsed?: string,
  errorVal: number,
  tokenRecipientAddress: string | null,
  nonceUsed?: string,
  rbfTxid?: string,
  data?: string | null
}

export type EthereumWalletOtherData = {
  nextNonce: string,
  unconfirmedNextNonce: string,
  networkFees: EthereumFees
}

export type AlethioTokenTransferAttributes = {
  blockCreationTime: number,
  symbol: string,
  fee: string | void,
  value: string,
  globalRank: number[]
}

export type AlethioTransactionDataObj = {
  data: { id: string },
  links: { related: string }
}

export type AlethioTransactionRelationships = {
  from: AlethioTransactionDataObj,
  to: AlethioTransactionDataObj,
  transaction: AlethioTransactionDataObj,
  token: AlethioTransactionDataObj
}

export type AlethioTokenTransfer = {
  type: string,
  attributes: AlethioTokenTransferAttributes,
  relationships: AlethioTransactionRelationships
}

export const asBlockbookBlockHeight = asObject({
  blockbook: asObject({
    bestHeight: asNumber
  })
})

export type BlockbookBlockHeight = $Call<typeof asBlockbookBlockHeight>

export const asBlockbookTokenTransfer = asObject({
  from: asString,
  to: asString,
  symbol: asString,
  value: asString,
  token: asString
})

export type BlockbookTokenTransfer = $Call<typeof asBlockbookTokenTransfer>

export const asBlockbookTx = asObject({
  txid: asString,
  vin: asArray(asObject({ addresses: asArray(asString) })),
  vout: asArray(asObject({ addresses: asArray(asString) })),
  blockHeight: asNumber,
  value: asString,
  blockTime: asNumber,
  tokenTransfers: asOptional(asArray(asBlockbookTokenTransfer)),
  ethereumSpecific: asObject({
    status: asNumber,
    gasLimit: asNumber,
    gasUsed: asNumber,
    gasPrice: asString
  })
})

export type BlockbookTx = $Call<typeof asBlockbookTx>

export const asBlockbookTokenBalance = asObject({
  symbol: asString,
  contract: asString,
  balance: asString
})

export type BlockbookTokenBalance = $Call<typeof asBlockbookTokenBalance>

export const asBlockbookAddress = asObject({
  page: asNumber,
  totalPages: asNumber,
  itemsOnPage: asNumber,
  balance: asString,
  unconfirmedBalance: asString,
  unconfirmedTxs: asNumber,
  transactions: asUnknown,
  nonce: asString,
  tokens: asUnknown
})

export type BlockbookAddress = $Call<typeof asBlockbookAddress>

export const asAlethioAccountsTokenTransfer = asObject({
  type: asString,
  attributes: asObject({
    fee: asOptional(asString),
    value: asString,
    blockCreationTime: asNumber,
    symbol: asString,
    globalRank: asArray(asNumber)
  }),
  relationships: asObject({
    token: asObject({
      data: asObject({
        id: asString
      }),
      links: asObject({
        related: asString
      })
    }),
    from: asObject({
      data: asObject({
        id: asString
      }),
      links: asObject({
        related: asString
      })
    }),
    to: asObject({
      data: asObject({
        id: asString
      }),
      links: asObject({
        related: asString
      })
    }),
    transaction: asObject({
      data: asObject({
        id: asString
      }),
      links: asObject({
        related: asString
      })
    })
  }),
  links: asObject({
    next: asString
  }),
  meta: asObject({
    page: asObject({
      hasNext: asBoolean
    })
  })
})

export type AlethioAccountsTokenTransfer = $Call<
  typeof asAlethioAccountsTokenTransfer
>

export const asFetchGetAlethio = asObject({
  data: asArray(asAlethioAccountsTokenTransfer),
  links: asObject({
    next: asString
  }),
  meta: asObject({
    page: asObject({
      hasNext: asBoolean
    })
  })
})

export type FetchGetAlethio = $Call<typeof asFetchGetAlethio>

export const asBlockChairAddress = asObject({
  balance: asString,
  token_address: asString,
  token_symbol: asString
})

export type BlockChairAddress = $Call<typeof asBlockChairAddress>

export const asCheckTokenBalBlockchair = asObject({
  data: asMap(
    asObject({
      address: asObject({
        balance: asString
      }),
      layer_2: asObject({
        erc_20: asArray(asOptional(asString))
      })
    })
  )
})

export type CheckTokenBalBlockchair = $Call<typeof asCheckTokenBalBlockchair>

export type AmberdataTx = {|
  hash: string,
  timestamp: string,
  blockNumber: string,
  value: string,
  fee: string,
  gasLimit: string,
  gasPrice: string,
  gasUsed: string,
  cumulativeGasUsed: string,
  from: Array<{ address: string }>,
  to: Array<{ address: string }>
|}

export const asAmberdataAccountsTx = asObject({
  hash: asString,
  timestamp: asString,
  blockNumber: asString,
  value: asString,
  fee: asString,
  gasLimit: asString,
  gasPrice: asString,
  gasUsed: asString,
  cumulativeGasUsed: asString,
  from: asArray(
    asObject({
      address: asString
    })
  ),
  to: asArray(
    asObject({
      address: asString
    })
  )
})

export type AmberdataAccountsTx = $Call<typeof asAmberdataAccountsTx>

export const asAmberdataAccountsFuncs = asObject({
  transactionHash: asString,
  timestamp: asString,
  blockNumber: asString,
  value: asString,
  initialGas: asString,
  leftOverGas: asString,
  from: asObject({ address: asString }),
  to: asArray(asObject({ address: asString }))
})

export type AmberdataAccountsFuncs = $Call<typeof asAmberdataAccountsFuncs>

export const asFetchGetAmberdataApiResponse = asObject({
  payload: asObject({
    records: asArray(asEither(asAmberdataAccountsTx, asAmberdataAccountsFuncs))
  })
})

export type FetchGetAmberdataApiResponse = $Call<
  typeof asFetchGetAmberdataApiResponse
>

export type AmberdataInternalTx = {|
  transactionHash: string,
  timestamp: string,
  blockNumber: string,
  value: string,
  initialGas: string,
  leftOverGas: string,
  from: { address: string },
  to: Array<{ address: string }>
|}

export const asEtherscanGetAccountBalance = asObject({
  result: asString
})

export type EtherscanGetAccountBalance = $Call<
  typeof asEtherscanGetAccountBalance
>

export const asCheckTokenBalRpc = asObject({
  result: asString
})

export type CheckTokenBalRpc = $Call<typeof asCheckTokenBalRpc>
