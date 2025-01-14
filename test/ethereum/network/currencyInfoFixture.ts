import { EdgeCurrencyInfo } from 'edge-core-js'

import { makeMetaTokens } from '../../../src/common/tokenHelpers'
import { allTokensMapFixture } from './allTokensMapFixture'

export const currencyInfoFixture: EdgeCurrencyInfo = {
  canReplaceByFee: true,
  currencyCode: 'ETH',
  assetDisplayName: 'Ethereum',
  chainDisplayName: 'Ethereum',
  memoOptions: [
    {
      type: 'hex',
      hidden: true,
      memoName: 'data'
    }
  ],
  pluginId: 'ethereum',
  walletType: 'wallet:ethereum',
  addressExplorer: 'https://etherscan.io/address/%s',
  transactionExplorer: 'https://etherscan.io/tx/%s',
  denominations: [
    {
      name: 'ETH',
      multiplier: '1000000000000000000',
      symbol: 'Ξ'
    },
    {
      name: 'mETH',
      multiplier: '1000000000000000',
      symbol: 'mΞ'
    }
  ],
  defaultSettings: {
    customFeeSettings: ['gasLimit', 'gasPrice'],
    otherSettings: {
      chainParams: {
        chainId: 1,
        name: 'Ethereum Mainnet'
      },
      ercTokenStandard: 'ERC20',
      networkAdapterConfigs: [
        {
          type: 'rpc',
          servers: ['https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'],
          ethBalCheckerContract: '0xb1f8e55c7f64d203c1400b9d8555d050f94adf39'
        },
        {
          type: 'amberdata-rpc',
          servers: ['https://rpc.web3api.io']
        },
        {
          type: 'evmscan',
          servers: ['https://api.etherscan.io']
        },
        {
          type: 'blockbook',
          servers: [
            'https://ethbook.guarda.co',
            'https://eth1.trezor.io',
            'https://eth2.trezor.io'
          ]
        },
        {
          type: 'blockchair',
          servers: ['https://api.blockchair.com']
        },
        {
          type: 'blockcypher',
          servers: ['https://api.blockcypher.com']
        }
      ]
    }
  },
  metaTokens: makeMetaTokens(allTokensMapFixture),

  // Deprecated
  displayName: 'Ethereum'
}
