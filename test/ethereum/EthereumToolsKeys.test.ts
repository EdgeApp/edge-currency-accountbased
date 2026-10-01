import { expect } from 'chai'
import { EdgeWalletInfo, JsonObject } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { EthereumTools } from '../../src/ethereum/EthereumTools'

const mnemonic =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const privateKey = '1234567890abcdef'.repeat(4)

/**
 * Builds `EthereumTools` without running its constructor, which needs
 * network info and an io object. `getDisplayPrivateKey` only reads the
 * pluginId.
 */
const makeTools = (pluginId: string): EthereumTools =>
  Object.assign(Object.create(EthereumTools.prototype), {
    currencyInfo: { pluginId }
  }) as EthereumTools

const makeWalletInfo = (keys: JsonObject): EdgeWalletInfo => ({
  id: 'fake',
  type: 'wallet:fake',
  keys
})

describe('EthereumTools.getDisplayPrivateKey', () => {
  it('shows the seed phrase and the hex key when both are stored', async () => {
    const tools = makeTools('ethereum')

    const out = await tools.getDisplayPrivateKey(
      makeWalletInfo({ ethereumMnemonic: mnemonic, ethereumKey: privateKey })
    )

    expect(out).equals(
      `Seed Phrase:\n${mnemonic}\n\nPrivate Key:\n${privateKey}`
    )
  })

  it('shows only the hex key for a wallet imported from one', async () => {
    const tools = makeTools('ethereum')

    const out = await tools.getDisplayPrivateKey(
      makeWalletInfo({ ethereumKey: privateKey })
    )

    expect(out).equals(privateKey)
  })

  it('shows only the hex key for a wallet split from another EVM chain', async () => {
    // The core renames `ethereumKey` to `avalancheKey` on split but leaves
    // the mnemonic under the source chain's name:
    const tools = makeTools('avalanche')

    const out = await tools.getDisplayPrivateKey(
      makeWalletInfo({ avalancheKey: privateKey, ethereumMnemonic: mnemonic })
    )

    expect(out).equals(privateKey)
  })
})
