export const WEI_MULTIPLIER = 1000000000
export const GAS_STATION_WEI_MULTIPLIER = 100000000 // 100 million is the multiplier for ethgasstation because it uses 10x gwei
export const GAS_PRICE_SANITY_CHECK = 30000 // 3000 Gwei (ethgasstation api reports gas prices with additional decimal place)
export const OPTIMAL_FEE_HIGH_MULTIPLIER = 0.75
export const NETWORK_FEES_POLL_MILLISECONDS = 60 * 10 * 1000 // 10 minutes
