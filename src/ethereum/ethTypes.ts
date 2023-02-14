import WalletConnect from '@walletconnect/client'
import {
  asArray,
  asEither,
  asMaybe,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  asValue
} from 'cleaners'
import { EdgeSpendInfo, EdgeTransaction } from 'edge-core-js/types'

export interface EthereumInitOptions {
  blockcypherApiKey?: string
  evmScanApiKey?: string | string[]
  infuraProjectId?: string
  blockchairApiKey?: string
  alethioApiKey?: string
  amberdataApiKey?: string
  gasStationApiKey?: string
  quiknodeApiKey?: string
  alchemyApiKey?: string
}

export interface EthereumNetworkInfo {
  alethioApiServers: string[]
  feeUpdateFrequencyMs?: number
  alethioCurrencies: {
    native: string
    token: string
  } | null
  amberdataApiServers: string[]
  amberDataBlockchainId: string
  amberdataRpcServers: string[]
  blockbookServers: string[]
  blockchairApiServers: string[]
  blockcypherApiServers: string[]
  chainParams: {
    chainId: number
    name: string
  }
  supportsEIP1559?: boolean
  checkUnconfirmedTransactions: boolean
  // eslint-disable-next-line no-use-before-define
  defaultNetworkFees: EthereumFees
  ercTokenStandard: string
  evmScanApiServers: string[]
  ethGasStationUrl: string | null
  hdPathCoinType: number
  iosAllowedTokens: {
    [currencyCode: string]: true
  }
  pluginMnemonicKeyName: string
  pluginRegularKeyName: string
  rpcServers: string[]
  uriNetworks: string[]
}

export const asEthereumFeesGasLimit = asObject({
  minGasLimit: asOptional(asString),
  regularTransaction: asString,
  tokenTransaction: asString
})

export type EthereumFeesGasLimit = ReturnType<typeof asEthereumFeesGasLimit>

export const asEthereumFeesGasPrice = asObject({
  highFee: asString,
  lowFee: asString,
  minGasPrice: asOptional(asString),

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

export type EthereumFeesGasPrice = ReturnType<typeof asEthereumFeesGasPrice>

export const asEthereumBaseFeeMultiplier = asObject({
  lowFee: asString,
  standardFeeLow: asString,
  standardFeeHigh: asString,
  highFee: asString
})

export type EthereumBaseMultiplier = ReturnType<
  typeof asEthereumBaseFeeMultiplier
>

export type KeysOfEthereumBaseMultiplier = keyof EthereumBaseMultiplier

export const asEthereumFee = asObject({
  baseFeeMultiplier: asOptional(asEthereumBaseFeeMultiplier),
  gasLimit: asEthereumFeesGasLimit,
  gasPrice: asOptional(asEthereumFeesGasPrice),
  minPriorityFee: asOptional(asString)
})

export const blankEthereumFee: EthereumFee = {
  baseFeeMultiplier: undefined,
  gasLimit: { minGasLimit: '', regularTransaction: '', tokenTransaction: '' },
  gasPrice: undefined,
  minPriorityFee: undefined
}
export type EthereumFee = ReturnType<typeof asEthereumFee>

export const asEthereumFees = asObject<EthereumFee>(asEthereumFee)

export type EthereumFees = ReturnType<typeof asEthereumFees>

export interface EthereumCalcedFees {
  gasPrice: string
  gasLimit: string
  useDefaults: boolean
}

export interface LastEstimatedGasLimit {
  publicAddress: string
  contractAddress: string | undefined
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
  gasUsed: asString,
  confirmations: asString,
  contractAddress: asString,
  tokenName: asString,
  tokenSymbol: asString,
  tokenDecimal: asString
})

export type EvmScanTokenTransaction = ReturnType<
  typeof asEvmScancanTokenTransaction
>

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
  confirmations: asOptional(asString)
})

export type EvmScanTransaction = ReturnType<typeof asEvmScanTransaction>

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

export type EvmScanInternalTransaction = ReturnType<
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

export type EvmScanGasResponse = ReturnType<typeof asEvmScanGasResponse>

export interface EthereumTxOtherParams {
  from: string[]
  to: string[]
  gas: string
  gasPrice: string
  gasUsed: string
  tokenRecipientAddress?: string
  nonceUsed?: string
  replacedTxid?: string
  data?: string | null
}
export const asEthereumTxOtherParams = asObject<EthereumTxOtherParams>({
  from: asArray(asString),
  to: asArray(asString),
  gas: asString,
  gasPrice: asString,
  gasUsed: asString,
  tokenRecipientAddress: asOptional(asString),
  nonceUsed: asOptional(asString),
  replacedTxid: asOptional(asString),
  data: asOptional(asEither(asString, asNull))
})

export const asEthereumWalletOtherData = asObject({
  nextNonce: asMaybe(asString, '0'),
  unconfirmedNextNonce: asMaybe(asString, '0'),
  networkFees: asMaybe(asEthereumFees, { default: blankEthereumFee })
})

export type EthereumWalletOtherData = ReturnType<
  typeof asEthereumWalletOtherData
>

export interface AlethioTokenTransferAttributes {
  blockCreationTime: number
  symbol: string
  fee: string | undefined
  value: string
  globalRank: number[]
}

export interface AlethioTransactionDataObj {
  data: { id: string }
  links: { related: string }
}

export interface AlethioTransactionRelationships {
  from: AlethioTransactionDataObj
  to: AlethioTransactionDataObj
  transaction: AlethioTransactionDataObj
  token: AlethioTransactionDataObj
}

export interface AlethioTokenTransfer {
  type: string
  attributes: AlethioTokenTransferAttributes
  relationships: AlethioTransactionRelationships
}

export const asBlockbookBlockHeight = asObject({
  blockbook: asObject({
    bestHeight: asNumber
  })
})

export type BlockbookBlockHeight = ReturnType<typeof asBlockbookBlockHeight>

export const asBlockbookTokenBalance = asObject({
  symbol: asString,
  contract: asString,
  balance: asString
})

export type BlockbookTokenBalance = ReturnType<typeof asBlockbookTokenBalance>

export const asBlockbookAddress = asObject({
  balance: asString,
  unconfirmedBalance: asString,
  unconfirmedTxs: asNumber,
  nonce: asString,
  tokens: asMaybe(asArray(asBlockbookTokenBalance), [])
})

export type BlockbookAddress = ReturnType<typeof asBlockbookAddress>

export const asBlockChairAddress = asObject({
  balance: asString,
  token_address: asString,
  token_symbol: asString
})

export type BlockChairAddress = ReturnType<typeof asBlockChairAddress>

export const asCheckTokenBalBlockchair = asObject({
  data: asObject(
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

export type CheckTokenBalBlockchair = ReturnType<
  typeof asCheckTokenBalBlockchair
>

export const asCheckBlockHeightBlockchair = asObject({
  data: asObject({
    blocks: asNumber
  })
})

export const asAmberdataAccountsTx = asObject({
  hash: asString,
  timestamp: asString,
  blockNumber: asString,
  value: asString,
  fee: asString,
  gasLimit: asString,
  gasPrice: asString,
  gasUsed: asString,
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

export const asRpcResultString = asObject({
  result: asString
})

export type RpcResultString = ReturnType<typeof asRpcResultString>

export interface TxRpcParams {
  from?: string
  to: string
  data: string
  gas: string
  gasPrice: string
  value?: string
  nonce?: string
}

interface EIP712TypeData {
  name: string
  type: string
}

export interface EIP712TypedDataParam {
  types: {
    EIP712Domain: [EIP712TypeData]
    [type: string]: [EIP712TypeData]
  }
  primaryType: string
  domain: Object
  message: Object
}

export interface EthereumUtils {
  signMessage: (message: string) => string
  signTypedData: (typedData: Object) => string
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

export type WcProps = ReturnType<typeof asWcProps>

export const asWcRpcPayload = asObject({
  id: asEither(asString, asNumber),
  method: asValue(
    'personal_sign',
    'eth_sign',
    'eth_signTypedData',
    'eth_signTypedData_v4',
    'eth_sendTransaction',
    'eth_signTransaction',
    'eth_sendRawTransaction'
  ),
  params: asArray(asUnknown)
})

export type WcRpcPayload = ReturnType<typeof asWcRpcPayload>

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
  timeConnected: number
} & ReturnType<typeof asWcDappDetails>

export type Dapp = { timeConnected: number } & WcProps & WcDappDetails

export interface WalletConnectors {
  [uri: string]: {
    connector: WalletConnect
    wcProps: WcProps
    dApp: WcDappDetails
    walletId?: string
  }
}

export const asWcSessionRequestParams = asObject({
  params: asArray(asWcDappDetails)
})

export interface EthereumOtherMethods {
  personal_sign: (params: string[]) => string
  eth_sign: (params: string[]) => string
  eth_signTypedData: (params: string[]) => string
  eth_signTypedData_v4: (params: string[]) => string
  eth_sendTransaction: (
    params: TxRpcParams,
    currencyCode: string
  ) => Promise<EdgeTransaction>
  eth_signTransaction: (
    params: TxRpcParams,
    currencyCode: string
  ) => Promise<EdgeTransaction>
  eth_sendRawTransaction: (signedTx: string) => Promise<EdgeTransaction>
  wcInit: (wcProps: WcProps) => Promise<WcDappDetails>
  wcConnect: (uri: string, publicKey: string, walletId: string) => void
  wcDisconnect: (uri: string) => void
  wcRequestResponse: (
    uri: string,
    approve: boolean,
    payload: WcRpcPayload
  ) => Promise<void>
  wcGetConnections: () => Dapp[]
}
