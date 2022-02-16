// @flow

import { makeEosPlugin } from './eosInfo.js'
import { makeTelosPlugin } from './telosInfo.js'
import { makeWaxPlugin } from './waxInfo.js'

export const eosPlugins = {
  eos: makeEosPlugin,
  telos: makeTelosPlugin,
  wax: makeWaxPlugin
}
