import { assert } from 'chai'
import { makeFakeIo } from 'edge-core-js'
import {
  EdgeCurrencyPlugin,
  EdgeLog,
  EdgeToken,
  EdgeTokenMap,
  JsonObject
} from 'edge-core-js/types'
import { afterEach, before, describe, it } from 'mocha'

import { createCosmosTokenId } from '../../src/common/tokenHelpers'
import { thorchainrune } from '../../src/cosmos/info/thorchainruneInfo'
import { fakeLog } from '../fake/fakeLog'

// THORChain denoms and the tokenIds they map to:
const denomTokenIds: Array<[string, string]> = [
  ['x/ruji', 'xruji'],
  ['thor.auto', 'thor.auto'],
  ['thor.lqdy', 'thor.lqdy'],
  ['btc-btc', 'btc-btc'],
  ['eth-eth', 'eth-eth'],
  ['sol-sol', 'sol-sol'],
  ['x/staking-tcy', 'xstaking-tcy'],
  ['x/staking-x/ruji', 'xstaking-xruji'],
  ['x/brune', 'xbrune'],
  ['x/staking-x/brune', 'xstaking-xbrune']
]

const fakeIo = makeFakeIo()

function makePlugin(
  infoPayload: JsonObject = {},
  log: EdgeLog = fakeLog
): EdgeCurrencyPlugin {
  return thorchainrune({
    infoPayload,
    initOptions: {},
    io: fakeIo,
    log,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  })
}

function makeToken(
  currencyCode: string,
  networkLocation?: JsonObject
): EdgeToken {
  return {
    currencyCode,
    displayName: currencyCode,
    denominations: [{ name: currencyCode, multiplier: '100000000' }],
    networkLocation
  }
}

async function getTokens(plugin: EdgeCurrencyPlugin): Promise<EdgeTokenMap> {
  return (await plugin.getBuiltinTokens?.()) ?? {}
}

describe('createCosmosTokenId', function () {
  it('maps THORChain denoms to tokenIds', function () {
    for (const [denom, tokenId] of denomTokenIds) {
      const token = makeToken('TEST', { contractAddress: denom })
      assert.equal(createCosmosTokenId(token), tokenId, denom)
    }
  })

  it('rejects a missing or invalid networkLocation', function () {
    const networkLocations: Array<JsonObject | undefined> = [
      undefined,
      {},
      { contractAddress: 42 },
      { contractAddress: '' },
      { contractAddress: 'xr' }, // Too short
      { contractAddress: 'X/ruji' }, // Must start with a lowercase letter
      { contractAddress: 'ibc/abc' }, // Not a full IBC hash
      { contractAddress: 'x/ruji!' } // Invalid suffix
    ]
    for (const networkLocation of networkLocations) {
      assert.throws(
        () => createCosmosTokenId(makeToken('TEST', networkLocation)),
        'ErrorInvalidContractAddress'
      )
    }
  })

  it('rejects tokens that fail validateToken', function () {
    const token = makeToken(' RUJI', { contractAddress: 'x/ruji' })
    assert.throws(() => createCosmosTokenId(token), 'Invalid currency code')
  })
})

describe('thorchainrune infoServerTokens', function () {
  // makeOuterPlugin merges info server tokens into the module-level
  // builtinTokens map, which every thorchainrune instance shares,
  // so remove whatever each test adds:
  let bundledTokenIds: string[] = []
  before(async function () {
    bundledTokenIds = Object.keys(await getTokens(makePlugin()))
  })
  afterEach(async function () {
    const tokens = await getTokens(makePlugin())
    for (const tokenId of Object.keys(tokens)) {
      if (bundledTokenIds.includes(tokenId)) continue
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete tokens[tokenId]
    }
  })

  it('adds tokens from the initial payload', async function () {
    const infoServerTokens = denomTokenIds.map(([denom]) =>
      makeToken(denom.toUpperCase(), { contractAddress: denom })
    )
    const tokens = await getTokens(makePlugin({ infoServerTokens }))

    assert.exists(tokens.tcy)
    for (const [denom, tokenId] of denomTokenIds) {
      // The engine matches balances by the raw denom, so it must survive:
      assert.deepEqual(tokens[tokenId].networkLocation, {
        contractAddress: denom
      })
    }
  })

  it('skips invalid tokens', async function () {
    const tokens = await getTokens(
      makePlugin({
        infoServerTokens: [
          'x/ruji',
          // Missing denominations:
          {
            currencyCode: 'RUJI',
            displayName: 'RUJI',
            networkLocation: { contractAddress: 'x/ruji' }
          },
          makeToken(' RUJI', { contractAddress: 'x/ruji' }),
          makeToken('RUJI', { contractAddress: 'X/RUJI' }),
          makeToken('RUJI'),
          makeToken('BRUNE', { contractAddress: 'x/brune' })
        ]
      })
    )

    assert.exists(tokens.tcy)
    assert.notExists(tokens.xruji)
    assert.exists(tokens.xbrune)
  })

  it('keeps the bundled TCY token over an info server duplicate', async function () {
    const tokens = await getTokens(
      makePlugin({
        infoServerTokens: [makeToken('FAKE', { contractAddress: 'tcy' })]
      })
    )

    assert.deepEqual(tokens.tcy, {
      currencyCode: 'TCY',
      displayName: 'TCY',
      denominations: [{ name: 'TCY', multiplier: '100000000' }],
      networkLocation: { contractAddress: 'tcy' }
    })
  })

  it('adds tokens from a live update after makeCurrencyTools', async function () {
    // Loading the Cosmos tools module can outrun mocha's 2s default
    // when no earlier test has compiled it:
    this.timeout(30000)

    const warnings: unknown[][] = []
    const log: EdgeLog = Object.assign(() => undefined, {
      warn(...args: unknown[]) {
        warnings.push(args)
      },
      error() {},
      crash() {},
      breadcrumb() {}
    })
    const plugin = makePlugin({}, log)
    const tools = await plugin.makeCurrencyTools()
    assert.notExists((await getTokens(plugin)).xruji)

    await plugin.updateInfoPayload?.({
      infoServerTokens: [makeToken('RUJI', { contractAddress: 'x/ruji' })]
    })

    const tokens = await getTokens(plugin)
    assert.exists(tokens.tcy)
    assert.exists(tokens.xruji)
    assert.equal(await tools.getTokenId?.(tokens.xruji), 'xruji')
    assert.deepEqual(warnings, [])
  })
})
