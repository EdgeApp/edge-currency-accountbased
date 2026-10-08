import { assert } from 'chai'
import { makeFakeIo } from 'edge-core-js'
import {
  EdgeCurrencyPlugin,
  EdgeToken,
  EdgeTokenMap,
  JsonObject
} from 'edge-core-js/types'
import { afterEach, describe, it } from 'mocha'

import { createCosmosTokenId } from '../../src/common/tokenHelpers'
import { thorchainrune } from '../../src/cosmos/info/thorchainruneInfo'
import { thorchainrunestagenet } from '../../src/cosmos/info/thorchainruneStagenetInfo'
import { fakeLog } from '../fake/fakeLog'

// The THORChain bank tokens Edge serves from the info server,
// as [currencyCode, raw denom, tokenId]:
const remoteTokens: Array<[string, string, string]> = [
  ['RUJI', 'x/ruji', 'xruji'],
  ['AUTO', 'thor.auto', 'thor.auto'],
  ['LQDY', 'thor.lqdy', 'thor.lqdy'],
  ['BTC-BTC', 'btc-btc', 'btc-btc'],
  ['ETH-ETH', 'eth-eth', 'eth-eth'],
  ['SOL-SOL', 'sol-sol', 'sol-sol'],
  ['sTCY', 'x/staking-tcy', 'xstaking-tcy'],
  ['sRUJI', 'x/staking-x/ruji', 'xstaking-xruji'],
  ['bRUNE', 'x/brune', 'xbrune'],
  ['ybRUNE', 'x/staking-x/brune', 'xstaking-xbrune']
]

const IBC_DENOM =
  'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2'

const fakeIo = makeFakeIo()

function makeToken(currencyCode: string, contractAddress?: unknown): EdgeToken {
  return {
    currencyCode,
    displayName: currencyCode,
    denominations: [{ name: currencyCode, multiplier: '100000000' }],
    networkLocation:
      contractAddress === undefined ? undefined : { contractAddress }
  }
}

function makePlugin(
  infoServerTokens: unknown[] = [],
  factory: typeof thorchainrune = thorchainrune
): EdgeCurrencyPlugin {
  const infoPayload: JsonObject = { infoServerTokens }
  return factory({
    infoPayload,
    initOptions: {},
    io: fakeIo,
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  })
}

async function getTokens(plugin: EdgeCurrencyPlugin): Promise<EdgeTokenMap> {
  return (await plugin.getBuiltinTokens?.()) ?? {}
}

describe('createCosmosTokenId', function () {
  it('maps bank denoms to token IDs', function () {
    for (const [currencyCode, denom, tokenId] of remoteTokens) {
      assert.equal(
        createCosmosTokenId(makeToken(currencyCode, denom)),
        tokenId,
        denom
      )
    }
  })

  it('accepts IBC and mixed-case denoms', function () {
    assert.equal(
      createCosmosTokenId(makeToken('ATOM', IBC_DENOM)),
      IBC_DENOM.toLowerCase().replace('/', '')
    )
    assert.equal(
      createCosmosTokenId(makeToken('TEST', 'factory/osmo1abc/MyToken')),
      'factoryosmo1abcmytoken'
    )
  })

  it('rejects malformed denoms', function () {
    const badDenoms: unknown[] = [
      undefined,
      42,
      '',
      'xr', // Too short
      '1abc', // Must start with a letter
      'ibc/abc', // Not a full IBC hash
      'x/ruji!', // Invalid character
      'x/ruji extra',
      'a'.repeat(129) // Too long
    ]
    for (const denom of badDenoms) {
      assert.throws(
        () => createCosmosTokenId(makeToken('TEST', denom)),
        'ErrorInvalidContractAddress',
        String(denom)
      )
    }
  })

  it('rejects an invalid currency code', function () {
    assert.throws(() => createCosmosTokenId(makeToken(' RUJI', 'x/ruji')))
  })
})

describe('THORChain info server tokens', function () {
  // The plugin keeps its token map for the life of the process,
  // so drop whatever each test added:
  afterEach(async function () {
    for (const factory of [thorchainrune, thorchainrunestagenet]) {
      const tokens = await getTokens(makePlugin([], factory))
      for (const tokenId of Object.keys(tokens)) {
        if (tokenId !== 'tcy') Reflect.deleteProperty(tokens, tokenId)
      }
    }
  })

  for (const [name, factory] of [
    ['thorchainrune', thorchainrune],
    ['thorchainrunestagenet', thorchainrunestagenet]
  ] as const) {
    it(`${name} accepts remote tokens and keeps each raw denom`, async function () {
      const plugin = makePlugin(
        remoteTokens.map(([currencyCode, denom]) =>
          makeToken(currencyCode, denom)
        ),
        factory
      )
      const tokens = await getTokens(plugin)

      assert.deepEqual(
        Object.keys(tokens).sort((a, b) => a.localeCompare(b)),
        ['tcy', ...remoteTokens.map(([, , tokenId]) => tokenId)].sort((a, b) =>
          a.localeCompare(b)
        )
      )
      for (const [currencyCode, denom, tokenId] of remoteTokens) {
        assert.equal(tokens[tokenId].currencyCode, currencyCode)
        assert.deepEqual(tokens[tokenId].networkLocation, {
          contractAddress: denom
        })
      }
    })
  }

  it('has only the bundled token without a payload', async function () {
    assert.deepEqual(Object.keys(await getTokens(makePlugin())), ['tcy'])
  })

  it('keeps the bundled TCY over a remote definition', async function () {
    const tokens = await getTokens(
      makePlugin([
        {
          ...makeToken('TCY', 'tcy'),
          displayName: 'Remote TCY',
          denominations: [{ name: 'TCY', multiplier: '1' }]
        }
      ])
    )
    assert.deepEqual(Object.keys(tokens), ['tcy'])
    assert.equal(tokens.tcy.displayName, 'TCY')
    assert.equal(tokens.tcy.denominations[0].multiplier, '100000000')
  })

  it('keeps the first of two remote tokens with the same token ID', async function () {
    const tokens = await getTokens(
      makePlugin([makeToken('RUJI', 'x/ruji'), makeToken('RUJI2', 'xruji')])
    )
    assert.equal(tokens.xruji.currencyCode, 'RUJI')
    assert.deepEqual(tokens.xruji.networkLocation, {
      contractAddress: 'x/ruji'
    })
  })

  it('rejects malformed and colliding entries without losing valid ones', async function () {
    const tokens = await getTokens(
      makePlugin([
        'not a token',
        { currencyCode: 'BAD' },
        makeToken('NODENOM'),
        makeToken('SHORT', 'xr'),
        makeToken('SPACE', 'x/ruji extra'),
        makeToken('UPPER', 'X/RUJI'),
        // The native asset is not a token:
        makeToken('WRUNE', 'rune'),
        // Currency codes already taken by RUNE and by the bundled TCY:
        makeToken('RUNE', 'x/fakerune'),
        makeToken('rune', 'x/fakerune2'),
        makeToken('TCY', 'x/faketcy'),
        makeToken('RUJI', 'x/ruji'),
        // A second denom claiming an accepted remote token's code:
        makeToken('RUJI', 'x/fakeruji'),
        makeToken('AUTO', 'thor.auto')
      ])
    )
    assert.deepEqual(
      Object.keys(tokens).sort((a, b) => a.localeCompare(b)),
      ['tcy', 'thor.auto', 'xruji']
    )
  })

  it('accepts the same payload again', async function () {
    const payload = [makeToken('RUJI', 'x/ruji')]
    await getTokens(makePlugin(payload))
    const tokens = await getTokens(makePlugin(payload))
    assert.deepEqual(
      Object.keys(tokens).sort((a, b) => a.localeCompare(b)),
      ['tcy', 'xruji']
    )
  })

  it('accepts tokens from a payload update', async function () {
    this.timeout(30000)
    const plugin = makePlugin()
    // Updates are ignored until the inner plugin loads:
    const tools = await plugin.makeCurrencyTools()
    await plugin.updateInfoPayload?.({
      infoServerTokens: [makeToken('LQDY', 'thor.lqdy')]
    })

    const tokens = await getTokens(plugin)
    assert.deepEqual(tokens['thor.lqdy'].networkLocation, {
      contractAddress: 'thor.lqdy'
    })
    assert.equal(await tools.getTokenId?.(tokens['thor.lqdy']), 'thor.lqdy')
  })
})
