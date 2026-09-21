import { expect } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyTools,
  makeFakeIo
} from 'edge-core-js'
import { before, describe, it } from 'mocha'
import { base16 } from 'rfc4648'

import {
  addressFromPublicKey,
  animicaDerivationPath,
  keypairFromSeed,
  seedFromMnemonic
} from '../../src/animica/animicaCrypto'
import plugins from '../../src/index'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'
import fixtures from '../fixtures/animicaFixtures.json'

const { hd, mnemonic } = fixtures
const WALLET_TYPE = 'wallet:animica'

const fakeIo = makeFakeIo()
const pluginOptions: EdgeCorePluginOptions = {
  infoPayload: {},
  initOptions: {},
  io: fakeIo,
  log: fakeLog,
  nativeIo: {},
  pluginDisklet: fakeIo.disklet
}

const hex = (bytes: Uint8Array): string => base16.stringify(bytes).toLowerCase()

/** "m/44'/4279885'/0'/0'/1'" → [0, 1] */
const accountAndIndex = (path: string): [number, number] => {
  const levels = path.split('/').slice(1)
  return [parseInt(levels[2]), parseInt(levels[4])]
}

describe('Animica HD derivation', function () {
  it('derives the documented seeds', async function () {
    for (const vector of hd) {
      const [account, index] = accountAndIndex(vector.path)
      expect(animicaDerivationPath(account, index)).equals(vector.path)
      const seed = await seedFromMnemonic(mnemonic, account, index)
      expect(hex(seed)).equals(vector.seed)
    }
  })

  it('generates the documented ML-DSA-65 keys and addresses', function () {
    for (const vector of hd) {
      const { publicKey, secretKey } = keypairFromSeed(
        base16.parse(vector.seed)
      )
      expect(hex(publicKey)).equals(vector.publicKey)
      expect(secretKey.length).equals(4032)
      expect(addressFromPublicKey(publicKey)).equals(vector.address)
    }
  })

  it('rejects seeds of the wrong length', function () {
    expect(() => keypairFromSeed(new Uint8Array(31))).throws()
  })
})

describe('Animica keys', function () {
  let tools: EdgeCurrencyTools
  const [first] = hd

  before(async function () {
    tools = await plugins.animica(pluginOptions).makeCurrencyTools()
  })

  it('imports a mnemonic', async function () {
    const keys = await tools.importPrivateKey?.(mnemonic)
    expect(keys).deep.equals({
      animicaMnemonic: mnemonic,
      animicaKey: first.seed
    })
  })

  it('imports a hex seed', async function () {
    expect(await tools.importPrivateKey?.(first.seed)).deep.equals({
      animicaKey: first.seed
    })
    expect(
      await tools.importPrivateKey?.(`0x${first.seed.toUpperCase()}`)
    ).deep.equals({ animicaKey: first.seed })
  })

  it('rejects other inputs', async function () {
    await expectRejection(
      tools.importPrivateKey?.('not a key') ?? Promise.resolve()
    )
    await expectRejection(
      tools.importPrivateKey?.(first.seed.slice(0, 62)) ?? Promise.resolve()
    )
    await expectRejection(
      tools.importPrivateKey?.(first.address) ?? Promise.resolve()
    )
  })

  it('derives the address and public key from the seed', async function () {
    const keys = await tools.derivePublicKey({
      id: 'id',
      type: WALLET_TYPE,
      keys: { animicaKey: first.seed }
    })
    expect(keys).deep.equals({
      publicKey: first.address,
      publicKeyHex: first.publicKey
    })
  })

  it('derives the address from a mnemonic alone', async function () {
    const keys = await tools.derivePublicKey({
      id: 'id',
      type: WALLET_TYPE,
      keys: { animicaMnemonic: mnemonic }
    })
    expect(keys.publicKey).equals(first.address)
  })

  it('rejects the wrong wallet type or missing keys', async function () {
    await expectRejection(
      tools.derivePublicKey({
        id: 'id',
        type: 'wallet:sui',
        keys: { animicaKey: first.seed }
      })
    )
    await expectRejection(
      tools.derivePublicKey({ id: 'id', type: WALLET_TYPE, keys: {} })
    )
    await expectRejection(tools.createPrivateKey('wallet:sui'))
  })

  it('creates a 24-word wallet whose seed matches its mnemonic', async function () {
    const keys = await tools.createPrivateKey(WALLET_TYPE)
    expect(keys.animicaMnemonic.split(' ')).lengthOf(24)
    expect(keys.animicaKey).matches(/^[0-9a-f]{64}$/)
    const reimported = await tools.importPrivateKey?.(keys.animicaMnemonic)
    expect(reimported?.animicaKey).equals(keys.animicaKey)
  })

  it('shows the mnemonic and the address', async function () {
    expect(
      await tools.getDisplayPrivateKey?.({
        id: 'id',
        type: WALLET_TYPE,
        keys: { animicaMnemonic: mnemonic, animicaKey: first.seed }
      })
    ).equals(mnemonic)
    expect(
      await tools.getDisplayPrivateKey?.({
        id: 'id',
        type: WALLET_TYPE,
        keys: { animicaKey: first.seed }
      })
    ).equals(first.seed)
    expect(
      await tools.getDisplayPublicKey?.({
        id: 'id',
        type: WALLET_TYPE,
        keys: { publicKey: first.address }
      })
    ).equals(first.address)
  })
})
