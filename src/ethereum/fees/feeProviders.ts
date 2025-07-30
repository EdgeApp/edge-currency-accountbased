import { div, mul } from 'biggystring'
import { asMaybe } from 'cleaners'
import {
  EdgeCurrencyInfo,
  EdgeFetchFunction,
  EdgeLog,
  JsonObject
} from 'edge-core-js/types'

import { fetchInfo } from '../../common/network'
import { hexToDecimal, pickRandom } from '../../common/utils'
import {
  GAS_PRICE_SANITY_CHECK,
  OPTIMAL_FEE_HIGH_MULTIPLIER,
  WEI_MULTIPLIER
} from '../ethereumConsts'
import { asEvmGasStation } from '../ethereumSchema'
import {
  asEthereumFees,
  asEvmScanGasResponseResult,
  asRpcResultString,
  EthereumBaseMultiplier,
  EthereumFees,
  EthereumInitOptions,
  EthereumNetworkInfo,
  EvmScanGasResponse
} from '../ethereumTypes'
import { calculateFeeForPriority } from '../feeAlgorithms/ethFeeHistory'
import { EvmScanAdapterConfig } from '../networkAdapters/EvmScanAdapter'
import { RpcAdapterConfig } from '../networkAdapters/RpcAdapter'

export const printFees = (log: EdgeLog, fees: EthereumBaseMultiplier): void => {
  const keys = Object.keys(fees)
  for (const key of keys) {
    // @ts-expect-error
    const value = fees[key]
    if (typeof value === 'string')
      log(`  ${key}: ${div(value, '1000000000', 18)} gwei`)
  }
}

export type FeeProviderFunction = () => Promise<
  EthereumBaseMultiplier | undefined
>
interface FeeProviderMap {
  infoFeeProvider: () => Promise<EthereumFees>
  externalFeeProviders: FeeProviderFunction[]
}

export const FeeProviders = (
  fetch: EdgeFetchFunction,
  currencyInfo: EdgeCurrencyInfo,
  initOptions: EthereumInitOptions,
  log: EdgeLog,
  networkInfo: EthereumNetworkInfo
): FeeProviderMap => {
  const providerFns = [
    fetchFeesFromFeeHistory,
    fetchFeesFromEvmScan,
    fetchFeesFromEvmGasStation,
    fetchFeesFromRpc
  ]

  return {
    infoFeeProvider: async () =>
      await fetchFeesFromInfoServer(fetch, currencyInfo),
    externalFeeProviders: providerFns.map(
      provider => async () =>
        await provider(fetch, currencyInfo, initOptions, log, networkInfo)
    )
  }
}

export const fetchFeesFromFeeHistory = async (
  fetch: EdgeFetchFunction,
  currencyInfo: EdgeCurrencyInfo,
  _initOptions: EthereumInitOptions,
  log: EdgeLog,
  networkInfo: EthereumNetworkInfo
): Promise<EthereumBaseMultiplier | undefined> => {
  const { feeAlgorithm } = networkInfo
  if (feeAlgorithm?.type !== 'eth_feeHistory') return

  // Require EIP1559 to be enabled (the algorithm only works for EIP1559 chains
  // currently). TODO: Add support for non-EIP1559 chains (simply omit priority
  // fee calculations).
  if (networkInfo.supportsEIP1559 !== true) return

  const rpcConfig = networkInfo.networkAdapterConfigs.find(
    (config): config is RpcAdapterConfig => config.type === 'rpc'
  )
  if (rpcConfig == null) return

  try {
    // Calculate fees for each priority level using percentile-based approach
    const [lowResult, standardResult, highResult] = await Promise.all([
      calculateFeeForPriority(
        10,
        fetch,
        rpcConfig.servers,
        log,
        feeAlgorithm.blocksToAnalyze
      ),
      calculateFeeForPriority(
        50,
        fetch,
        rpcConfig.servers,
        log,
        feeAlgorithm.blocksToAnalyze
      ),
      calculateFeeForPriority(
        90,
        fetch,
        rpcConfig.servers,
        log,
        feeAlgorithm.blocksToAnalyze
      )
    ])

    const out = {
      lowFee: lowResult.maxFeePerGas,
      standardFeeLow: standardResult.maxFeePerGas,
      standardFeeHigh: standardResult.maxFeePerGas,
      highFee: highResult.maxFeePerGas
    }

    log(`fetchFeesFromFeeHistory: ${currencyInfo.currencyCode}`)
    printFees(log, out)
    return out
  } catch (error) {
    log.warn(`fetchFeesFromFeeHistory failed: ${String(error)}`)
  }
}

export const fetchFeesFromRpc = async (
  fetch: EdgeFetchFunction,
  currencyInfo: EdgeCurrencyInfo,
  _initOptions: EthereumInitOptions,
  log: EdgeLog,
  networkInfo: EthereumNetworkInfo
): Promise<EthereumBaseMultiplier | undefined> => {
  const { networkAdapterConfigs, supportsEIP1559 = false } = networkInfo
  if (supportsEIP1559) return

  const rpcConfig = networkAdapterConfigs.find(
    (config): config is RpcAdapterConfig => config.type === 'rpc'
  )
  if (rpcConfig == null) return
  const rpcServers = rpcConfig.servers

  const server = pickRandom(rpcServers, 1)[0]

  const opts = {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    method: 'POST',
    body: JSON.stringify({
      method: 'eth_gasPrice',
      params: [],
      id: 1,
      jsonrpc: '2.0'
    })
  }

  const fetchResponse = await fetch(server, opts)
  if (!fetchResponse.ok) {
    const text = await fetchResponse.text()
    throw new Error(`fetchFeesFromRpc fetch error: ${text}`)
  }

  const json = await fetchResponse.json()
  const rpcGasResponse = asMaybe(asRpcResultString)(json)

  if (rpcGasResponse == null) {
    throw new Error(`fetchFeesFromRpc ${server} returned invalid json: ${json}`)
  }

  const { result } = rpcGasResponse
  const gasPrice = hexToDecimal(result)

  const out = {
    lowFee: mul(gasPrice, '1'),
    standardFeeLow: mul(gasPrice, '1.06'),
    standardFeeHigh: mul(gasPrice, '1.12'),
    highFee: mul(gasPrice, '1.25')
  }
  log(`fetchFeesFromRpc: ${currencyInfo.currencyCode}`)
  printFees(log, out)
  return out
}

// This method is deprecated for ETH and other chains that hard forked to EIP 1559
export const fetchFeesFromEvmScan = async (
  fetch: EdgeFetchFunction,
  currencyInfo: EdgeCurrencyInfo,
  initOptions: EthereumInitOptions,
  log: EdgeLog,
  networkInfo: EthereumNetworkInfo
): Promise<EthereumBaseMultiplier | undefined> => {
  const { networkAdapterConfigs } = networkInfo

  const evmScanConfig = networkAdapterConfigs.find(
    (config): config is EvmScanAdapterConfig =>
      config.type === 'evmscan' && config.gastrackerSupport === true
  )
  if (evmScanConfig == null) return

  const evmScanApiServers = evmScanConfig.servers
  if (evmScanApiServers == null) return

  // Select a server first so we can pass it to getEvmScanApiKey
  const server = pickRandom(evmScanApiServers, 1)[0]
  const scanApiKey = getEvmScanApiKey(initOptions, currencyInfo, log, server)
  if (scanApiKey == null) return

  const apiKey = `&apikey=${
    Array.isArray(scanApiKey) ? pickRandom(scanApiKey, 1)[0] : scanApiKey ?? ''
  }`
  const url = `${server}/api?module=gastracker&action=gasoracle${apiKey}`

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
  const newSafeLow = parseFloat(SafeGasPrice)
  let newAverage = parseFloat(ProposeGasPrice)
  let newFast = parseFloat(FastGasPrice)

  // Correct inconsistencies, convert values
  if (newAverage <= newSafeLow) newAverage = newSafeLow + 1
  if (newFast <= newAverage) newFast = newAverage + 1

  const lowFee = `${newSafeLow * WEI_MULTIPLIER}`
  const standardFeeLow = `${((newSafeLow + newAverage) / 2) * WEI_MULTIPLIER}`
  const standardFeeHigh = `${newFast * WEI_MULTIPLIER}`
  const highFee = `${(newFast * WEI_MULTIPLIER) / OPTIMAL_FEE_HIGH_MULTIPLIER}`

  const out = { lowFee, standardFeeLow, standardFeeHigh, highFee }
  log(`fetchFeesFromEvmScan: ${currencyInfo.currencyCode}`)
  printFees(log, out)
  return out
}

export const fetchFeesFromEvmGasStation = async (
  fetch: EdgeFetchFunction,
  currencyInfo: EdgeCurrencyInfo,
  initOptions: EthereumInitOptions,
  log: EdgeLog,
  networkInfo: EthereumNetworkInfo
): Promise<EthereumBaseMultiplier | undefined> => {
  const { evmGasStationUrl } = networkInfo
  const gasStationApiKey = getGasStationApiKey(initOptions, currencyInfo, log)
  if (evmGasStationUrl == null || gasStationApiKey == null) return

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  const apiKeyParams = gasStationApiKey
    ? // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      `?api-key=${gasStationApiKey || ''}`
    : ''
  const result = await fetch(`${evmGasStationUrl}${apiKeyParams}`)
  const jsonObj = await result.json()

  const fees = asEvmGasStation(currencyInfo.pluginId, jsonObj)

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

  lowFee = Math.round(lowFee) * WEI_MULTIPLIER
  standardFeeLow = Math.round(standardFeeLow) * WEI_MULTIPLIER
  standardFeeHigh = Math.round(standardFeeHigh) * WEI_MULTIPLIER
  highFee = Math.round(highFee) * WEI_MULTIPLIER

  const out = {
    lowFee: lowFee.toString(),
    standardFeeLow: standardFeeLow.toString(),
    standardFeeHigh: standardFeeHigh.toString(),
    highFee: highFee.toString()
  }
  log(`fetchFeesFromEvmGasStation: ${currencyInfo.currencyCode}`)
  printFees(log, out)
  return out
}

export const fetchFeesFromInfoServer = async (
  fetch: EdgeFetchFunction,
  { pluginId }: EdgeCurrencyInfo,
  opts: { timeout?: number } = {}
): Promise<EthereumFees> => {
  const result = await fetchInfo(
    `v1/networkFees/${pluginId}`,
    undefined,
    opts.timeout,
    fetch
  )
  const json = await result.json()
  return asEthereumFees(json)
}

// Get API key for Etherscan v2 API or network-specific scan APIs
export const getEvmScanApiKey = (
  initOptions: JsonObject,
  info: EdgeCurrencyInfo,
  log: EdgeLog,
  serverUrl: string
): string | string[] | undefined => {
  const { evmScanApiKey, etherscanApiKey, bscscanApiKey, polygonscanApiKey } =
    initOptions

  const { currencyCode } = info

  // If we have a server URL and it's etherscan.io, use the Ethereum API key
  if (serverUrl.includes('etherscan.io')) {
    if (etherscanApiKey == null)
      throw new Error(`Missing etherscanApiKey for etherscan.io`)
    return etherscanApiKey
  }

  if (evmScanApiKey != null) return evmScanApiKey

  // For networks that don't support Etherscan v2, fall back to network-specific keys
  if (currencyCode === 'ETH' && etherscanApiKey != null) {
    log.warn(
      "INIT OPTION 'etherscanApiKey' IS DEPRECATED. USE 'evmScanApiKey' INSTEAD"
    )
    return etherscanApiKey
  }
  if (currencyCode === 'BNB' && bscscanApiKey != null) {
    log.warn(
      "INIT OPTION 'bscscanApiKey' IS DEPRECATED. USE 'evmScanApiKey' INSTEAD"
    )
    return bscscanApiKey
  }
  if (currencyCode === 'POL' && polygonscanApiKey != null) {
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
