import { makeEosPlugin } from './eosInfo'
import { makeTelosPlugin } from './telosInfo'
import { makeWaxPlugin } from './waxInfo'

export const eosPlugins = {
  eos: makeEosPlugin,
  telos: makeTelosPlugin,
  wax: makeWaxPlugin
}
