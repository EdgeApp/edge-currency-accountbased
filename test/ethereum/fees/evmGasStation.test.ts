import { expect } from 'chai'
import { EdgeCurrencyInfo, EdgeFetchFunction } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { EthereumNetworkInfo } from '../../../src/ethereum/ethereumTypes'
import { fetchFeesFromEvmGasStation } from '../../../src/ethereum/fees/feeProviders'
import { fakeLog } from '../../fake/fakeLog'

const GAS_STATION_URL = 'https://gasstation.example.com/v2'

describe('fetchFeesFromEvmGasStation', function () {
  const currencyInfo = {
    pluginId: 'polygon',
    currencyCode: 'POL'
  } as unknown as EdgeCurrencyInfo

  const makeNetworkInfo = (
    evmGasStationUrl: string | null
  ): EthereumNetworkInfo =>
    ({ evmGasStationUrl } as unknown as EthereumNetworkInfo)

  // Records each requested URL and answers like Polygon's gas station (gwei):
  const makeFetch = (): { fetch: EdgeFetchFunction; urls: string[] } => {
    const urls: string[] = []
    const fetch = (async (url: string) => {
      urls.push(url)
      return {
        ok: true,
        json: async () => ({
          safeLow: { maxPriorityFee: 25, maxFee: 300 },
          standard: { maxPriorityFee: 30, maxFee: 320 },
          fast: { maxPriorityFee: 35, maxFee: 400 }
        })
      }
    }) as unknown as EdgeFetchFunction
    return { fetch, urls }
  }

  it('fetches fees without a key when the init options have none', async function () {
    const { fetch, urls } = makeFetch()

    const fees = await fetchFeesFromEvmGasStation(
      fetch,
      currencyInfo,
      {},
      fakeLog,
      makeNetworkInfo(GAS_STATION_URL)
    )

    expect(urls).to.deep.equal([GAS_STATION_URL])
    expect(fees).to.deep.equal({
      lowFee: '300000000000',
      standardFeeLow: '400000000000',
      standardFeeHigh: '475000000000',
      highFee: '500000000000'
    })
  })

  it('fetches fees without a key when the key is empty', async function () {
    const { fetch, urls } = makeFetch()

    const fees = await fetchFeesFromEvmGasStation(
      fetch,
      currencyInfo,
      { gasStationApiKey: '' },
      fakeLog,
      makeNetworkInfo(GAS_STATION_URL)
    )

    expect(urls).to.deep.equal([GAS_STATION_URL])
    expect(fees?.lowFee).to.equal('300000000000')
  })

  it('sends the key when the init options have one', async function () {
    const { fetch, urls } = makeFetch()

    const fees = await fetchFeesFromEvmGasStation(
      fetch,
      currencyInfo,
      { gasStationApiKey: 'test-key' },
      fakeLog,
      makeNetworkInfo(GAS_STATION_URL)
    )

    expect(urls).to.deep.equal([`${GAS_STATION_URL}?api-key=test-key`])
    expect(fees?.lowFee).to.equal('300000000000')
  })

  it('skips chains without a gas station', async function () {
    const { fetch, urls } = makeFetch()

    const fees = await fetchFeesFromEvmGasStation(
      fetch,
      currencyInfo,
      { gasStationApiKey: 'test-key' },
      fakeLog,
      makeNetworkInfo(null)
    )

    expect(urls).to.deep.equal([])
    expect(fees).to.equal(undefined)
  })
})
