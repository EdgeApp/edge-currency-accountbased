// @flow

import type {
  EdgeCorePluginOptions,
  EdgeCurrencyInfo,
  EdgeIo
} from 'edge-core-js/types'

import { asGetActivationCost } from './hederaTypes'

export const getOtherMethods = (
  opts: EdgeCorePluginOptions,
  currencyInfo: EdgeCurrencyInfo,
  io: EdgeIo = opts.io
) => ({
  getActivationSupportedCurrencies: () => ({ result: { ETH: true } }),
  getActivationCost: async () => {
    const creatorApiServer =
      currencyInfo.defaultSettings.otherSettings.creatorApiServers[0]

    try {
      const response = await io.fetch(`${creatorApiServer}/account/cost`)
      return asGetActivationCost(await response.json()).hbar
    } catch (e) {
      opts.log.warn(
        'getActivationCost error unable to get account activation cost',
        e
      )
      throw new Error('ErrorUnableToGetCost')
    }
  },
  validateAccount: () => Promise.resolve({ result: 'AccountAvailable' })
})

export const validAddress = (address: string = ''): boolean => {
  // HIP-15
  return /^(0|(?:[1-9]\d*))\.(0|(?:[1-9]\d*))\.(0|(?:[1-9]\d*))(?:-([a-z]{5}))?$/.test(
    address
  )
}

export const createChecksum = (
  addr: string,
  checksumNetworkID: string
): string => {
  // Adapted from sample code https://github.com/hashgraph/hedera-improvement-proposal/blob/master/HIP/hip-15.md
  let answer = ''
  const d = [] // digits with 10 for ".", so if addr == "0.0.123" then d == [0, 10, 0, 10, 1, 2, 3]
  let sd0 = 0 // sum of even positions (mod 11)
  let sd1 = 0 // sum of odd positions (mod 11)
  let sd = 0 // weighted sum of all positions (mod p3)
  let sh = 0 // hash of the ledger ID
  let c = 0 // the checksum, before the final permutation
  let cp = 0 // the checksum, as a single number
  const p3 = 26 * 26 * 26 // 3 digits in base 26
  const p5 = 26 * 26 * 26 * 26 * 26 // 5 digits in base 26
  const asciiA = 97
  const m = 1_000_003 // min prime greater than a million. Used for the final permutation.
  const w = 31 // sum s of digit values weights them by powers of w. Should be coprime to p5.

  const id = `${checksumNetworkID}000000000000`
  const h = []
  for (let i = 0; i < id.length; i += 2) {
    h.push(parseInt(id.substr(i, 2), 16))
  }
  for (let i = 0; i < addr.length; i++) {
    d.push(addr[i] === '.' ? 10 : parseInt(addr[i], 10))
  }
  for (let i = 0; i < d.length; i++) {
    sd = (w * sd + d[i]) % p3
    if (i % 2 === 0) {
      sd0 = (sd0 + d[i]) % 11
    } else {
      sd1 = (sd1 + d[i]) % 11
    }
  }
  for (let i = 0; i < h.length; i++) {
    sh = (w * sh + h[i]) % p5
  }
  c = ((((addr.length % 5) * 11 + sd0) * 11 + sd1) * p3 + sd + sh) % p5
  cp = (c * m) % p5

  for (let i = 0; i < 5; i++) {
    answer = String.fromCharCode(asciiA + (cp % 26)) + answer
    cp /= 26
  }

  return answer
}
