import { assert } from 'chai'

import { ZanoTools } from '../../src/zano/ZanoTools'

// Deterministic full-seed (v2) test vector. The 36-byte seed below is
// base58-encoded as `encodedKey` and decodes via `seedToMnemonic` into
// `expectedMnemonic`.
const encodedKey = '16qJFWMMHFy3xDdLmvUeyc2S6FrWRhJP51HsvDYdz9boMC8Z'
const expectedMnemonic =
  'before bring today bleed process melody cruel devil nowhere frozen bit month fur suffocate thigh against volume effort hill worse thick shove world different just love'

const makeTools = (
  importCalls: string[]
): { tools: ZanoTools; importCalls: string[] } => {
  const tools = Object.assign(Object.create(ZanoTools.prototype), {
    currencyInfo: { pluginId: 'zano' },
    builtinTokens: {}
  }) as ZanoTools

  tools.importPrivateKey = async (input: string) => {
    importCalls.push(input)
    if (input !== expectedMnemonic) {
      throw new Error('Unable to validate mnemonic')
    }
    return { zanoMnemonic: input }
  }

  tools.isValidAddress = async () => {
    throw new Error('Address validation should not run for private keys')
  }

  return { tools, importCalls }
}

describe('ZanoTools.parseUri', () => {
  it('decodes a base58-encoded raw-seed private key', async () => {
    const importCalls: string[] = []
    const { tools } = makeTools(importCalls)

    const parsedUri = await tools.parseUri(encodedKey)

    assert.deepEqual(parsedUri.privateKeys, [expectedMnemonic])
    assert.isUndefined(parsedUri.publicAddress)
    assert.deepEqual(importCalls, [encodedKey, expectedMnemonic])
  })

  it('decodes a base58-encoded raw-seed private key with zano: prefix', async () => {
    const prefixedKey = `zano:${encodedKey}`
    const importCalls: string[] = []
    const { tools } = makeTools(importCalls)

    const parsedUri = await tools.parseUri(prefixedKey)

    assert.deepEqual(parsedUri.privateKeys, [expectedMnemonic])
    assert.isUndefined(parsedUri.publicAddress)
    assert.deepEqual(importCalls, [prefixedKey, expectedMnemonic])
  })
})
