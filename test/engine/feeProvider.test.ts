import { assert } from 'chai'
import { describe, it } from 'mocha'
import fetch from 'node-fetch'

import {
  fetchFeesFromEvmGasStation,
  fetchFeesFromEvmScan,
  fetchFeesFromInfoServer
} from '../../src/ethereum/fees/feeProviders'
import { currencyInfo as ethCurrencyInfo } from '../../src/ethereum/info/ethInfo'
import { currencyInfo as ftmCurrencyInfo } from '../../src/ethereum/info/ftmInfo'
import { fakeLog } from '../fakeLog'

// TODO: Loop for all plugins
describe(`FTM Network Fees`, function () {
  it('Validate Info Server Fees', async function () {
    const fees = await fetchFeesFromInfoServer(fetch, ftmCurrencyInfo)
    // @ts-expect-error
    validateGasPrices(fees.default.gasPrice, true)
    // Info server should provide gas limit as well
    // @ts-expect-error
    assert.equal(fees.default.gasLimit.regularTransaction, '21000')
    // @ts-expect-error
    assert.equal(fees.default.gasLimit.tokenTransaction, '300000')
  })

  it('EvmGasStation Fees', async function () {
    const fees = await fetchFeesFromEvmGasStation(
      fetch,
      ethCurrencyInfo,
      {
        gasStationApiKey: 'D925MHYVPJH3ZBSJKES5EFC876FFMW3ZHX'
      },
      fakeLog
    )
    validateGasPrices(fees)
  })

  it('EvmScan Fees', async function () {
    const fees = await fetchFeesFromEvmScan(
      fetch,
      ftmCurrencyInfo,
      {
        evmScanApiKey: [
          'EG16P5AF5FNJ3XR8ICP3UAYHT68G53TAKU',
          '63YA67UBCWPG6SEREC9GNRRR31SDPGSQY9',
          'D925MHYVPJH3ZBSJKES5EFC876FFMW3ZHX'
        ]
      },
      fakeLog
    )
    validateGasPrices(fees)
  })
})

// @ts-expect-error
const validateGasPrices = (gasPrice, isInfoServer = false) => {
  const lowFee = parseInt(gasPrice.lowFee)
  const standardFeeLow = parseInt(gasPrice.standardFeeLow)
  const standardFeeHigh = parseInt(gasPrice.standardFeeHigh)
  const highFee = parseInt(gasPrice.highFee)
  const standardFeeLowAmount = parseInt(gasPrice.standardFeeLowAmount)
  const standardFeeHighAmount = parseInt(gasPrice.standardFeeHighAmount)

  // Check existence of required values
  assert.isNotNaN(gasPrice)
  assert.isNotNaN(lowFee)
  assert.isNotNaN(standardFeeLow)
  assert.isNotNaN(standardFeeHigh)
  assert.isNotNaN(highFee)

  // Check value ordering
  assert.isTrue(lowFee < standardFeeLow)
  assert.isTrue(standardFeeLow < standardFeeHigh)
  assert.isTrue(standardFeeHigh < highFee)

  // Info server should fill out everything
  if (isInfoServer) {
    assert.isNotNaN(standardFeeLowAmount)
    assert.isNotNaN(standardFeeHighAmount)
    assert.isTrue(standardFeeLowAmount < standardFeeHighAmount)
  }
}
