import { expect } from 'chai'
import { EdgeLog } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { getEvmScanApiKey } from '../../../src/ethereum/fees/feeProviders'
import { currencyInfo as info } from '../../../src/ethereum/info/ethereumInfo'

describe('getEvmScanApiKey', function () {
  const etherscanServer = 'https://api.etherscan.io'
  const otherScanServer = 'https://api.routescan.io'

  const warnings: string[] = []
  const log = Object.assign(() => {}, {
    warn: (...args: any[]) => {
      warnings.push(String(args[0]))
    },
    error: () => {},
    crash: () => {}
  }) as unknown as EdgeLog

  it('uses evmScanApiKey for etherscan.io', function () {
    // A build configured with only the supported option must work. Preferring
    // the deprecated etherscanApiKey here left transaction history unsynced.
    const out = getEvmScanApiKey(
      { evmScanApiKey: ['key1'] },
      info,
      log,
      etherscanServer
    )
    expect(out).deep.equals(['key1'])
  })

  it('uses evmScanApiKey for non-etherscan.io servers', function () {
    const out = getEvmScanApiKey(
      { evmScanApiKey: ['key1'] },
      info,
      log,
      otherScanServer
    )
    expect(out).deep.equals(['key1'])
  })

  it('falls back to the deprecated etherscanApiKey when evmScanApiKey is an empty array', function () {
    // The GUI defaults evmScanApiKey to [], so an empty array means unconfigured:
    const out = getEvmScanApiKey(
      { evmScanApiKey: [], etherscanApiKey: ['legacy'] },
      info,
      log,
      etherscanServer
    )
    expect(out).deep.equals(['legacy'])
  })

  it('falls back to the deprecated etherscanApiKey when evmScanApiKey is absent', function () {
    const out = getEvmScanApiKey(
      { etherscanApiKey: ['legacy'] },
      info,
      log,
      etherscanServer
    )
    expect(out).deep.equals(['legacy'])
  })

  it('throws for etherscan.io when no usable key is configured', function () {
    expect(() =>
      getEvmScanApiKey({ evmScanApiKey: [] }, info, log, etherscanServer)
    ).to.throw('Missing evmScanApiKey for etherscan.io')
  })
})
