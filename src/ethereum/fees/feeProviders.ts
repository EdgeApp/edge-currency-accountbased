import { div } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeFetchFunction,
  EdgeLog,
  JsonObject
} from 'edge-core-js'

import {
  getEdgeInfoServer,
  pickRandom,
  validateObject
} from '../../common/utils'
import {
  GAS_PRICE_SANITY_CHECK,
  GAS_STATION_WEI_MULTIPLIER,
  OPTIMAL_FEE_HIGH_MULTIPLIER,
  WEI_MULTIPLIER
} from '../ethConsts'
import { EthGasStationSchema } from '../ethSchema'
import {
  asEthereumFees,
  asEvmScanGasResponseResult,
  EthereumBaseMultiplier,
  EthereumFee,
  EthereumInitOptions,
  EvmScanGasResponse
} from '../ethTypes'

export const printFees = (log: EdgeLog, fees: Object) => {
  const keys = Object.keys(fees)
  for (const key of keys) {
    const value = fees[key]
    if (typeof value === 'string')
      log.warn(`  ${key}: ${div(value, '1000000000', 18)} gwei`)
  }
}

export type FeeProviderFunction = () => Promise<
  EthereumBaseMultiplier | undefined
>
interface FeeProviderMap {
  infoFeeProvider: () => Promise<EthereumFee>
  externalFeeProviders: FeeProviderFunction[]
}

export const FeeProviders = (
  fetch: EdgeFetchFunction,
  currencyInfo: EdgeCurrencyInfo,
  initOptions: EthereumInitOptions,
  log: EdgeLog
): FeeProviderMap => {
  const providerFns = [fetchFeesFromEvmScan, fetchFeesFromEvmGasStation]

  return {
    infoFeeProvider: async () =>
      await fetchFeesFromInfoServer(fetch, currencyInfo),
    externalFeeProviders: providerFns.map(
      provider => async () =>
        await provider(fetch, currencyInfo, initOptions, log)
    )
  }
}

// This method is deprecated for ETH and other chains that hard forked to EIP 1559
export const fetchFeesFromEvmScan = async (
  fetch: EdgeFetchFunction,
  currencyInfo: EdgeCurrencyInfo,
  initOptions: EthereumInitOptions,
  log: EdgeLog
): Promise<EthereumBaseMultiplier | undefined> => {
  const evmScanApiServers =
    currencyInfo.defaultSettings.otherSettings.evmScanApiServers
  const scanApiKey = getEvmScanApiKey(initOptions, currencyInfo, log)
  if (evmScanApiServers == null || scanApiKey == null) return

  const apiKey = `&apikey=${
    Array.isArray(scanApiKey) ? pickRandom(scanApiKey, 1)[0] : scanApiKey ?? ''
  }`
  const url = `${
    pickRandom(evmScanApiServers, 1)[0]
  }/api?module=gastracker&action=gasoracle${apiKey}`

  const fetchResponse = await fetch(url)
  if (!fetchResponse.ok)
    throw new Error(`EvmScan fetch error: ${JSON.stringify(fetchResponse)}`)

  const esGasResponse: EvmScanGasResponse = await fetchResponse.json()
  const isRateLimited = esGasResponse.message.includes('NOTOK')
  const isValid = esGasResponse != null && !isRateLimited

  if (!isValid) {
    throw new Error(
      `fetchFeesFromEvmScan unrecognized response message: ${esGasResponse.message}`
    )
  }

  const { SafeGasPrice, ProposeGasPrice, FastGasPrice } =
    asEvmScanGasResponseResult(esGasResponse.result)
  const newSafeLow = parseInt(SafeGasPrice)
  let newAverage = parseInt(ProposeGasPrice)
  let newFast = parseInt(FastGasPrice)

  // Correct inconsistencies, convert values
  if (newAverage <= newSafeLow) newAverage = newSafeLow + 1
  if (newFast <= newAverage) newFast = newAverage + 1

  const lowFee = `${newSafeLow * WEI_MULTIPLIER}`
  const standardFeeLow = `${((newSafeLow + newAverage) / 2) * WEI_MULTIPLIER}`
  const standardFeeHigh = `${newFast * WEI_MULTIPLIER}`
  const highFee = `${(newFast * WEI_MULTIPLIER) / OPTIMAL_FEE_HIGH_MULTIPLIER}`

  const out = { lowFee, standardFeeLow, standardFeeHigh, highFee }
  log.warn(`fetchFeesFromEvmScan: ${currencyInfo.currencyCode}`)
  printFees(log, out)
  return out
}

export const fetchFeesFromEvmGasStation = async (
  fetch: EdgeFetchFunction,
  currencyInfo: EdgeCurrencyInfo,
  initOptions: EthereumInitOptions,
  log: EdgeLog
): Promise<EthereumBaseMultiplier | undefined> => {
  const { ethGasStationUrl } = currencyInfo.defaultSettings.otherSettings
  const gasStationApiKey = getGasStationApiKey(initOptions, currencyInfo, log)
  if (ethGasStationUrl == null || gasStationApiKey == null) return

  const apiKeyParams = gasStationApiKey
    ? `?api-key=${gasStationApiKey || ''}`
    : ''
  const result = await fetch(`${ethGasStationUrl}${apiKeyParams}`)
  const jsonObj = await result.json()

  if (!validateObject(jsonObj, EthGasStationSchema)) {
    throw new Error(`Error: Fetched invalid networkFees from EthGasStation`)
  }

  const fees = { ...jsonObj }
  // Special case for MATIC fast and fastest being equivalent from gas station
  if (currencyInfo.currencyCode === 'MATIC') {
    // Since the later code assumes EthGasStation's
    // greater-by-a-factor-of-ten gas prices, we need to multiply the GWEI
    // from Polygon Gas Station by 10 so they conform.
    fees.safeLow *= 10
    fees.average = ((jsonObj.fast + jsonObj.safeLow) / 2) * 10
    fees.fast = jsonObj.standard * 10
    fees.fastest *= 10
  }

  // Sanity checks
  if (fees.safeLow <= 0 || fees.safeLow > GAS_PRICE_SANITY_CHECK) {
    throw new Error('Invalid safeLow value from Gas Station')
  }
  if (fees.average < 1 || fees.average > GAS_PRICE_SANITY_CHECK) {
    throw new Error('Invalid average value from Gas Station')
  }
  if (fees.fast < 1 || fees.fast > GAS_PRICE_SANITY_CHECK) {
    throw new Error('Invalid fastest value from Gas Station')
  }
  if (fees.fastest < 1 || fees.fastest > GAS_PRICE_SANITY_CHECK) {
    throw new Error('Invalid fastest value from Gas Station')
  }

  // Correct inconsistencies, set gas prices
  if (fees.average <= fees.safeLow) fees.average = fees.safeLow + 1
  if (fees.fast <= fees.average) fees.fast = fees.average + 1
  if (fees.fastest <= fees.fast) fees.fastest = fees.fast + 1

  let lowFee = fees.safeLow
  let standardFeeLow = fees.fast
  let standardFeeHigh = ((fees.fast + fees.fastest) * 0.5 + fees.fastest) * 0.5
  let highFee = standardFeeHigh > fees.fastest ? standardFeeHigh : fees.fastest

  lowFee = (Math.round(lowFee) * GAS_STATION_WEI_MULTIPLIER).toString()
  standardFeeLow = (
    Math.round(standardFeeLow) * GAS_STATION_WEI_MULTIPLIER
  ).toString()
  standardFeeHigh = (
    Math.round(standardFeeHigh) * GAS_STATION_WEI_MULTIPLIER
  ).toString()
  highFee = (Math.round(highFee) * GAS_STATION_WEI_MULTIPLIER).toString()

  const out = { lowFee, standardFeeLow, standardFeeHigh, highFee }
  log.warn(`fetchFeesFromEvmGasStation: ${currencyInfo.currencyCode}`)
  printFees(log, out)
  return out
}

export const fetchFeesFromInfoServer = async (
  fetch: EdgeFetchFunction,
  { currencyCode }: EdgeCurrencyInfo
): Promise<EthereumFee> => {
  const infoServer = getEdgeInfoServer()
  const url = `${infoServer}/v1/networkFees/${currencyCode}`
  const result = await fetch(url)
  return asEthereumFees(await result.json())
}

// Backwards compatibility with deprecated etherscan api keys
export const getEvmScanApiKey = (
  initOptions: JsonObject,
  info: EdgeCurrencyInfo,
  log: EdgeLog
): string | string[] | undefined => {
  const {
    evmScanApiKey,
    etherscanApiKey,
    ftmscanApiKey,
    bscscanApiKey,
    polygonscanApiKey
  } = initOptions
  if (evmScanApiKey != null) return evmScanApiKey
  const { currencyCode } = info
  if (currencyCode === 'ETH' && etherscanApiKey != null) {
    log.warn(
      "INIT OPTION 'etherscanApiKey' IS DEPRECATED. USE 'evmScanApiKey' INSTEAD"
    )
    return etherscanApiKey
  }
  if (currencyCode === 'FTM' && ftmscanApiKey != null) {
    log.warn(
      "INIT OPTION 'ftmscanApiKey' IS DEPRECATED. USE 'evmScanApiKey' INSTEAD"
    )
    return ftmscanApiKey
  }
  if (currencyCode === 'BNB' && bscscanApiKey != null) {
    log.warn(
      "INIT OPTION 'bscscanApiKey' IS DEPRECATED. USE 'evmScanApiKey' INSTEAD"
    )
    return bscscanApiKey
  }
  if (currencyCode === 'MATIC' && polygonscanApiKey != null) {
    log.warn(
      "INIT OPTION 'polygonscanApiKey' IS DEPRECATED. USE 'evmScanApiKey' INSTEAD"
    )
    return polygonscanApiKey
  }
}

// Backwards compatibility with deprecated ethgasstation api keys
export const getGasStationApiKey = (
  initOptions: JsonObject,
  info: EdgeCurrencyInfo,
  log: EdgeLog
): string | undefined => {
  const { gasStationApiKey, ethGasStationApiKey } = initOptions
  if (gasStationApiKey != null) return gasStationApiKey
  const { currencyCode } = info
  if (currencyCode === 'ETH' && ethGasStationApiKey != null) {
    log.warn(
      "INIT OPTION 'ethGasStationApiKey' IS DEPRECATED. USE 'gasStationApiKey' INSTEAD"
    )
    return ethGasStationApiKey
  }
}
