import { EdgeCurrencyInfo, EdgeTokenMap } from 'edge-core-js/types'

import { makeOuterPlugin } from '../../common/innerPlugin'
import { createEvmTokenId, makeMetaTokens } from '../../common/tokenHelpers'
import type { EthereumTools } from '../EthereumTools'
import {
  asEthereumInfoPayload,
  EthereumFees,
  EthereumInfoPayload,
  EthereumNetworkInfo
} from '../ethereumTypes'
import {
  evmCustomFeeTemplate,
  evmCustomTokenTemplate,
  evmMemoOptions,
  makeEvmDefaultSettings
} from './ethereumCommonInfo'

// Bridged token addresses come from the canonical Arbitrum token bridge, via
// L2GatewayRouter.calculateL2TokenAddress(l1Token). Robinhood Chain's explorer
// lists many same-symbol imposters, so never source these from a token search.
export const builtinTokens: EdgeTokenMap = {
  '80e0e24718dbfcad49ecaa6f1e6c89a190586ca8': {
    currencyCode: 'USDC',
    displayName: 'Bridged USDC (Robinhood)',
    denominations: [{ name: 'USDC', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x80e0e24718dbFcad49ECAA6F1e6C89A190586cA8'
    }
  },
  e246bc49b0598d7cd9f0ead48b885034f1254380: {
    currencyCode: 'USDT',
    displayName: 'Bridged USDT (Robinhood)',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0xE246BC49b0598d7Cd9f0eAD48B885034f1254380'
    }
  },
  '5fc5360d0400a0fd4f2af552add042d716f1d168': {
    currencyCode: 'USDG',
    displayName: 'Global Dollar',
    denominations: [{ name: 'USDG', multiplier: '1000000' }],
    networkLocation: {
      contractAddress: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168'
    }
  },
  '6bac06600d220ac5ac281ad1f504d2cf0f90f6e6': {
    currencyCode: 'WBTC',
    displayName: 'Wrapped BTC',
    denominations: [{ name: 'WBTC', multiplier: '100000000' }],
    networkLocation: {
      contractAddress: '0x6bac06600D220Ac5Ac281AD1f504D2Cf0F90F6e6'
    }
  },
  '0bd7d308f8e1639fab988df18a8011f41eacad73': {
    currencyCode: 'WETH',
    displayName: 'Wrapped Ether',
    denominations: [{ name: 'WETH', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x0Bd7D308f8E1639FAb988df18A8011f41EAcAD73'
    }
  },

  // These two are native to this chain rather than bridged, so the gateway
  // router above cannot derive them. Each address is the one ChangeNow, Swapuz,
  // LetsExchange and Rango all settle to, confirmed against the contract itself.
  '020bfc650a365f8bb26819deaabf3e21291018b4': {
    currencyCode: 'CASHCAT',
    displayName: 'Cash Cat',
    denominations: [{ name: 'CASHCAT', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x020bfC650A365f8BB26819deAAbF3E21291018b4'
    }
  },
  '39dbed3a2bd333467115de45665cc57f813c4571': {
    currencyCode: 'PONS',
    displayName: 'Pons',
    denominations: [{ name: 'PONS', multiplier: '1000000000000000000' }],
    networkLocation: {
      contractAddress: '0x39dBED3a2bd333467115dE45665cC57F813C4571'
    }
  }
}

// Fees are in Wei. Robinhood Chain's base fee sits far below 1 gwei, so the
// priority fee is scaled down to match instead of dwarfing the base fee.
const networkFees: EthereumFees = {
  default: {
    baseFee: undefined,
    baseFeeMultiplier: {
      lowFee: '1',
      standardFeeLow: '1.25',
      standardFeeHigh: '1.5',
      highFee: '1.75'
    },
    gasLimit: {
      regularTransaction: '21000',
      tokenTransaction: '300000',
      minGasLimit: '21000'
    },
    gasPrice: {
      lowFee: '1000000001',
      standardFeeLow: '40000000001',
      standardFeeHigh: '300000000001',
      standardFeeLowAmount: '100000000000000000',
      standardFeeHighAmount: '10000000000000000000',
      highFee: '40000000001',
      minGasPrice: '1000000'
    },
    minPriorityFee: '10000000' // 0.01 Gwei
  }
}

const networkInfo: EthereumNetworkInfo = {
  // Blocks arrive about every 96ms, so this is the usual ~2 minute overlap
  addressQueryLookbackBlocks: 1250,
  networkAdapterConfigs: [
    {
      // Keyed history source. Alchemy does not serve the `internal` category
      // on this network, so ETH paid out to the wallet from inside a contract
      // call is only seen while the Blockscout fallback below is answering.
      type: 'alchemy',
      servers: ['https://robinhood-mainnet.g.alchemy.com/v2/{{alchemyApiKey}}']
    },
    {
      type: 'rpc',
      servers: [
        'https://rpc.mainnet.chain.robinhood.com',
        'https://robinhood-rpc.publicnode.com',
        'https://robinhood-mainnet.g.alchemy.com/v2/{{alchemyApiKey}}'
      ],
      ethBalCheckerContract: '0x8950F12786CAE64F94a02733A260ca6FecDaeD7f'
    },
    {
      // Etherscan V2 does not support chain 4663. The chain's public Blockscout
      // instance has no gastracker module and allows 300 requests per minute
      // per IP, so it is the fallback history source rather than the primary.
      type: 'evmscan',
      gastrackerSupport: false,
      servers: ['https://robinhoodchain.blockscout.com']
    }
  ],
  uriNetworks: ['robinhood'],
  ercTokenStandard: 'ERC20',
  chainParams: {
    chainId: 4663,
    name: 'Robinhood Chain'
  },
  arbitrumRollupParams: {
    nodeInterfaceAddress: '0x00000000000000000000000000000000000000C8'
  },
  supportsEIP1559: true,
  hdPathCoinType: 60,
  pluginMnemonicKeyName: 'robinhoodMnemonic',
  pluginRegularKeyName: 'robinhoodKey',
  evmGasStationUrl: null,
  networkFees,
  decoyAddressConfig: {
    count: 5,
    minTransactionCount: 10,
    maxTransactionCount: 100
  }
}

export const currencyInfo: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETH',
  evmChainId: 4663,
  customFeeTemplate: evmCustomFeeTemplate,
  customTokenTemplate: evmCustomTokenTemplate,
  chainDisplayName: 'Robinhood Chain',
  assetDisplayName: 'Ethereum',
  memoOptions: evmMemoOptions,
  pluginId: 'robinhood',
  walletType: 'wallet:robinhood',

  // Explorers:
  addressExplorer: 'https://robinhoodchain.blockscout.com/address/%s',
  transactionExplorer: 'https://robinhoodchain.blockscout.com/tx/%s',

  denominations: [
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    }
  ],

  usesChangeServer: true,

  // Deprecated:
  defaultSettings: makeEvmDefaultSettings(networkInfo),
  displayName: 'Robinhood Chain',
  metaTokens: makeMetaTokens(builtinTokens)
}

export const robinhood = makeOuterPlugin<
  EthereumNetworkInfo,
  EthereumTools,
  EthereumInfoPayload
>({
  builtinTokens,
  currencyInfo,
  asInfoPayload: asEthereumInfoPayload,
  createTokenId: createEvmTokenId,
  networkInfo,

  async getInnerPlugin() {
    return await import('../EthereumTools')
  }
})
