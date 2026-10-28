import { assert } from 'chai'
import { describe, it } from 'mocha'

import { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import { resolveServerApiKeys } from '../../../src/ethereum/networkAdapters/apiKeyTemplate'

const plugin = {
  currencyInfo: { pluginId: 'ethereum' },
  initOptions: { alchemyApiKey: 'alchemy-key' }
} as unknown as Pick<EthereumEngine, 'currencyInfo' | 'initOptions'>

describe('resolveServerApiKeys', function () {
  it('fills in the keys the plugin has', function () {
    assert.deepEqual(
      resolveServerApiKeys(
        ['https://eth-mainnet.alchemyapi.io/v2/{{alchemyApiKey}}'],
        plugin
      ),
      ['https://eth-mainnet.alchemyapi.io/v2/alchemy-key']
    )
  })

  it('drops servers whose key the plugin lacks', function () {
    assert.deepEqual(
      resolveServerApiKeys(
        [
          'https://mainnet.infura.io/v3/{{infuraProjectId}}',
          'https://ethereum-rpc.publicnode.com'
        ],
        plugin
      ),
      ['https://ethereum-rpc.publicnode.com']
    )
  })
})
