import { Common } from '@ethereumjs/common'
import { TransactionFactory, TypedTxData } from '@ethereumjs/tx'
import { add, ceil, div, gt, lt, lte, max, mul, sub } from 'biggystring'
import { asMaybe, asObject, asOptional, asString } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSignMessageOptions,
  EdgeSpendInfo,
  EdgeSpendTarget,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
// eslint-disable-next-line camelcase
import { signTypedData_v4 } from 'eth-sig-util'
import abi from 'ethereumjs-abi'
import EthereumUtil from 'ethereumjs-util'
import ethWallet from 'ethereumjs-wallet'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  biggyRoundToNearestInt,
  cleanTxLogs,
  decimalToHex,
  getFetchCors,
  getOtherParams,
  hexToBuf,
  hexToDecimal,
  isHex,
  mergeDeeply,
  normalizeAddress,
  removeHexPrefix,
  toHex,
  uint8ArrayToHex
} from '../common/utils'
import {
  NETWORK_FEES_POLL_MILLISECONDS,
  ROLLUP_FEE_PARAMS,
  WEI_MULTIPLIER
} from './ethereumConsts'
import { EthereumNetwork, getFeeRateUsed } from './EthereumNetwork'
import { asEIP712TypedData } from './ethereumSchema'
import { EthereumTools } from './EthereumTools'
import {
  asEthereumInitOptions,
  asEthereumPrivateKeys,
  asEthereumSignMessageParams,
  asEthereumTxOtherParams,
  asEthereumWalletOtherData,
  asRpcResultString,
  asSafeEthWalletInfo,
  CalcOptimismRollupFeeParams,
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

export class EthereumEngine extends CurrencyEngine<
  EthereumTools,
  SafeEthWalletInfo
> {
  otherData!: EthereumWalletOtherData
  lightMode: boolean
  initOptions: EthereumInitOptions
  networkInfo: EthereumNetworkInfo
  ethNetwork: EthereumNetwork
  fetchCors: EdgeFetchFunction
  otherMethods: EthereumOtherMethods
  utils: EthereumUtils
  infoFeeProvider: () => Promise<EthereumFees>
  externalFeeProviders: FeeProviderFunction[]
  optimismRollupParams?: OptimismRollupParams
  constructor(
    env: PluginEnvironment<EthereumNetworkInfo>,
    tools: EthereumTools,
    walletInfo: SafeEthWalletInfo,
    initOptions: EthereumInitOptions,
    opts: EdgeCurrencyEngineOptions,
    currencyInfo: EdgeCurrencyInfo
  ) {
    super(env, tools, walletInfo, opts)
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
    this.fetchCors = getFetchCors(env.io)

    // Update network fees from other providers
    const { infoFeeProvider, externalFeeProviders } = FeeProviders(
      this.fetchCors,
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
          if (defaultGasLimit != null && !sendingToContract && !hasUserMemo) {
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
    } catch (e: any) {
      this.error(`makeSpend Error determining gas limit `, e)
    }

    return gasLimitReturn
  }

  setOtherData(raw: any): void {
    const otherData = asEthereumWalletOtherData(raw)

    // Hack otherData. To be removed once local data stops using currency codes as keys
    switch (this.currencyInfo.pluginId) {
      case 'zksync': {
        // The USDC.e token used to be called USDC so we need to
        // force a resync of transaction history to avoid showing USDC
        // transactions in the now USDC.e wallet
        if (!otherData.zksyncForceResyncUSDC) {
          this.walletLocalData.lastTransactionQueryHeight.USDC = 0
          otherData.zksyncForceResyncUSDC = true
          this.walletLocalDataDirty = true
        }
      }
    }

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

    this.log(
      `updateNetworkFeesFromBaseFeePerGas ${this.currencyInfo.currencyCode}`
    )
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
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await super.killEngine()
    this.ethNetwork.stop()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
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
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(spendInfo)
    const { tokenId } = edgeSpendInfo

    const balance = this.getBalance({
      tokenId
    })

    const spendTarget = spendInfo.spendTargets[0]
    const publicAddress = spendTarget.publicAddress
    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }
    const { contractAddress, data } = this.getTxParameterInformation(
      edgeSpendInfo,
      currencyCode,
      this.currencyInfo
    )

    // For mainnet currency, the fee can scale with the amount sent so we use
    // an algorithm to calculate the max spendable amount which subtracts fees
    // from the balance and returns the result:
    if (tokenId == null) {
      // Use the balance as the initial amount for the spend info before calculating the fees:
      spendInfo.spendTargets[0].nativeAmount = balance

      // Use our calcMiningFee function to calculate the fees:
      const networkBaseFeeWeiHex = await this.ethNetwork.getBaseFeePerGas()
      const currentBaseFeeWei =
        networkBaseFeeWeiHex != null
          ? hexToDecimal(networkBaseFeeWeiHex)
          : undefined
      const miningFees = calcMiningFees(
        this.networkInfo,
        spendInfo,
        null,
        currentBaseFeeWei
      )

      // If our results require a call to the RPC server to estimate the gas limit, then we
      // need to do that now:
      if (miningFees.useEstimatedGasLimit) {
        // Determine the preliminary fee amount and subtract that from the balance
        // in order to avoid an insufficient funds error response from the RPC call.
        const preliminaryFee = mul(miningFees.gasPrice, miningFees.gasLimit)
        const preliminaryAmount = sub(balance, preliminaryFee)

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
        // We'll use this as our baseline case for the maximum spendable amount
        // when calculating the rollup fees:
        const maxSpendableBeforeRollupFee = sub(balance, primaryNetworkFee)

        const txData: CalcOptimismRollupFeeParams = {
          baseFee: this.optimismRollupParams.baseFee,
          baseFeeScalar: this.optimismRollupParams.baseFeeScalar,
          blobBaseFee: this.optimismRollupParams.blobBaseFee,
          blobBaseFeeScalar: this.optimismRollupParams.blobBaseFeeScalar,
          nonce: this.otherData.unconfirmedNextNonce,
          gasLimit: miningFees.gasLimit,
          to: publicAddress,
          value: decimalToHex(maxSpendableBeforeRollupFee),
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
      const totalFee = add(primaryNetworkFee, rollupFee)

      // Calculate the max spendable amount which accounts for all fees:
      const maxSpendable = sub(balance, totalFee)

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
    currencyCode: string,
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
    if (currencyCode === currencyInfo.currencyCode) {
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
        const tokenInfo = this.getTokenInfo(currencyCode)
        if (
          tokenInfo == null ||
          typeof tokenInfo.contractAddress !== 'string'
        ) {
          throw new Error(
            'Error: Token not supported or invalid contract address'
          )
        }

        contractAddress = tokenInfo.contractAddress

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

    // Ethereum can only have one output
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress } = spendTarget
    let { nativeAmount } = spendTarget

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    if (!EthereumUtil.isValidAddress(publicAddress)) {
      throw new TypeError(`Invalid ${this.currencyInfo.pluginId} address`)
    }

    const edgeToken = tokenId != null ? this.builtinTokens[tokenId] : null
    const networkBaseFeeWeiHex = await this.ethNetwork.getBaseFeePerGas()
    const currentBaseFeeWei =
      networkBaseFeeWeiHex != null
        ? hexToDecimal(networkBaseFeeWeiHex)
        : undefined
    const miningFees = calcMiningFees(
      this.networkInfo,
      edgeSpendInfo,
      edgeToken,
      currentBaseFeeWei
    )

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

    let nonceUsed: string | undefined

    // Determine the nonce to use from the number of pending transactions
    if (pendingTxs.length > 0) {
      // @ts-expect-error
      const otherData: EthereumWalletOtherData = this.walletLocalData.otherData
      const baseNonce =
        this.walletLocalData.numUnconfirmedSpendTxs > 0
          ? otherData.unconfirmedNextNonce
          : otherData.nextNonce
      nonceUsed = add(baseNonce, pendingTxs.length.toString())
    }

    const { contractAddress, data, value } = this.getTxParameterInformation(
      edgeSpendInfo,
      currencyCode,
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
    }

    const nativeBalance =
      this.walletLocalData.totalBalances[this.currencyInfo.currencyCode] ?? '0'

    let nativeNetworkFee = mul(miningFees.gasPrice, otherParams.gas)
    let totalTxAmount = '0'
    let parentNetworkFee = null
    let l1Fee = '0'

    // Optimism-style L1 fees are deducted automatically from the account.
    // Arbitrum-style L1 gas must be included in the transaction object.
    if (this.optimismRollupParams != null) {
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

    if (currencyCode === this.currencyInfo.currencyCode) {
      nativeNetworkFee = add(nativeNetworkFee, l1Fee)
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
      const balanceToken =
        this.walletLocalData.totalBalances[currencyCode] ?? '0'
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

    if (edgeTransaction.currencyCode === this.currencyInfo.currencyCode) {
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

    let nonce: string | undefined = otherParams.nonceUsed
    if (nonce == null) {
      // Use an unconfirmed nonce if
      // 1. We have unconfirmed spending txs in the transaction list
      // 2. It is greater than the confirmed nonce
      // Otherwise, use the next nonce
      if (
        this.walletLocalData.numUnconfirmedSpendTxs != null &&
        gt(this.otherData.unconfirmedNextNonce, this.otherData.nextNonce)
      ) {
        nonce = this.otherData.unconfirmedNextNonce
        this.walletLocalDataDirty = true
      } else {
        nonce = this.otherData.nextNonce
      }
    }
    // Convert nonce to hex for tsParams
    const nonceHex = toHex(nonce)

    // Data:

    let data
    if (otherParams.data != null) {
      data = otherParams.data
      if (edgeTransaction.currencyCode !== this.currencyInfo.currencyCode) {
        // Smart contract calls only allow for tx value if it's the parent currency
        txValue = '0x00'
      }
    } else if (
      edgeTransaction.currencyCode === this.currencyInfo.currencyCode
    ) {
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
    const { currencyCode, tokenId } = edgeTransaction

    const txOtherParams = asMaybe(asEthereumTxOtherParams)(
      edgeTransaction.otherParams
    )

    let replacedTxid = edgeTransaction.txid
    let replacedTxIndex = await this.findTransaction(
      currencyCode,
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
          currencyCode,
          normalizeAddress(replacedTxid)
        )
      }

      if (replacedTxIndex === -1) {
        // Cannot allow an unsaved (unobserved) transaction to be replaced
        return null
      }
    }
    const replacedTx: EdgeTransaction =
      this.transactionList[currencyCode][replacedTxIndex]

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

    const parentNativeBalance =
      this.walletLocalData.totalBalances[this.currencyInfo.currencyCode] ?? '0'

    if (currencyCode === this.currencyInfo.currencyCode) {
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
      const balanceToken =
        this.walletLocalData.totalBalances[currencyCode] ?? '0'
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
      const { currencyCode } = edgeTransaction
      const txid = normalizeAddress(txOtherParams.replacedTxid)
      const index = this.findTransaction(currencyCode, txid)

      if (index !== -1) {
        const replacedEdgeTransaction =
          this.transactionList[currencyCode][index]

        // Use the RBF metadata because metadata for replaced transaction is not
        // present in edge-currency-accountbased state
        const metadata = edgeTransaction.metadata

        // Update the transaction's blockHeight to -1 (drops the transaction)
        const updatedEdgeTransaction: EdgeTransaction = {
          ...replacedEdgeTransaction,
          metadata,
          blockHeight: -1
        }

        this.addTransaction(currencyCode, updatedEdgeTransaction)
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
