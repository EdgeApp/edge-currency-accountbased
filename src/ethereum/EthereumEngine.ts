import { Common } from '@ethereumjs/common'
import { TransactionFactory, TypedTxData } from '@ethereumjs/tx'
import { add, ceil, div, gt, lt, lte, max, mul, sub } from 'biggystring'
import { asMaybe, asObject, asOptional, asString } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeEngineSyncNetworkOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSignMessageOptions,
  EdgeSpendInfo,
  EdgeSpendTarget,
  EdgeTokenId,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError,
  PendingFundsError
} from 'edge-core-js/types'
// eslint-disable-next-line camelcase
import { signTypedData_v4 } from 'eth-sig-util'
import abi from 'ethereumjs-abi'
import EthereumUtil from 'ethereumjs-util'
import ethWallet from 'ethereumjs-wallet'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  RetryCancelledError,
  retryWithBackoff
} from '../common/retryWithBackoff'
import { makeTokenSyncTracker, TokenSyncTracker } from '../common/SyncTracker'
import {
  biggyRoundToNearestInt,
  cleanTxLogs,
  decimalToHex,
  getOtherParams,
  hexToBuf,
  hexToDecimal,
  isHex,
  makeEngineFetch,
  mergeDeeply,
  normalizeAddress,
  pickRandomOne,
  removeHexPrefix,
  shuffleArray,
  toHex,
  uint8ArrayToHex
} from '../common/utils'
import {
  NETWORK_FEES_POLL_MILLISECONDS,
  ROLLUP_FEE_PARAMS,
  WEI_MULTIPLIER
} from './ethereumConsts'
import { isKnownRetriableError, RetriableError } from './ethereumErrors'
import { EthereumNetwork, getFeeRateUsed, RpcMethod } from './EthereumNetwork'
import { asEIP712TypedData } from './ethereumSchema'
import { EthereumTools } from './EthereumTools'
import {
  asEthereumInitOptions,
  asEthereumPrivateKeys,
  asEthereumSignMessageParams,
  asEthereumTxOtherParams,
  asEthereumUserSettings,
  asEthereumWalletOtherData,
  asRpcResultString,
  asSafeEthWalletInfo,
  CalcOptimismRollupFeeParams,
  DecoyAddressConfig,
  EIP712TypedDataParam,
  EthereumBaseMultiplier,
  EthereumEstimateGasParams,
  EthereumFee,
  EthereumFees,
  EthereumInitOptions,
  EthereumMiningFees,
  EthereumNetworkInfo,
  EthereumOtherMethods,
  EthereumPrivateKeys,
  EthereumTxOtherParams,
  EthereumTxParameterInformation,
  EthereumUserSettings,
  EthereumUtils,
  EthereumWalletOtherData,
  EvmWcRpcPayload,
  KeysOfEthereumBaseMultiplier,
  OptimismRollupParams,
  SafeEthWalletInfo,
  TxRpcParams
} from './ethereumTypes'
import {
  calcArbitrumRollupFees,
  calcMiningFees,
  calcOptimismRollupFees,
  getFeeParamsByTransactionType
} from './fees/ethMiningFees'
import {
  FeeProviderFunction,
  FeeProviders,
  printFees
} from './fees/feeProviders'
import { RpcAdapter } from './networkAdapters/RpcAdapter'

// How long to wait before the next scheduled sync
const SYNC_NETWORK_INTERVAL = 20000
const DECOY_ADDRESS_GEN_DELAY_MS = 10000
// Temporarily disable decoy address functionality
const DECOY_ADDRESSES_ENABLED = false

export class EthereumEngine extends CurrencyEngine<
  EthereumTools,
  SafeEthWalletInfo,
  TokenSyncTracker
> {
  declare currentSettings: EthereumUserSettings
  otherData!: EthereumWalletOtherData
  // Cache of last max-spend computation for native sends on OP chains
  private lastMaxSpendable?: {
    nativeAmount: string
    l1Fee: string
    gasPrice: string
    gasLimit: string
  }

  lightMode: boolean
  initOptions: EthereumInitOptions
  networkInfo: EthereumNetworkInfo
  ethNetwork: EthereumNetwork
  engineFetch: EdgeFetchFunction
  otherMethods: EthereumOtherMethods
  utils: EthereumUtils
  infoFeeProvider: () => Promise<EthereumFees>
  externalFeeProviders: FeeProviderFunction[]
  optimismRollupParams?: OptimismRollupParams
  private syncNetworkAbortController?: AbortController

  constructor(
    env: PluginEnvironment<EthereumNetworkInfo>,
    tools: EthereumTools,
    walletInfo: SafeEthWalletInfo,
    initOptions: EthereumInitOptions,
    opts: EdgeCurrencyEngineOptions,
    currencyInfo: EdgeCurrencyInfo
  ) {
    super(env, tools, walletInfo, opts, makeTokenSyncTracker)
    this.lightMode = opts.lightMode ?? false
    this.initOptions = initOptions
    this.networkInfo = env.networkInfo
    this.ethNetwork = new EthereumNetwork(this)
    if (this.networkInfo.optimismRollup === true) {
      this.optimismRollupParams = {
        baseFee: '1000000000',
        baseFeeScalar: '1368',
        blobBaseFee: '1',
        blobBaseFeeScalar: '659851'
      }
    }
    this.engineFetch = makeEngineFetch(env.io, () => {
      const networkPrivacy = this.currentSettings?.networkPrivacy
      return networkPrivacy === 'nym' ? { privacy: 'nym' } : {}
    })

    // Update network fees from other providers
    const { infoFeeProvider, externalFeeProviders } = FeeProviders(
      this.engineFetch,
      this.currencyInfo,
      this.initOptions,
      this.log,
      this.networkInfo
    )
    this.infoFeeProvider = infoFeeProvider
    this.externalFeeProviders = [
      ...externalFeeProviders,
      this.updateNetworkFeesFromBaseFeePerGas
    ]

    this.utils = {
      signTypedData: (
        typedData: EIP712TypedDataParam,
        privateKeys: EthereumPrivateKeys
      ) => {
        // Adapted from https://github.com/ethereum/EIPs/blob/master/assets/eip-712/Example.js
        const clean = asEIP712TypedData(typedData)

        const privKey = Buffer.from(privateKeys.privateKey, 'hex')
        const { types } = clean

        // Recursively finds all the dependencies of a type
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        function dependencies(primaryType, found = []) {
          // @ts-expect-error
          if (found.includes(primaryType)) {
            return found
          }
          if (types[primaryType] === undefined) {
            return found
          }
          // @ts-expect-error
          found.push(primaryType)
          for (const field of types[primaryType]) {
            for (const dep of dependencies(field.type, found)) {
              if (!found.includes(dep)) {
                found.push(dep)
              }
            }
          }
          return found
        }

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        function encodeType(primaryType: string) {
          // Get dependencies primary first, then alphabetical
          let deps = dependencies(primaryType)
          deps = deps.filter(t => t !== primaryType)
          // @ts-expect-error
          // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
          deps = [primaryType].concat(deps.sort())

          // Format as a string with fields
          let result = ''
          for (const type of deps) {
            result += `${type}(${types[type]
              .map(({ name, type }) => `${type} ${name}`)
              .join(',')})`
          }
          return result
        }

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        function typeHash(primaryType: string) {
          return EthereumUtil.keccak256(encodeType(primaryType))
        }

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        function encodeData(primaryType: string, data: any) {
          const encTypes = []
          const encValues = []

          // Add typehash
          encTypes.push('bytes32')
          encValues.push(typeHash(primaryType))

          // Add field contents
          for (const field of types[primaryType]) {
            let value = data[field.name]
            if (field.type === 'string' || field.type === 'bytes') {
              encTypes.push('bytes32')
              value = EthereumUtil.keccak256(value)
              encValues.push(value)
            } else if (types[field.type] !== undefined) {
              encTypes.push('bytes32')
              value = EthereumUtil.keccak256(encodeData(field.type, value))
              encValues.push(value)
            } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
              throw new Error('Arrays currently unimplemented in encodeData')
            } else {
              encTypes.push(field.type)
              encValues.push(value)
            }
          }

          return abi.rawEncode(encTypes, encValues)
        }

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        function structHash(primaryType: string, data: any) {
          return EthereumUtil.keccak256(encodeData(primaryType, data))
        }

        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        function signHash() {
          return EthereumUtil.keccak256(
            Buffer.concat([
              Buffer.from('1901', 'hex'),
              structHash('EIP712Domain', clean.domain),
              structHash(clean.primaryType, clean.message)
            ])
          )
        }

        const sig = EthereumUtil.ecsign(signHash(), privKey)
        const { v, r, s } = sig

        return EthereumUtil.bufferToHex(
          Buffer.concat([
            EthereumUtil.setLengthLeft(r, 32),
            EthereumUtil.setLengthLeft(s, 32),
            EthereumUtil.toBuffer(v)
          ])
        )
      },

      txRpcParamsToSpendInfo: (params: TxRpcParams) => {
        const spendTarget: EdgeSpendTarget = { otherParams: params }
        if (params.to != null) {
          spendTarget.publicAddress = params.to
        }
        if (params.value != null) {
          spendTarget.nativeAmount = hexToDecimal(params.value)
        } else {
          spendTarget.nativeAmount = '0'
        }

        let networkFeeOption: 'custom' | undefined
        let gasLimit
        let gasPrice
        if (params.gas != null) {
          gasLimit = hexToDecimal(params.gas)
          networkFeeOption = 'custom'
        }
        if (params.gasPrice != null) {
          gasPrice = div(
            hexToDecimal(params.gasPrice),
            WEI_MULTIPLIER.toString(),
            18
          )
          networkFeeOption = 'custom'
        }

        const spendInfo: EdgeSpendInfo = {
          tokenId: null,
          spendTargets: [spendTarget],
          memos: [
            {
              type: 'hex',
              value: removeHexPrefix(params.data),
              hidden: true,
              memoName: 'data'
            }
          ],
          networkFeeOption,
          customNetworkFee: {
            gasLimit,
            gasPrice
          },
          otherParams: params
        }

        return spendInfo
      }
    }

    this.otherMethods = {
      parseWalletConnectV2Payload: async (payload: EvmWcRpcPayload) => {
        try {
          let nativeAmount = '0'
          let networkFee = '0'

          switch (payload.method) {
            case 'eth_sendTransaction':
            case 'eth_signTransaction': {
              const txParam = asObject({
                from: asString,
                to: asOptional(asString),
                data: asString,
                gas: asOptional(asString),
                gasPrice: asOptional(asString),
                value: asOptional(asString)
              })(payload.params[0])

              const { gas, gasPrice, value } = txParam

              // Finish calculating the network fee using the gas limit
              const deriveNetworkFee = (gasLimit: string): void => {
                if (gas == null) {
                  txParam.gas = decimalToHex(gasLimit)
                } else {
                  gasLimit = hexToDecimal(gas)
                }

                let gasPriceNetworkFee =
                  this.networkInfo.networkFees.default.gasPrice
                    ?.standardFeeHigh ?? '0'
                if (gasPrice == null) {
                  txParam.gasPrice = decimalToHex(gasPriceNetworkFee)
                } else {
                  gasPriceNetworkFee = hexToDecimal(gasPrice)
                }

                networkFee = mul(gasLimit, gasPriceNetworkFee)
              }

              if (value != null) {
                nativeAmount = hexToDecimal(value)
              }

              // Get the gasLimit from currency info or from RPC node:
              if (
                this.networkInfo.networkFees.default.gasLimit
                  ?.tokenTransaction == null
              ) {
                this.ethNetwork
                  .multicastRpc('eth_estimateGas', [txParam])
                  .then((estimateGasResult: any) => {
                    const gasLimit = add(
                      parseInt(estimateGasResult.result.result, 16).toString(),
                      '0'
                    )
                    deriveNetworkFee(gasLimit)
                  })
                  .catch((error: any) => {
                    this.warn(
                      `Wallet connect call_request failed to get gas limit`,
                      error
                    )
                  })
              } else {
                deriveNetworkFee(
                  this.networkInfo.networkFees.default.gasLimit
                    ?.tokenTransaction
                )
              }
              break
            }
          }

          return {
            nativeAmount,
            networkFee,
            tokenId: null
          }
        } catch (e: any) {
          this.warn(`Wallet connect call_request `, e)
          throw e
        }
      },
      txRpcParamsToSpendInfo: async (
        params: TxRpcParams
      ): Promise<EdgeSpendInfo> => {
        return this.utils.txRpcParamsToSpendInfo(params)
      }
    }
  }

  /**
   * Returns the gasLimit from eth_estimateGas RPC call.
   */
  async estimateGasLimit(context: {
    contractAddress: string | undefined
    estimateGasParams: EthereumEstimateGasParams
    miningFees: EthereumMiningFees
    publicAddress: string
  }): Promise<string> {
    const { estimateGasParams, miningFees } = context
    const hasUserMemo = estimateGasParams[0].data != null

    let gasLimitReturn = miningFees.gasLimit
    try {
      // Determine if recipient is a normal or contract address
      const getCodeResult = await this.ethNetwork.multicastRpc('eth_getCode', [
        estimateGasParams[0].to,
        'latest'
      ])
      // result === '0x' means we are sending to a plain address (no contract)
      const sendingToContract = getCodeResult.result.result !== '0x'

      const tryEstimatingGasLimit = async (
        attempt: number = 0
      ): Promise<void> => {
        const defaultGasLimit = this.networkInfo.networkFees.default.gasLimit
        try {
          // On OP-stack chains (e.g., BOB/Base/Optimism), always estimate even
          // for plain ETH sends, since some nodes require >21000.
          if (
            defaultGasLimit != null &&
            !sendingToContract &&
            !hasUserMemo &&
            this.optimismRollupParams == null
          ) {
            // Easy case of sending plain mainnet token with no memo/data
            gasLimitReturn = defaultGasLimit.regularTransaction
          } else {
            const estimateGasResult = await this.ethNetwork.multicastRpc(
              'eth_estimateGas',
              estimateGasParams
            )
            gasLimitReturn = add(
              parseInt(estimateGasResult.result.result, 16).toString(),
              '0'
            )
            if (sendingToContract) {
              // Overestimate (double) gas limit to reduce chance of failure when sending
              // to a contract. This includes sending any ERC20 token, sending ETH
              // to a contract, sending tokens to a contract, or any contract
              // execution (ie approvals, unstaking, etc)
              gasLimitReturn = mul(gasLimitReturn, '2')
            }
          }
        } catch (e: any) {
          // If no defaults, then we must estimate by RPC, so try again
          if (defaultGasLimit == null) {
            if (attempt > 5)
              throw new Error(
                'Unable to estimate gas limit after 5 tries. Please try again later'
              )
            return await tryEstimatingGasLimit(attempt + 1)
          }

          // If makeSpend received an explicit memo/data field from caller,
          // assume this is a smart contract call that needs accurate gasLimit
          // estimation and fail if we weren't able to get estimates from an
          // RPC node.
          if (hasUserMemo) {
            throw new Error(
              'Unable to estimate gas limit. Please try again later'
            )
          }
          // If we know the address is a contract but estimateGas fails use the default token gas limit
          if (defaultGasLimit.tokenTransaction != null)
            gasLimitReturn = defaultGasLimit.tokenTransaction
        }
      }

      await tryEstimatingGasLimit()

      // Sanity check calculated value
      if (
        lt(
          gasLimitReturn,
          this.networkInfo.networkFees.default.gasLimit?.minGasLimit ?? '21000'
        )
      ) {
        // Revert gasLimit back to the value from calcMiningFee
        gasLimitReturn = miningFees.gasLimit
        throw new Error('Calculated gasLimit less than minimum')
      }

      // BOB: Use RPC estimate as-is; amount computation will reserve extra.
    } catch (e: any) {
      this.error(`makeSpend Error determining gas limit `, e)
    }

    return gasLimitReturn
  }

  setOtherData(raw: any): void {
    const otherData = asEthereumWalletOtherData(raw)
    this.otherData = otherData
  }

  /**
   *  Fetch network fees from various providers in order of priority, stopping
   *  and writing upon successful result.
   */
  async updateNetworkFees(): Promise<void> {
    // Update network gasPrice:
    for (const externalFeeProvider of this.externalFeeProviders) {
      try {
        const ethereumFee = await externalFeeProvider()
        if (ethereumFee == null) continue

        const ethereumFeeInts: { [key: string]: string } = {}
        Object.keys(ethereumFee).forEach(key => {
          const k = key as KeysOfEthereumBaseMultiplier
          ethereumFeeInts[k] = biggyRoundToNearestInt(ethereumFee[k])
        })
        if (this.networkInfo.networkFees.default.gasPrice != null) {
          this.networkInfo.networkFees.default.gasPrice = {
            ...this.networkInfo.networkFees.default.gasPrice,
            ...ethereumFeeInts
          }
        }
        break
      } catch (e: any) {
        this.error(
          `Error fetching fees from ${
            externalFeeProvider.name
          }. ${JSON.stringify(e)}`
        )
      }
    }

    // Update network baseFee:
    if (this.networkInfo.supportsEIP1559 === true) {
      try {
        const baseFee = await this.ethNetwork.getBaseFeePerGas()
        if (baseFee == null) return
        this.networkInfo.networkFees.default.baseFee = baseFee
      } catch (error: any) {
        this.error(`Error fetching base fee: ${JSON.stringify(error)}`)
      }
    }
  }

  async updateOptimismRollupParams(): Promise<void> {
    if (this.optimismRollupParams == null) return

    const oracleContractAddress = '0x420000000000000000000000000000000000000F'

    // Base fee
    try {
      const params = {
        to: oracleContractAddress,
        data: '0x519b4bd3' // L1 base fee method
      }
      const response = await this.ethNetwork.multicastRpc('eth_call', [
        params,
        'latest'
      ])
      const result = asRpcResultString(response.result)

      this.optimismRollupParams = {
        ...this.optimismRollupParams,
        baseFee: ceil(
          mul(
            hexToDecimal(result.result),
            '1.25' // maxGasPriceL1Multiplier
          ),
          0
        )
      }
    } catch (e: any) {
      this.log.warn('Failed to update base fee', e)
    }

    // Blob base fee
    try {
      const params = {
        to: oracleContractAddress,
        data: '0xf8206140' // L1 Blob base fee method
      }
      const response = await this.ethNetwork.multicastRpc('eth_call', [
        params,
        'latest'
      ])
      const result = asRpcResultString(response.result)

      this.optimismRollupParams = {
        ...this.optimismRollupParams,
        blobBaseFee: ceil(hexToDecimal(result.result), 0)
      }
    } catch (e: any) {
      this.log.warn('Failed to update blob base fee', e)
    }

    // Base fee scalar
    try {
      const params = {
        to: oracleContractAddress,
        data: '0xc5985918' // base fee scalar method
      }
      const response = await this.ethNetwork.multicastRpc('eth_call', [
        params,
        'latest'
      ])
      const result = asRpcResultString(response.result)

      this.optimismRollupParams = {
        ...this.optimismRollupParams,
        baseFeeScalar: hexToDecimal(result.result)
      }
    } catch (e: any) {
      this.log.warn('Failed to update base fee scalar', e)
    }

    // Blob base fee scalar
    try {
      const params = {
        to: oracleContractAddress,
        data: '0x68d5dca6' // blob base fee method
      }
      const response = await this.ethNetwork.multicastRpc('eth_call', [
        params,
        'latest'
      ])
      const result = asRpcResultString(response.result)

      this.optimismRollupParams = {
        ...this.optimismRollupParams,
        blobBaseFeeScalar: hexToDecimal(result.result)
      }
    } catch (e: any) {
      this.log.warn('Failed to update blob base fee scalar', e)
    }
  }

  /*
  This algorithm calculates fee amounts using the base multiplier from the
  info server.

  Formula:
    fee = baseMultiplier * baseFee + minPriorityFee

  Where:
    minPriorityFee = <minimum priority fee from info server>
    baseFee = <latest block's base fee>
    baseMultiplier = <multiplier from info server for low, standard, high, etc>

  Reference analysis for choosing 2 gwei minimum priority fee:
    https://hackmd.io/@q8X_WM2nTfu6nuvAzqXiTQ/1559-wallets#:~:text=2%20gwei%20is%20probably%20a%20very%20good%20default
  */
  updateNetworkFeesFromBaseFeePerGas = async (): Promise<
    EthereumBaseMultiplier | undefined
  > => {
    // Get base fees from 'rpcServers' and convert to our network fees format.
    // * Supported for post EIP-1559 chains only
    const { supportsEIP1559 = false } = this.networkInfo
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!supportsEIP1559) return

    const baseFeePerGas = await this.ethNetwork.getBaseFeePerGas()
    if (baseFeePerGas == null) return
    const baseFeePerGasDecimal = hexToDecimal(baseFeePerGas)

    const networkFees: EthereumFees = this.networkInfo.networkFees

    // Make sure there is a default network fee entry and gasPrice entry
    if (networkFees.default == null || networkFees.default.gasPrice == null) {
      return
    }

    const defaultNetworkFee: EthereumFee = this.networkInfo.networkFees.default

    // The minimum priority fee for slow transactions
    const minPriorityFee =
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
      networkFees.default.minPriorityFee || defaultNetworkFee.minPriorityFee
    // This is how much we will multiply the base fee by
    const baseMultiplier: EthereumBaseMultiplier | undefined =
      networkFees.default.baseFeeMultiplier ??
      defaultNetworkFee.baseFeeMultiplier

    // Make sure the properties exist
    if (minPriorityFee == null || baseMultiplier == null) return

    const out: EthereumBaseMultiplier = {
      lowFee: '',
      standardFeeLow: '',
      standardFeeHigh: '',
      highFee: ''
    }

    for (const feeType of Object.keys(baseMultiplier)) {
      // @ts-expect-error
      const baseFee = mul(baseMultiplier[feeType], baseFeePerGasDecimal)
      const totalFee = add(baseFee, minPriorityFee)
      // @ts-expect-error
      out[feeType] = div(totalFee, '1')
    }

    this.log(`updateNetworkFeesFromBaseFeePerGas ${this.currencyInfo.pluginId}`)
    printFees(this.log, out)
    return out
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async clearBlockchainCache() {
    await super.clearBlockchainCache()
    this.otherData.nextNonce = '0'
    this.otherData.unconfirmedNextNonce = '0'
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine(): Promise<void> {
    const realAddress = this.walletLocalData.publicKey

    // Initialize the subscribed addresses list if it's empty
    if (this.subscribedAddresses.length === 0) {
      this.subscribedAddresses.push({
        address: realAddress,
        checkpoint: this.walletLocalData.highestTxBlockHeight.toString()
      })
    }

    // Build addresses list for subscription (real address + decoy addresses)
    this.currencyEngineCallbacks.onSubscribeAddresses(
      // Shuffle array for better privacy
      shuffleArray(this.subscribedAddresses)
    )

    const feeUpdateFrequencyMs =
      this.networkInfo.feeUpdateFrequencyMs ?? NETWORK_FEES_POLL_MILLISECONDS
    // Fetch the static fees from the info server only once to avoid overwriting live values.
    this.infoFeeProvider()
      .then(async info => {
        this.log.warn(`infoFeeProvider:`, JSON.stringify(info, null, 2))

        this.networkInfo.networkFees = mergeDeeply(
          this.networkInfo.networkFees,
          info
        )

        // Update network baseFee:
        if (this.networkInfo.supportsEIP1559 === true) {
          try {
            const baseFee = await this.ethNetwork.getBaseFeePerGas()
            if (baseFee == null) return
            this.networkInfo.networkFees.default.baseFee = baseFee
          } catch (error) {
            this.error(`Error fetching base fee: ${JSON.stringify(error)}`)
          }
        }
      })
      .catch(() => this.warn('Error fetching fees from Info Server'))
      .finally(() => {
        this.addToLoop('updateNetworkFees', feeUpdateFrequencyMs)
      })
    this.addToLoop('updateOptimismRollupParams', ROLLUP_FEE_PARAMS)
    this.ethNetwork.start()

    // Start decoy address generation background routine if needed
    if (DECOY_ADDRESSES_ENABLED) {
      const decoyAddressConfig = this.networkInfo.decoyAddressConfig
      if (decoyAddressConfig != null) {
        if (this.decoyAddressCount < decoyAddressConfig.count) {
          this.addToLoop(
            'generateDecoyAddress',
            DECOY_ADDRESS_GEN_DELAY_MS,
            async () => {
              // Find a decoy address.
              await this.findDecoyAddress(decoyAddressConfig)

              if (this.decoyAddressCount >= decoyAddressConfig.count) {
                // Merge and re-subscribe addresses.
                await this.mergePendingDecoyAddresses()
                // End the loop after merging pending decoy addresses.
                this.removeFromLoop('generateDecoyAddress')
              }
            }
          )
        }
      }
    }

    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    // Cancel any ongoing sync operation
    if (this.syncNetworkAbortController != null) {
      this.syncNetworkAbortController.abort()
      this.syncNetworkAbortController = undefined
    }

    await super.killEngine()
    this.ethNetwork.stop()
  }

  async changeUserSettings(userSettings: object): Promise<void> {
    // Validate the user settings with our cleaner
    asEthereumUserSettings(userSettings)
    await super.changeUserSettings(userSettings)
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async syncNetwork(opts: EdgeEngineSyncNetworkOptions): Promise<number> {
    const { subscribeParam } = opts

    // Check if this subscription is for a decoy address and ignore it
    if (subscribeParam?.address != null) {
      const subscribeAddress = subscribeParam.address
      // If the address is not the real address (walletLocalData.publicKey), it's a decoy
      if (
        normalizeAddress(subscribeAddress) !==
        normalizeAddress(this.walletLocalData.publicKey)
      ) {
        // Ignore subscription updates for decoy addresses
        return SYNC_NETWORK_INTERVAL
      }
    }

    // Cancel any existing sync operation
    if (this.syncNetworkAbortController != null) {
      this.syncNetworkAbortController.abort()
    }

    // Create new AbortController for this sync
    this.syncNetworkAbortController = new AbortController()

    // Initial sync routine:
    if (subscribeParam == null) {
      try {
        // Use infinite retry logic with cancellation for initial sync
        await retryWithBackoff(
          async () => await this.ethNetwork.acquireUpdates(),
          {
            initialDelay: 1000,
            maxDelay: 60000, // Cap at 60 seconds
            backoffFactor: 2,
            jitter: 0.25, // Add 25% jitter to prevent thundering herd
            // No maxRetries - will retry indefinitely until cancelled
            signal: this.syncNetworkAbortController.signal,
            isRetriableError: isKnownRetriableError
          }
        )
      } catch (error: any) {
        // Check if the error is due to cancellation
        if (error instanceof RetryCancelledError) {
          return SYNC_NETWORK_INTERVAL
        }
        // Log the error but don't fail completely for initial sync
        this.error('syncNetwork initial acquireUpdates failed: ', error)
      }
      return SYNC_NETWORK_INTERVAL
    }

    const { needsSync = true } = subscribeParam

    // If no sync is needed, then set the sync ratio to 100% and return.
    if (!needsSync) {
      if (!this.syncComplete) {
        this.setOneHundoSyncRatio()
      }
      return SYNC_NETWORK_INTERVAL
    }

    // The blockheight from the network (change server)
    const theirBlockheight =
      subscribeParam.checkpoint != null
        ? parseInt(subscribeParam.checkpoint)
        : undefined

    // Ignore updates that are from the mempool:
    if (theirBlockheight == null) {
      // TODO: Upgrade the network adapters for EVMs that support fetching
      // mempool transactions. Then we can change this routine to query for
      // the mempool until a transaction is found.
      return SYNC_NETWORK_INTERVAL
    }

    // Sync the network with exponential backoff retry logic
    try {
      const retryResult = await retryWithBackoff(
        async () => {
          await this.ethNetwork.acquireUpdates()

          // Check if we've caught up to the expected block height
          if (theirBlockheight > this.walletLocalData.highestTxBlockHeight) {
            // We haven't caught up yet, this is a retriable condition
            throw new RetriableError(
              `Blockheight not synced yet. Expected: ${theirBlockheight}, Current: ${this.walletLocalData.highestTxBlockHeight}`
            )
          }
        },
        {
          maxRetries: 10, // Allow more retries for sync operations
          isRetriableError: isKnownRetriableError
        }
      )

      // Log successful sync with retry info
      if (retryResult.attempts > 1) {
        this.log(
          `syncNetwork succeeded after ${retryResult.attempts} attempts (total delay: ${retryResult.totalDelay}ms)`
        )
      }
    } catch (error: any) {
      if (!(error instanceof RetryCancelledError)) {
        this.error('syncNetwork failed with unknown error: ', error)
      }
    }

    return SYNC_NETWORK_INTERVAL
  }

  async getFreshAddress(): Promise<EdgeFreshAddress> {
    const { publicKey } = this.walletLocalData
    const publicAddress = /[A-F]/.test(publicKey)
      ? publicKey
      : EthereumUtil.toChecksumAddress(publicKey.replace('0x', ''))

    return {
      publicAddress
    }
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const { edgeSpendInfo } = this.makeSpendCheck(spendInfo)
    const { tokenId } = edgeSpendInfo

    const balance = this.getBalance({
      tokenId
    })

    // For BOB native sends, prefer RPC balance to align with node precheck
    let balanceForMax = balance
    if (
      this.networkInfo.useRpcBalanceForMaxSpendNative === true &&
      tokenId == null
    ) {
      try {
        const resp = await this.ethNetwork.multicastRpc(
          'eth_getBalance' as any,
          [this.walletLocalData.publicKey, 'latest']
        )
        const rpcBalHex = asRpcResultString(resp.result).result
        const rpcBalance = hexToDecimal(rpcBalHex)
        // Use node-reported balance to align max-spend with broadcast precheck
        balanceForMax = rpcBalance
      } catch (e) {
        this.log.warn('getMaxSpendable rpc balance fetch failed', e)
      }
    }

    const spendTarget = spendInfo.spendTargets[0]
    const publicAddress = spendTarget.publicAddress
    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }
    const { contractAddress, data } = this.getTxParameterInformation(
      edgeSpendInfo,
      tokenId,
      this.currencyInfo
    )

    // For mainnet currency, the fee can scale with the amount sent so we use
    // an algorithm to calculate the max spendable amount which subtracts fees
    // from the balance and returns the result:
    if (tokenId == null) {
      // Use the balance (or rpcBalance for BOB) as the initial amount
      spendInfo.spendTargets[0].nativeAmount = balanceForMax

      // Use our calcMiningFee function to calculate the fees:
      const networkBaseFeeWeiHex = await this.ethNetwork.getBaseFeePerGas()
      const currentBaseFeeWei =
        networkBaseFeeWeiHex != null
          ? hexToDecimal(networkBaseFeeWeiHex)
          : undefined
      // For OP-stack chains, force 'high' gas tier to create a worst-case
      // upper bound for gas*price within the current block.
      const spendInfoForFees: EdgeSpendInfo =
        this.optimismRollupParams != null
          ? { ...spendInfo, networkFeeOption: 'high' }
          : spendInfo
      const miningFees = calcMiningFees(
        this.networkInfo,
        spendInfoForFees,
        null,
        currentBaseFeeWei
      )
      // Force estimation on OP-stack chains even for plain native sends
      if (this.optimismRollupParams != null)
        miningFees.useEstimatedGasLimit = true

      // If our results require a call to the RPC server to estimate the gas limit, then we
      // need to do that now:
      if (miningFees.useEstimatedGasLimit) {
        // Determine the preliminary fee amount and subtract that from the balance
        // in order to avoid an insufficient funds error response from the RPC call.
        const preliminaryFee = mul(miningFees.gasPrice, miningFees.gasLimit)
        const preliminaryAmount = sub(balanceForMax, preliminaryFee)

        // Estimate the gas limit:
        const estimatedGasLimit = await this.estimateGasLimit({
          contractAddress,
          estimateGasParams: [
            {
              to: contractAddress ?? publicAddress,
              from: this.walletLocalData.publicKey,
              gas: '0xffffff',
              value: decimalToHex(preliminaryAmount),
              data
            },
            'latest'
          ],
          miningFees,
          publicAddress
        })

        // Update the gasLimit field in our miningFees object to use the
        // largest determined limit:
        miningFees.gasLimit = max(estimatedGasLimit, miningFees.gasLimit)
      }

      // Calculate the primary network fee:
      const primaryNetworkFee = mul(miningFees.gasPrice, miningFees.gasLimit)

      // Get the L1 fee if applicable (for some rollup chains):
      let rollupFee = '0'
      if (this.optimismRollupParams != null) {
        // Refresh OP Stack oracle params to reduce drift before computing L1 fee
        await this.updateOptimismRollupParams().catch(() => {})
        // We'll use this as our baseline case for the maximum spendable amount
        // when calculating the rollup fees:
        const maxSpendableBeforeRollupFee = sub(
          balanceForMax,
          primaryNetworkFee
        )

        const txData: CalcOptimismRollupFeeParams = {
          baseFee: this.optimismRollupParams.baseFee,
          baseFeeScalar: this.optimismRollupParams.baseFeeScalar,
          blobBaseFee: this.optimismRollupParams.blobBaseFee,
          blobBaseFeeScalar: this.optimismRollupParams.blobBaseFeeScalar,
          nonce: this.otherData.unconfirmedNextNonce,
          gasLimit: miningFees.gasLimit,
          to: publicAddress,
          value: decimalToHex(maxSpendableBeforeRollupFee),
          data,
          chainParams: this.networkInfo.chainParams
        }
        rollupFee = calcOptimismRollupFees(txData)
      } else if (this.networkInfo.arbitrumRollupParams != null) {
        const rpcServers = this.ethNetwork.networkAdapters
          .filter(
            (adapter): adapter is RpcAdapter => adapter.config.type === 'rpc'
          )
          .map(adapter => adapter.config.servers)
          .flat()
        const arbitrumFee = await calcArbitrumRollupFees({
          destinationAddress: publicAddress,
          nodeInterfaceAddress:
            this.networkInfo.arbitrumRollupParams.nodeInterfaceAddress,
          rpcServers,
          txData: data ?? '0x'
        })
        rollupFee = mul(miningFees.gasPrice, arbitrumFee.l1Gas)
      }

      // Update total fee:
      let totalFeeInitial = add(primaryNetworkFee, rollupFee)
      if (tokenId == null && this.networkInfo.nativeSendPrechargeWei != null) {
        totalFeeInitial = add(
          totalFeeInitial,
          this.networkInfo.nativeSendPrechargeWei
        )
      }

      // Calculate the max spendable amount which accounts for all fees:
      let maxSpendable = sub(balanceForMax, totalFeeInitial)

      // For OP-stack chains, do a single refinement using the candidate amount
      // to recompute the L1 fee.
      if (this.optimismRollupParams != null) {
        const refinedTxData: CalcOptimismRollupFeeParams = {
          baseFee: this.optimismRollupParams.baseFee,
          baseFeeScalar: this.optimismRollupParams.baseFeeScalar,
          blobBaseFee: this.optimismRollupParams.blobBaseFee,
          blobBaseFeeScalar: this.optimismRollupParams.blobBaseFeeScalar,
          nonce: this.otherData.unconfirmedNextNonce,
          gasLimit: miningFees.gasLimit,
          to: publicAddress,
          value: decimalToHex(maxSpendable),
          data,
          chainParams: this.networkInfo.chainParams
        }
        const refinedL1 = calcOptimismRollupFees(refinedTxData)
        let refinedTotalFee = add(primaryNetworkFee, refinedL1)
        if (
          tokenId == null &&
          this.networkInfo.nativeSendPrechargeWei != null
        ) {
          refinedTotalFee = add(
            refinedTotalFee,
            this.networkInfo.nativeSendPrechargeWei
          )
        }
        maxSpendable = sub(balanceForMax, refinedTotalFee)

        // Small safety epsilon for BOB node precharge quirks (1 gwei)
        if (
          tokenId == null &&
          this.networkInfo.nativeSendPrechargeWei != null
        ) {
          const epsilon = '1000000000'
          if (gt(maxSpendable, epsilon))
            maxSpendable = sub(maxSpendable, epsilon)
        }
        // Cache for makeSpend to avoid re-pricing L1
        this.lastMaxSpendable = {
          nativeAmount: maxSpendable,
          l1Fee: refinedL1,
          gasPrice: miningFees.gasPrice,
          gasLimit: miningFees.gasLimit
        }
      }

      if (lte(maxSpendable, '0')) {
        throw new InsufficientFundsError({ tokenId })
      }

      return maxSpendable
    } else {
      // For tokens, the max spendable amount is the same as the balance:
      spendInfo.spendTargets[0].nativeAmount = balance

      // Call makeSpend to invoke balance checks on the primary currency:
      await this.makeSpend(spendInfo)

      // Return the balance as the max spendable amount:
      return balance
    }
  }

  getTxParameterInformation(
    edgeSpendInfo: EdgeSpendInfo,
    tokenId: EdgeTokenId,
    currencyInfo: EdgeCurrencyInfo
  ): EthereumTxParameterInformation {
    const { memos = [] } = edgeSpendInfo
    const { spendTargets } = edgeSpendInfo
    const spendTarget = spendTargets[0]
    const { publicAddress, nativeAmount } = spendTarget

    // Get data:
    let data = memos[0]?.type === 'hex' ? memos[0].value : undefined
    if (data != null && !data.startsWith('0x')) {
      data = `0x${data}`
    }

    // Get contractAddress and/or value:
    let value: string | undefined
    if (tokenId == null) {
      value = nativeAmount == null ? undefined : decimalToHex(nativeAmount)
      return {
        data,
        value
      }
    } else {
      let contractAddress: string | undefined
      if (data != null) {
        contractAddress = publicAddress
      } else {
        const tokenInfo = this.getTokenInfo(tokenId)
        if (
          tokenInfo == null ||
          typeof tokenInfo.networkLocation?.contractAddress !== 'string'
        ) {
          throw new Error(
            'Error: Token not supported or invalid contract address'
          )
        }

        contractAddress = tokenInfo.networkLocation?.contractAddress

        // Derive the data from a ERC-20 token transfer smart-contract call:
        const dataArray = abi.simpleEncode(
          'transfer(address,uint256):(uint256)',
          publicAddress,
          decimalToHex(nativeAmount ?? '0')
        )
        value = '0x0'
        data = '0x' + Buffer.from(dataArray).toString('hex')
      }
      return {
        contractAddress,
        data,
        value
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode, skipChecks } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [] } = edgeSpendInfo

    const { pendingTxs = [], tokenId } = edgeSpendInfo
    const unconfirmedTxs = this.getUnconfirmedTxs()

    // If we have pending transactions, that are not in the pendingTxs array,
    // then throw an error UNLESS allowChainedPending is true:
    const unexpectedUnconfirmedTxs = unconfirmedTxs.filter(
      tx => !pendingTxs.some(ptx => ptx.txid === tx.txid)
    )

    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress, otherParams: spendTargetOtherParams } = spendTarget
    let { nativeAmount } = spendTarget
    const providedNonce = spendTargetOtherParams?.nonce

    if (unexpectedUnconfirmedTxs.length > 0 && providedNonce == null) {
      throw new PendingFundsError('Unexpected pending transactions')
    }

    // Ethereum can only have one output
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (!EthereumUtil.isValidAddress(publicAddress)) {
      throw new TypeError(`Invalid ${this.currencyInfo.pluginId} address`)
    }

    const edgeToken = tokenId != null ? this.allTokensMap[tokenId] : null
    const useCachedFees =
      this.optimismRollupParams != null &&
      tokenId == null &&
      this.lastMaxSpendable?.nativeAmount === nativeAmount
    const networkBaseFeeWeiHex = await this.ethNetwork.getBaseFeePerGas()
    const currentBaseFeeWei =
      networkBaseFeeWeiHex != null
        ? hexToDecimal(networkBaseFeeWeiHex)
        : undefined
    const miningFees = calcMiningFees(
      this.networkInfo,
      useCachedFees
        ? {
            ...edgeSpendInfo,
            networkFeeOption: 'custom',
            customNetworkFee: {
              gasLimit: this.lastMaxSpendable?.gasLimit
            }
          }
        : edgeSpendInfo,
      edgeToken,
      currentBaseFeeWei
    )
    // Force estimation on OP-stack chains even for plain native sends
    if (this.optimismRollupParams != null)
      miningFees.useEstimatedGasLimit = true

    // Lock gas price to the cached value when available
    if (useCachedFees && this.lastMaxSpendable != null) {
      miningFees.gasPrice = this.lastMaxSpendable.gasPrice
    }

    // Translate legacy transaction types to EIP-1559 transaction type
    const txType = this.networkInfo.supportsEIP1559 === true ? 2 : 0
    // Translate legacy transaction types gas params to to EIP-1559 params
    const feeParams = await getFeeParamsByTransactionType(
      txType,
      miningFees.gasPrice,
      this.networkInfo.networkFees.default.baseFee ??
        (await this.ethNetwork.getBaseFeePerGas())
    )

    //
    // Nonce:
    //

    // Check if a nonce was provided in the RPC params (e.g., from WalletConnect)
    let nonceUsed: string
    if (providedNonce != null) {
      // Use the provided nonce (convert from hex if needed)
      nonceUsed = isHex(providedNonce)
        ? hexToDecimal(providedNonce)
        : providedNonce
    } else {
      // Increment the nonce by the number of pending transactions always
      // this is the only supported way for the EVM plugin to handle more than
      // one pending transaction broadcast.
      nonceUsed = add(this.otherData.nextNonce, pendingTxs.length.toString())
    }

    const { contractAddress, data, value } = this.getTxParameterInformation(
      edgeSpendInfo,
      tokenId,
      this.currencyInfo
    )

    // Set otherParams
    let otherParams: EthereumTxOtherParams
    if (contractAddress == null) {
      otherParams = {
        from: [this.walletLocalData.publicKey],
        to: [publicAddress],
        ...feeParams,
        gas: miningFees.gasLimit,
        gasUsed: '0',
        nonceUsed,
        data,
        isFromMakeSpend: true
      }
    } else {
      otherParams = {
        from: [this.walletLocalData.publicKey],
        to: [contractAddress],
        ...feeParams,
        gas: miningFees.gasLimit,
        gasUsed: '0',
        tokenRecipientAddress: publicAddress,
        nonceUsed,
        data,
        isFromMakeSpend: true
      }
    }

    if (miningFees.useEstimatedGasLimit) {
      otherParams.gas = await this.estimateGasLimit({
        contractAddress,
        estimateGasParams: [
          {
            to: contractAddress ?? publicAddress,
            from: this.walletLocalData.publicKey,
            gas: '0xffffff',
            value,
            data
          },
          'latest'
        ],
        miningFees,
        publicAddress
      })
      // Ensure we never drop below cached gasLimit if present
      if (useCachedFees && this.lastMaxSpendable?.gasLimit != null) {
        otherParams.gas = max(otherParams.gas, this.lastMaxSpendable.gasLimit)
      }
    }

    const nativeBalance = this.getBalance({ tokenId: null })

    let nativeNetworkFee = mul(miningFees.gasPrice, otherParams.gas)
    let totalTxAmount = '0'
    let parentNetworkFee = null
    let l1Fee = '0'

    // Optimism-style L1 fees are deducted automatically from the account.
    // Arbitrum-style L1 gas must be included in the transaction object.
    if (this.optimismRollupParams != null) {
      // Use cached L1 fee if this is the same max-spend amount to avoid
      // re-pricing between getMaxSpendable and makeSpend.
      if (tokenId == null && useCachedFees && this.lastMaxSpendable != null) {
        l1Fee = this.lastMaxSpendable.l1Fee
        // Use cached L1 fee matching prior max-spend calculation
        // Clear after use
        this.lastMaxSpendable = undefined
      } else {
        const txData: CalcOptimismRollupFeeParams = {
          baseFee: this.optimismRollupParams.baseFee,
          baseFeeScalar: this.optimismRollupParams.baseFeeScalar,
          blobBaseFee: this.optimismRollupParams.blobBaseFee,
          blobBaseFeeScalar: this.optimismRollupParams.blobBaseFeeScalar,
          nonce: otherParams.nonceUsed,
          gasLimit: otherParams.gas,
          to: otherParams.to[0],
          value: value,
          data: otherParams.data,
          chainParams: this.networkInfo.chainParams
        }
        l1Fee = calcOptimismRollupFees(txData)
      }
    } else if (this.networkInfo.arbitrumRollupParams != null) {
      const rpcServers = this.ethNetwork.networkAdapters
        .filter(
          (adapter): adapter is RpcAdapter => adapter.config.type === 'rpc'
        )
        .map(adapter => adapter.config.servers)
        .flat()
      const arbitrumFees = await calcArbitrumRollupFees({
        destinationAddress: publicAddress,
        nodeInterfaceAddress:
          this.networkInfo.arbitrumRollupParams.nodeInterfaceAddress,
        rpcServers,
        txData: data ?? '0x'
      })
      otherParams.gas = add(otherParams.gas, arbitrumFees.l1Gas)
    }

    //
    // Balance checks:
    //

    if (tokenId == null) {
      nativeNetworkFee = add(nativeNetworkFee, l1Fee)
      if (tokenId == null && this.networkInfo.nativeSendPrechargeWei != null) {
        nativeNetworkFee = add(
          nativeNetworkFee,
          this.networkInfo.nativeSendPrechargeWei
        )
      }
      // Sanity check RPC balance for OP max-spend and adjust amount once.
      // For some reason, the RPC balance can differ for BOB...
      if (
        this.optimismRollupParams != null &&
        tokenId == null &&
        useCachedFees
      ) {
        try {
          const resp = await this.ethNetwork.multicastRpc(
            'eth_getBalance' as RpcMethod,
            [this.walletLocalData.publicKey, 'latest']
          )
          const rpcBalHex = asRpcResultString(resp.result).result
          const rpcBal = hexToDecimal(rpcBalHex)
          // JIT clamp against node's precheck using effective gas + l1
          if (tokenId == null) {
            let required = add(
              add(mul(miningFees.gasPrice, otherParams.gas), nativeAmount),
              l1Fee
            )
            if (this.networkInfo.nativeSendPrechargeWei != null) {
              required = add(required, this.networkInfo.nativeSendPrechargeWei)
            }
            if (gt(required, rpcBal)) {
              const epsilon = '1000000000' // 1 gwei buffer
              const excess = add(sub(required, rpcBal), epsilon)
              const adjusted = gt(excess, nativeAmount)
                ? '0'
                : sub(nativeAmount, excess)
              // Final trim to satisfy node-side balance precheck
              nativeAmount = adjusted
            }
          }
        } catch (e) {
          this.log.warn('eth_getBalance sanity check failed', e)
        }
      }
      totalTxAmount = add(nativeNetworkFee, nativeAmount)

      if (!skipChecks && gt(totalTxAmount, nativeBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
      nativeAmount = mul(totalTxAmount, '-1')
    } else {
      parentNetworkFee = add(nativeNetworkFee, l1Fee)
      // Check if there's enough parent currency to pay the transaction fee, and if not return the parent currency code and amount
      if (!skipChecks && gt(parentNetworkFee, nativeBalance)) {
        throw new InsufficientFundsError({
          networkFee: parentNetworkFee,
          tokenId: null
        })
      }
      const balanceToken = this.getBalance({ tokenId })
      if (!skipChecks && gt(nativeAmount, balanceToken)) {
        throw new InsufficientFundsError({ tokenId })
      }
      nativeNetworkFee = '0' // Do not show a fee for token transactions.
      nativeAmount = mul(nativeAmount, '-1')
    }

    //
    // Create the unsigned EdgeTransaction
    //

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0, // blockHeight
      currencyCode, // currencyCode
      date: 0, // date
      feeRateUsed: getFeeRateUsed(
        miningFees.gasPrice,
        otherParams.gas,
        undefined,
        feeParams.minerTip
      ),
      isSend: nativeAmount.startsWith('-'),
      memos,
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee
      networkFees: [],
      otherParams, // otherParams
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      tokenId,
      txid: '', // txid
      walletId: this.walletId
    }

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (parentNetworkFee) {
      edgeTransaction.parentNetworkFee = parentNetworkFee
    }

    return edgeTransaction
  }

  async signMessage(
    message: string,
    privateKeys: JsonObject,
    opts: EdgeSignMessageOptions
  ): Promise<string> {
    const ethereumPrivateKeys = asEthereumPrivateKeys(
      this.currencyInfo.pluginId
    )(privateKeys)
    const otherParams = asEthereumSignMessageParams(opts.otherParams)

    if (otherParams.typedData) {
      const typedData = JSON.parse(message)
      try {
        return this.utils.signTypedData(typedData, ethereumPrivateKeys)
      } catch (_) {
        // It's possible that the dApp makes the wrong call.
        // Try to sign using the latest signTypedData_v4 method.
        return signTypedData_v4(
          Buffer.from(ethereumPrivateKeys.privateKey, 'hex'),
          {
            data: typedData
          }
        )
      }
    }

    if (!isHex(message))
      throw new Error(
        'EthereumEngine: signMessage() requires a hex message parameter'
      )

    const privKey = Buffer.from(ethereumPrivateKeys.privateKey, 'hex')
    const messageBuffer = hexToBuf(message)
    const messageHash = EthereumUtil.hashPersonalMessage(messageBuffer)
    const { v, r, s } = EthereumUtil.ecsign(messageHash, privKey)

    return EthereumUtil.toRpcSig(v, r, s)
  }

  async signBytes(bytes: Uint8Array, privateKeys: JsonObject): Promise<string> {
    const ethereumPrivateKeys = asEthereumPrivateKeys(
      this.currencyInfo.pluginId
    )(privateKeys)

    const privKey = Buffer.from(ethereumPrivateKeys.privateKey, 'hex')
    const bufferHash = EthereumUtil.hashPersonalMessage(bytes)
    const { v, r, s } = EthereumUtil.ecsign(bufferHash, privKey)

    return EthereumUtil.toRpcSig(v, r, s)
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const ethereumPrivateKeys = asEthereumPrivateKeys(
      this.currencyInfo.pluginId
    )(privateKeys)
    const otherParams: EthereumTxOtherParams = getOtherParams(edgeTransaction)

    // Do signing
    const gasLimitHex = toHex(otherParams.gas)
    let txValue

    if (edgeTransaction.tokenId == null) {
      // Remove the networkFee from the nativeAmount
      const nativeAmount = add(
        edgeTransaction.nativeAmount,
        edgeTransaction.networkFee
      )
      txValue = mul('-1', nativeAmount, 16)
    } else {
      txValue = mul('-1', edgeTransaction.nativeAmount, 16)
    }

    // If the nativeAmount for the transaction is negative, this means the
    // transaction being signed is a "receive transaction", and not a spend,
    // and we should not include an amount in the transaction's value field.
    if (lt(txValue, '0')) {
      txValue = '0x00'
    }

    // Nonce:

    const nonce = otherParams.nonceUsed

    if (nonce == null) {
      throw new Error('Invalid transaction. Nonce is required for signing.')
    }

    // Convert nonce to hex for tsParams
    const nonceHex = toHex(nonce)

    // Data:

    let data
    if (otherParams.data != null) {
      data = otherParams.data
      if (edgeTransaction.tokenId != null) {
        // Smart contract calls only allow for tx value if it's the parent currency
        txValue = '0x00'
      }
    } else if (edgeTransaction.tokenId == null) {
      data = ''
    } else {
      const dataArray = abi.simpleEncode(
        'transfer(address,uint256):(uint256)',
        otherParams.tokenRecipientAddress,
        txValue
      )
      data = '0x' + Buffer.from(dataArray).toString('hex')
      txValue = '0x00'
    }

    // Select the chain
    const { chainParams } = this.networkInfo
    const common = Common.custom(chainParams)

    // Translate legacy transaction types to EIP-1559 transaction type
    const txType = this.networkInfo.supportsEIP1559 === true ? 2 : 0
    const txFeeParams =
      this.networkInfo.supportsEIP1559 === true
        ? {
            maxFeePerGas: otherParams.gasPrice,
            maxPriorityFeePerGas: otherParams.minerTip
          }
        : { gasPrice: otherParams.gasPrice }

    // Transaction Parameters
    const txParams: TypedTxData = {
      nonce: nonceHex,
      ...txFeeParams,
      gasLimit: gasLimitHex,
      to: otherParams.to[0],
      value: txValue,
      data,
      type: txType
    }

    const privKey = Buffer.from(ethereumPrivateKeys.privateKey, 'hex')

    // Log the private key address
    const wallet = ethWallet.fromPrivateKey(privKey)
    this.warn(`signTx getAddressString ${wallet.getAddressString()}`)

    // Create and sign transaction
    const unsignedTx = TransactionFactory.fromTxData(txParams, { common })
    const signedTx = unsignedTx.sign(privKey)

    edgeTransaction.signedTx = uint8ArrayToHex(signedTx.serialize())
    edgeTransaction.txid = uint8ArrayToHex(signedTx.hash())
    edgeTransaction.date = Date.now() / 1000
    if (edgeTransaction.otherParams != null) {
      edgeTransaction.otherParams.nonceUsed = nonce
    }
    this.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    await this.ethNetwork.broadcastTx(edgeTransaction)

    // Success
    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)

    return edgeTransaction
  }

  async accelerate(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction | null> {
    const { tokenId } = edgeTransaction

    const txOtherParams = asMaybe(asEthereumTxOtherParams)(
      edgeTransaction.otherParams
    )

    let replacedTxid = edgeTransaction.txid
    let replacedTxIndex = await this.findTransaction(
      edgeTransaction.tokenId,
      normalizeAddress(replacedTxid)
    )
    if (replacedTxIndex === -1) {
      if (
        txOtherParams?.replacedTxid != null &&
        txOtherParams.replacedTxid !== ''
      ) {
        // If the tx parameter is not found, then perhaps it is a
        // replacement transaction itself
        replacedTxid = txOtherParams.replacedTxid
        replacedTxIndex = await this.findTransaction(
          edgeTransaction.tokenId,
          normalizeAddress(replacedTxid)
        )
      }

      if (replacedTxIndex === -1) {
        // Cannot allow an unsaved (unobserved) transaction to be replaced
        return null
      }
    }
    const replacedTx: EdgeTransaction =
      this.transactionList[tokenId ?? ''][replacedTxIndex]

    const replacedTxOtherParams = asMaybe(asEthereumTxOtherParams)(
      replacedTx.otherParams
    )

    // Transaction checks:
    // The transaction must be found and not confirmed or dropped.
    if (replacedTx == null || replacedTx.blockHeight !== 0) {
      return null
    }
    // Other params checks:
    if (
      replacedTxOtherParams == null ||
      // The transaction must have a known nonce used.
      replacedTxOtherParams.nonceUsed == null ||
      // We can only accelerate transaction created locally from makeSpend
      // due to the ambiguity of whether or not the transaction all the
      // necessary to sign the transaction and broadcast it.
      !replacedTxOtherParams.isFromMakeSpend
    ) {
      return null
    }
    // Must have a spend target
    const spendTarget = (replacedTx.spendTargets ?? [])[0]
    if (spendTarget == null) return null

    // Accelerate transaction by doubling the gas price:
    // Translate legacy transaction types to EIP-1559 transaction type
    const txType = this.networkInfo.supportsEIP1559 === true ? 2 : 0
    // Translate legacy transaction types gas params to to EIP-1559 params
    const doubledFeeParams = await getFeeParamsByTransactionType(
      txType,
      mul(replacedTxOtherParams.gasPrice, '2'),
      this.networkInfo.networkFees.default.baseFee ??
        (await this.ethNetwork.getBaseFeePerGas())
    )
    const gasLimit = replacedTxOtherParams.gas
    const newOtherParams: EthereumTxOtherParams = {
      ...replacedTxOtherParams,
      ...doubledFeeParams,
      gas: gasLimit,
      replacedTxid
    }

    let { nativeAmount } = spendTarget
    let nativeNetworkFee = mul(doubledFeeParams.gasPrice, gasLimit)
    let totalTxAmount = '0'
    let parentNetworkFee: string | undefined

    //
    // Balance checks:
    //

    const parentNativeBalance = this.getBalance({ tokenId: null })

    if (tokenId == null) {
      totalTxAmount = add(nativeNetworkFee, nativeAmount)
      if (gt(totalTxAmount, parentNativeBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
      nativeAmount = mul(totalTxAmount, '-1')
    } else {
      parentNetworkFee = nativeNetworkFee
      // Check if there's enough parent currency to pay the transaction fee, and if not return the parent currency code and amount
      if (gt(nativeNetworkFee, parentNativeBalance)) {
        throw new InsufficientFundsError({
          networkFee: nativeNetworkFee,
          tokenId: null
        })
      }
      const balanceToken = this.getBalance({ tokenId })
      if (gt(nativeAmount, balanceToken)) {
        throw new InsufficientFundsError({ tokenId })
      }
      nativeNetworkFee = '0' // Do not show a fee for token transactions.
      nativeAmount = mul(nativeAmount, '-1')
    }

    // Return a EdgeTransaction object with the updates
    return {
      ...edgeTransaction,
      txid: '',
      feeRateUsed: getFeeRateUsed(
        doubledFeeParams.gasPrice,
        gasLimit,
        replacedTxOtherParams.gasUsed,
        doubledFeeParams.minerTip
      ),
      nativeAmount,
      networkFee: nativeNetworkFee,
      otherParams: newOtherParams,
      parentNetworkFee
    }
  }

  // Overload saveTx to mutate replaced transactions by RBF
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async saveTx(edgeTransaction: EdgeTransaction) {
    const txOtherParams = asMaybe(asEthereumTxOtherParams)(
      edgeTransaction.otherParams
    )

    // We must check if this transaction replaces another transaction
    if (txOtherParams?.replacedTxid != null) {
      const txid = normalizeAddress(txOtherParams.replacedTxid)
      const index = this.findTransaction(edgeTransaction.tokenId, txid)

      if (index !== -1) {
        const replacedEdgeTransaction =
          this.transactionList[edgeTransaction.tokenId ?? ''][index]

        // Use the RBF metadata because metadata for replaced transaction is not
        // present in edge-currency-accountbased state
        const metadata = edgeTransaction.metadata

        // Update the transaction's confirmations to dropped
        const updatedEdgeTransaction: EdgeTransaction = {
          ...replacedEdgeTransaction,
          metadata,
          confirmations: 'dropped'
        }

        this.addTransaction(
          updatedEdgeTransaction.tokenId,
          updatedEdgeTransaction
        )
      }
    }

    // Update the unconfirmed nonce if the transaction being saved is not confirmed
    if (edgeTransaction.blockHeight === 0) {
      const nonceUsed: string | undefined =
        edgeTransaction.otherParams?.nonceUsed
      if (nonceUsed != null) {
        this.otherData.unconfirmedNextNonce = add(nonceUsed, '1')
      }
    }

    await super.saveTx(edgeTransaction)
  }

  // ****************************************************************************
  // Private methods
  // ****************************************************************************

  /**
   * Finds one decoy address if configured and needed.
   * This method is called periodically by addToLoop. It finds one address
   * per invocation and lets the loop handle repetition.
   */
  async findDecoyAddress(
    decoyAddressConfig: DecoyAddressConfig
  ): Promise<void> {
    // Get current block height
    const blockHeightUpdate = await this.ethNetwork.check('fetchBlockheight')
    if (blockHeightUpdate.blockHeight == null) {
      this.warn('Cannot generate decoy address: failed to get block height')
      return
    }
    const currentBlockHeight = blockHeightUpdate.blockHeight

    // Get eligible addresses from network (filtered by transaction count only)
    const eligibleAddresses = await this.ethNetwork.findDecoyAddresses(
      decoyAddressConfig,
      currentBlockHeight
    )

    // Build exclude list: existing subscribed addresses + pending decoy addresses
    const excludeAddressesSet = new Set([
      ...this.subscribedAddresses.map(addr => normalizeAddress(addr.address)),
      ...this.otherData.pendingDecoyAddresses.map(addr =>
        normalizeAddress(addr.address)
      )
    ])

    // Filter out excluded addresses and pick a random one
    const candidateAddresses = eligibleAddresses.filter(
      addr => !excludeAddressesSet.has(normalizeAddress(addr))
    )

    if (candidateAddresses.length > 0) {
      const selectedAddress = pickRandomOne(candidateAddresses)

      // Add to pendingDecoyAddresses and persist
      this.otherData.pendingDecoyAddresses.push({
        address: selectedAddress,
        checkpoint: this.walletLocalData.highestTxBlockHeight.toString()
      })
      this.walletLocalDataDirty = true
      this.log(`Generated decoy address: ${selectedAddress}`)
    }
  }

  async mergePendingDecoyAddresses(): Promise<void> {
    // Ensure real address is in subscribedAddresses
    const realAddress = this.walletLocalData.publicKey
    if (
      this.subscribedAddresses.every(
        a => normalizeAddress(a.address) !== normalizeAddress(realAddress)
      )
    ) {
      this.subscribedAddresses.push({
        address: realAddress,
        checkpoint: this.walletLocalData.highestTxBlockHeight.toString()
      })
    }

    // Merge pending decoy addresses into subscribedAddresses
    for (const pendingAddr of this.otherData.pendingDecoyAddresses) {
      if (
        this.subscribedAddresses.every(
          a =>
            normalizeAddress(a.address) !==
            normalizeAddress(pendingAddr.address)
        )
      ) {
        this.subscribedAddresses.push(pendingAddr)
      }
    }

    // Subscribe to all addresses
    this.currencyEngineCallbacks.onSubscribeAddresses(
      // Shuffle array for better privacy
      shuffleArray(this.subscribedAddresses)
    )

    this.log(
      `Merged ${this.otherData.pendingDecoyAddresses.length} decoy addresses into subscribed addresses`
    )

    // Clear pending list and persist
    this.otherData.pendingDecoyAddresses = []
    this.walletLocalDataDirty = true
  }

  get decoyAddressCount(): number {
    // The number of decoy addresses should be counted between both sets because
    // the pending decoy addresses are not yet merged into the subscribed addresses
    // and the subscribed addresses may already have decoy addresses if the
    // currency's configuration ever changes.
    return (
      Math.max(0, this.subscribedAddresses.length - 1) +
      this.otherData.pendingDecoyAddresses.length
    )
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<EthereumNetworkInfo>,
  tools: EthereumTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { currencyInfo, initOptions } = env

  const safeWalletInfo = asSafeEthWalletInfo(walletInfo)
  const engine = new EthereumEngine(
    env,
    tools,
    safeWalletInfo,
    asEthereumInitOptions(initOptions),
    opts,
    currencyInfo
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}
