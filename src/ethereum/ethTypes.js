/**
 * Created by paul on 8/26/17.
 */
// @flow

import WalletConnect from '@walletconnect/client'
import {
  asArray,
  asBoolean,
  asEither,
  asMap,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  asValue
} from 'cleaners'
import type { EdgeSpendInfo, EdgeTransaction } from 'edge-core-js/types'

export type EthereumInitOptions = {
  blockcypherApiKey?: string,
  evmScanApiKey?: string | string[],
  infuraProjectId?: string,
  blockchairApiKey?: string,
  alethioApiKey?: string,
  amberdataApiKey?: string,
  gasStationApiKey?: string,
  quiknodeApiKey?: string,
  alchemyApiKey?: string
}

export type EthereumSettings = {|
  alethioApiServers: string[],
  feeUpdateFrequencyMs?: number,
  alethioCurrencies: {
    native: string,
    token: string
  } | null,
  amberdataApiServers: string[],
  amberDataBlockchainId: string,
  amberdataRpcServers: string[],
  blockbookServers: string[],
  blockchairApiServers: string[],
  blockcypherApiServers: string[],
  chainParams: {
    chainId: number,
    name: string
  },
  supportsEIP1559?: boolean,
  checkUnconfirmedTransactions: boolean,
  // eslint-disable-next-line no-use-before-define
  defaultNetworkFees: EthereumFees,
  ercTokenStandard: string,
  evmScanApiServers: string[],
  ethGasStationUrl: string | null,
  hdPathCoinType: number,
  iosAllowedTokens: {
    [currencyCode: string]: true
  },
  pluginMnemonicKeyName: string,
  pluginRegularKeyName: string,
  rpcServers: string[],
  uriNetworks: string[]
|}

export const asEthereumFeesGasLimit = asObject({
  regularTransaction: asString,
  tokenTransaction: asString
})

export type EthereumFeesGasLimit = $Call<typeof asEthereumFeesGasLimit>

export const asEthereumFeesGasPrice = asObject({
  highFee: asString,
  lowFee: asString,

  // Represents the default "Optimized" standard fee option where
  // standardFeeLow is the fee for a transaction with a small
  // quantity and standardFeeHigh is the fee for a large transaction.
  standardFeeLow: asString,
  standardFeeHigh: asString,

  // Defines what is considered a "small" and "large" transaction
  // for the above two fee options.
  standardFeeLowAmount: asString,
  standardFeeHighAmount: asString
})

export type EthereumFeesGasPrice = $Call<typeof asEthereumFeesGasPrice>

export const asEthereumBaseFeeMultiplier = asObject({
  lowFee: asString,
  standardFeeLow: asString,
  standardFeeHigh: asString,
  highFee: asString
})

export type EthereumBaseMultiplier = $Call<typeof asEthereumBaseFeeMultiplier>

export const asEthereumFee = asObject({
  baseFeeMultiplier: asOptional(asEthereumBaseFeeMultiplier),
  gasLimit: asEthereumFeesGasLimit,
  gasPrice: asOptional(asEthereumFeesGasPrice),
  minPriorityFee: asOptional(asString)
})

export type EthereumFee = $Call<typeof asEthereumFee>

export const asEthereumFees = asObject<EthereumFee>(asEthereumFee)

export type EthereumFees = $Call<typeof asEthereumFees>

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

export const asEvmScancanTokenTransaction = asObject({
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

export type EvmScanTokenTransaction = $Call<typeof asEvmScancanTokenTransaction>

export const asEvmScanTransaction = asObject({
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

export type EvmScanTransaction = $Call<typeof asEvmScanTransaction>

export const asEvmScanInternalTransaction = asObject({
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

export type EvmScanInternalTransaction = $Call<
  typeof asEvmScanInternalTransaction
>

export const asEvmScanGasResponseResult = asObject({
  LastBlock: asString,
  SafeGasPrice: asString,
  ProposeGasPrice: asString,
  FastGasPrice: asString,

  // Etherscan
  suggestBaseFee: asMaybe(asString),
  gasUsedRatio: asMaybe(asArray(asString))
})

export const asEvmScanGasResponse = asObject({
  status: asString,
  message: asString,
  result: asEither(asString, asObject(asEvmScanGasResponseResult))
})

export type EvmScanGasResponse = $Call<typeof asEvmScanGasResponse>

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
  transactions: asMaybe(asArray(asBlockbookTx), []),
  nonce: asString,
  tokens: asMaybe(asArray(asBlockbookTokenBalance), [])
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

export const asCheckBlockHeightBlockchair = asObject({
  data: asObject({
    blocks: asNumber
  })
})

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

export const asRpcResultString = asObject({
  result: asString
})

export type RpcResultString = $Call<typeof asRpcResultString>

export type TxRpcParams = {
  from?: string,
  to: string,
  data: string,
  gas: string,
  gasPrice: string,
  value?: string,
  nonce?: string
}

type EIP712TypeData = {
  name: string,
  type: string
}

export type EIP712TypedDataParam = {
  types: {
    EIP712Domain: [EIP712TypeData],
    [type: string]: [EIP712TypeData]
  },
  primaryType: string,
  domain: Object,
  message: Object
}

export type EthereumUtils = {
  signMessage: (message: string) => string,
  signTypedData: (typedData: Object) => string,
  txRpcParamsToSpendInfo: (
    params: TxRpcParams,
    currencyCode: string
  ) => EdgeSpendInfo
}

export const asWcProps = asObject({
  uri: asString,
  language: asMaybe(asString),
  token: asMaybe(asString)
})

export type WcProps = $Call<typeof asWcProps>

export const asWcRpcPayload = asObject({
  id: asEither(asString, asNumber),
  method: asValue(
    'personal_sign',
    'eth_sign',
    'eth_signTypedData',
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sendRawTransaction'
  ),
  params: asArray(asUnknown)
})

export type WcRpcPayload = $Call<typeof asWcRpcPayload>

const asWcDappDetails = asObject({
  peerId: asString,
  peerMeta: asObject({
    description: asString,
    url: asString,
    icons: asArray(asString),
    name: asString
  }),
  chainId: asOptional(asNumber, 1)
})

export type WcDappDetails = {
  ...$Call<typeof asWcDappDetails>,
  timeConnected: number
}

export type Dapp = { ...WcProps, ...WcDappDetails, timeConnected: number }

export type WalletConnectors = {
  [uri: string]: {
    connector: WalletConnect,
    wcProps: WcProps,
    dApp: WcDappDetails,
    walletId?: string
  }
}

export const asWcSessionRequestParams = asObject({
  params: asArray(asWcDappDetails)
})

export type EthereumOtherMethods = {
  personal_sign: (params: string[]) => string,
  eth_sign: (params: string[]) => string,
  eth_signTypedData: (params: string[]) => string,
  eth_signTypedData_v4: (params: string[]) => string,
  eth_sendTransaction: (
    params: TxRpcParams,
    currencyCode: string
  ) => Promise<EdgeTransaction>,
  eth_signTransaction: (
    params: TxRpcParams,
    currencyCode: string
  ) => Promise<EdgeTransaction>,
  eth_sendRawTransaction: (signedTx: string) => Promise<EdgeTransaction>,
  wcInit(wcProps: WcProps): Promise<WcDappDetails>,
  wcConnect: (uri: string, publicKey: string, walletId: string) => void,
  wcDisconnect: (uri: string) => void,
  wcRequestResponse: (
    uri: string,
    approve: boolean,
    payload: WcRpcPayload
  ) => Promise<void>,
  wcGetConnections: () => Dapp[]
}
