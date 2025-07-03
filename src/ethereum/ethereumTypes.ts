import {
  asArray,
  asBoolean,
  asCodec,
  asEither,
  asMaybe,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  asValue,
  Cleaner
} from 'cleaners'
import { EdgeSpendInfo } from 'edge-core-js/types'

import {
  asIntegerString,
  asSafeCommonWalletInfo,
  asServiceKeys,
  ServiceKeys,
  WalletConnectPayload
} from '../common/types'
import type { NetworkAdapterConfig } from './networkAdapters/networkAdapterTypes'

export interface EthereumInitOptions {
  serviceKeys: ServiceKeys
  infuraProjectId?: string

  /** @deprecated Use serviceKeys instead */
  alchemyApiKey?: string
  /** @deprecated Use serviceKeys instead */
  amberdataApiKey?: string
  /** @deprecated Use serviceKeys instead */
  blockchairApiKey?: string
  /** @deprecated Use serviceKeys instead */
  blockcypherApiKey?: string
  /** @deprecated Use serviceKeys instead */
  drpcApiKey?: string
  /** For Etherscan v2 API
   * @deprecated Use serviceKeys instead
   */
  etherscanApiKey?: string | string[]
  /** For bespoke scan APIs unsupported by Etherscan v2 API (e.g. fantomscan)
   * @deprecated Use serviceKeys instead
   */
  evmScanApiKey?: string | string[]
  /** @deprecated Use serviceKeys instead */
  gasStationApiKey?: string
  /** @deprecated Use serviceKeys instead */
  nowNodesApiKey?: string
  /** @deprecated Use serviceKeys instead */
  poktPortalApiKey?: string
  /** @deprecated Use serviceKeys instead */
  quiknodeApiKey?: string
}

export const asEthereumInitOptions = asObject<EthereumInitOptions>({
  serviceKeys: asOptional(asServiceKeys, () => ({})),
  infuraProjectId: asOptional(asString),

  // Deprecated:
  alchemyApiKey: asOptional(asString),
  amberdataApiKey: asOptional(asString),
  blockchairApiKey: asOptional(asString),
  blockcypherApiKey: asOptional(asString),
  drpcApiKey: asOptional(asString),
  etherscanApiKey: asOptional(asEither(asString, asArray(asString))),
  evmScanApiKey: asOptional(asEither(asString, asArray(asString))),
  gasStationApiKey: asOptional(asString),
  nowNodesApiKey: asOptional(asString),
  poktPortalApiKey: asOptional(asString),
  quiknodeApiKey: asOptional(asString)
})

function isKeyOfEthereumInitOptions(
  key: string
): key is keyof EthereumInitOptions {
  return key in asEthereumInitOptions.shape
}

export const asEthereumInitKeys = (raw: any): keyof EthereumInitOptions => {
  if (typeof raw !== 'string') {
    throw new Error('key must be a string')
  }

  if (isKeyOfEthereumInitOptions(raw)) {
    return raw
  }
  throw new Error(`${raw} not a key of EthereumInitOptions`)
}

export interface ChainParams {
  chainId: number
  name: string
}

export interface EthereumNetworkInfo {
  addressQueryLookbackBlocks: number
  networkAdapterConfigs: NetworkAdapterConfig[]
  feeUpdateFrequencyMs?: number
  amberDataBlockchainId: string
  chainParams: ChainParams
  supportsEIP1559?: boolean
  optimismRollup?: boolean
  arbitrumRollupParams?: {
    nodeInterfaceAddress: string
  }
  disableEvmScanInternal?: boolean
  ercTokenStandard: string
  evmGasStationUrl: string | null
  hdPathCoinType: number
  networkFees: EthereumFees
  pluginMnemonicKeyName: string
  pluginRegularKeyName: string
  uriNetworks: string[]
}

const asNetworkAdaptorConfigType = asValue(
  'amberdata-rpc',
  'blockbook',
  'blockchair',
  'blockcypher',
  'evmscan',
  'filfox',
  'pulsechain-scan',
  'rpc'
)
const asNetworkAdaptorConfig = asObject({
  type: asNetworkAdaptorConfigType,
  servers: asArray(asString),
  ethBalCheckerContract: asOptional(asString)
})

/**
 * Other Methods from EthereumTools
 */
export const ethOtherMethodNames = ['resolveEnsName'] as const

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
  baseFee: asOptional(asString),
  baseFeeMultiplier: asOptional(asEthereumBaseFeeMultiplier),
  gasLimit: asOptional(asEthereumFeesGasLimit),
  gasPrice: asOptional(asEthereumFeesGasPrice),
  minPriorityFee: asOptional(asString)
})

export type EthereumFee = ReturnType<typeof asEthereumFee>

export const asEthereumFees = asObject<EthereumFee>(asEthereumFee)

export type EthereumFees = ReturnType<typeof asEthereumFees>

export type EthereumEstimateGasParams = [
  {
    to: string
    from: string
    gas: string
    value: string | undefined
    data: string | undefined
  },
  string
]

export interface EthereumMiningFees {
  gasPrice: string
  gasLimit: string
  useEstimatedGasLimit: boolean
}

export interface OptimismRollupParams {
  baseFee: string
  baseFeeScalar: string
  blobBaseFee: string
  blobBaseFeeScalar: string
}

export interface CalcOptimismRollupFeeParams extends OptimismRollupParams {
  nonce?: string
  gasLimit: string
  to: string
  value?: string
  data?: string | null | undefined
  chainParams: ChainParams
}

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

export interface EthereumTxParameterInformation {
  contractAddress?: string
  data?: string
  value?: string
}

export interface EthereumTxOtherParams {
  from: string[]
  to: string[]
  gas: string
  gasPrice: string
  gasUsed: string
  minerTip?: string
  tokenRecipientAddress?: string
  nonceUsed?: string
  replacedTxid?: string
  data?: string | null
  isFromMakeSpend: boolean
}
export const asEthereumTxOtherParams = asObject<EthereumTxOtherParams>({
  from: asArray(asString),
  to: asArray(asString),
  gas: asString,
  gasPrice: asString,
  gasUsed: asString,
  minerTip: asOptional(asString),
  tokenRecipientAddress: asOptional(asString),
  nonceUsed: asString,
  replacedTxid: asOptional(asString),
  data: asOptional(asEither(asString, asNull)),
  isFromMakeSpend: asOptional(asBoolean, false)
})

export const asEthereumWalletOtherData = asObject({
  nextNonce: asMaybe(asString, '0'),
  /** @deprecated use nextNonce and count the observed pending transactions instead */
  unconfirmedNextNonce: asMaybe(asString, '0'),

  // hacks
  zksyncForceResyncUSDC: asMaybe(asBoolean, false)
})

export type EthereumWalletOtherData = ReturnType<
  typeof asEthereumWalletOtherData
>

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
  tokens: asMaybe(asArray(asBlockbookTokenBalance), () => [])
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

export const asGetTransactionReceipt = asObject({
  l1Fee: asString
})

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
  signTypedData: (
    typedData: EIP712TypedDataParam,
    privateKeys: EthereumPrivateKeys
  ) => string
  txRpcParamsToSpendInfo: (params: TxRpcParams) => EdgeSpendInfo
}

export const asEvmWcRpcPayload = asObject({
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

export type EvmWcRpcPayload = ReturnType<typeof asEvmWcRpcPayload>

//
// Other Params and Other Methods:
//

export interface EthereumOtherMethods {
  parseWalletConnectV2Payload: (
    payload: EvmWcRpcPayload
  ) => Promise<WalletConnectPayload>
  txRpcParamsToSpendInfo: (params: TxRpcParams) => Promise<EdgeSpendInfo>
}

export const asEthereumSignMessageParams = asOptional(
  asObject({
    typedData: asOptional(asBoolean, false)
  }),
  { typedData: false }
)

//
// Wallet Info and Keys:
//

export type SafeEthWalletInfo = ReturnType<typeof asSafeEthWalletInfo>
export const asSafeEthWalletInfo = asSafeCommonWalletInfo

export interface EthereumPrivateKeys {
  mnemonic?: string
  privateKey: string
}
export const asEthereumPrivateKeys = (
  pluginId: string
): Cleaner<EthereumPrivateKeys> => {
  // Type hacks:
  type PluginId = 'x'
  type FromKeys = {
    [key in `${PluginId}Key`]: string
  } &
    {
      [key in `${PluginId}Mnemonic`]?: string
    }
  const _pluginId = pluginId as PluginId
  // Derived cleaners from the generic parameter:
  const asFromKeys: Cleaner<FromKeys> = asObject({
    [`${_pluginId}Mnemonic`]: asOptional(asString),
    [`${_pluginId}Key`]: asString
  }) as Cleaner<any>
  const asFromJackedKeys = asObject({ keys: asFromKeys })

  return asCodec(
    (value: unknown) => {
      // Handle potentially jacked-up keys:
      const fromJacked = asMaybe(asFromJackedKeys)(value)
      if (fromJacked != null) {
        const to: EthereumPrivateKeys = {
          mnemonic: fromJacked.keys[`${_pluginId}Mnemonic`],
          privateKey: fromJacked.keys[`${_pluginId}Key`]
        }
        return to
      }

      // Handle normal keys:
      const from = asFromKeys(value)
      const to: EthereumPrivateKeys = {
        mnemonic: from[`${_pluginId}Mnemonic`],
        privateKey: from[`${_pluginId}Key`]
      }
      return to
    },
    ethPrivateKey => {
      return {
        [`${_pluginId}Mnemonic`]: ethPrivateKey.mnemonic,
        [`${_pluginId}Key`]: ethPrivateKey.privateKey
      }
    }
  )
}

export const asMaybeEvmOverrideGasLimitLocation = asMaybe(
  asObject({
    overrideGasLimit: asIntegerString
  })
)

//
// Info Payload
//

export const asEthereumInfoPayload = asObject({
  networkAdapterConfigs: asOptional(asArray(asNetworkAdaptorConfig)),
  networkFees: asOptional(asEthereumFees)
})
export type EthereumInfoPayload = ReturnType<typeof asEthereumInfoPayload>
