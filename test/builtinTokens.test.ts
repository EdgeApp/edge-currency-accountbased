import { expect } from 'chai'
import { EdgeCorePluginOptions, makeFakeIo } from 'edge-core-js'
import { describe, it } from 'mocha'

import { makeMetaTokens } from '../src/common/tokenHelpers'
import { BooleanMap } from '../src/common/types'
import plugins from '../src/index'
import { fakeLog } from './fake/fakeLog'

const fakeIo = makeFakeIo()
const fakePluginOptions: EdgeCorePluginOptions = {
  infoPayload: {},
  initOptions: {},
  io: fakeIo,
  log: fakeLog,
  nativeIo: {
    'edge-currency-accountbased': {
      piratechain: {},
      zcash: {}
    }
  },
  pluginDisklet: fakeIo.disklet
}

const pluginIds = Object.keys(plugins) as Array<keyof typeof plugins>
const pluginsWithoutMetatokens: BooleanMap = { algorand: true, ripple: true }

describe('builtinTokens', function () {
  for (const pluginId of pluginIds) {
    if (pluginsWithoutMetatokens[pluginId]) continue
    const plugin = plugins[pluginId](fakePluginOptions)

    it(`${pluginId} has the right tokenId's`, async function () {
      const builtinTokens =
        plugin.getBuiltinTokens == null ? {} : await plugin.getBuiltinTokens()
      const actual = Object.keys(builtinTokens)

      const metaTokens = makeMetaTokens(builtinTokens)
      expect(metaTokens.length).equals(actual.length)

      const tools = await plugin.makeCurrencyTools()
      const expected = await Promise.all(
        actual.map(async actualId =>
          tools.getTokenId == null
            ? ''
            : await tools.getTokenId(builtinTokens[actualId])
        )
      )

      expect(actual).deep.equals(expected)
    })
  }
})
