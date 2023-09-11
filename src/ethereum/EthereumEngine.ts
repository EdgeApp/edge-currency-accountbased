import Common from '@ethereumjs/common'
import { Transaction } from '@ethereumjs/tx'
import { add, ceil, div, gt, lt, lte, mul, sub } from 'biggystring'
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
  bufToHex,
  cleanTxLogs,
  decimalToHex,
  getFetchCors,
  getOtherParams,
  hexToBuf,
  hexToDecimal,
  isHex,
  mergeDeeply,
  normalizeAddress,
  toHex
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
  CalcL1RollupFeeParams,
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
  L1RollupParams,
  LastEstimatedGasLimit,
  SafeEthWalletInfo,
  TxRpcParams
} from './ethereumTypes'
import { calcL1RollupFees, calcMiningFees } from './fees/ethMiningFees'
import {
  FeeProviderFunction,
  FeeProviders,
  printFees
} from './fees/feeProviders'

export class EthereumEngine extends CurrencyEngine<
  EthereumTools,
  SafeEthWalletInfo
> {
  otherData!: EthereumWalletOtherData
  initOptions: EthereumInitOptions
  networkInfo: EthereumNetworkInfo
  ethNetwork: EthereumNetwork
  lastEstimatedGasLimit: LastEstimatedGasLimit
  fetchCors: EdgeFetchFunction
  otherMethods: EthereumOtherMethods
  utils: EthereumUtils
  infoFeeProvider: () => Promise<EthereumFees>
  externalFeeProviders: FeeProviderFunction[]
  l1RollupParams?: L1RollupParams
  networkFees: EthereumFees
  constructor(
    env: PluginEnvironment<EthereumNetworkInfo>,
    tools: EthereumTools,
    walletInfo: SafeEthWalletInfo,
    initOptions: EthereumInitOptions,
    opts: EdgeCurrencyEngineOptions,
    currencyInfo: EdgeCurrencyInfo
  ) {
    super(env, tools, walletInfo, opts)
    this.initOptions = initOptions
    this.networkInfo = env.networkInfo
    this.ethNetwork = new EthereumNetwork(this)
    this.lastEstimatedGasLimit = {
      publicAddress: '',
      contractAddress: '',
      gasLimit: ''
    }
    if (this.networkInfo.l1RollupParams != null) {
      this.l1RollupParams = this.networkInfo.l1RollupParams
    }
    this.networkFees = this.networkInfo.defaultNetworkFees
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
      signMessage: (message: string, privateKeys: EthereumPrivateKeys) => {
        if (!isHex(message)) throw new Error('ErrorInvalidMessage')
        const privKey = Buffer.from(privateKeys.privateKey, 'hex')
        const messageBuffer = hexToBuf(message)
        const messageHash = EthereumUtil.hashPersonalMessage(messageBuffer)
        const { v, r, s } = EthereumUtil.ecsign(messageHash, privKey)

        return EthereumUtil.toRpcSig(v, r, s)
      },

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
          currencyCode: this.currencyInfo.currencyCode,
          spendTargets: [spendTarget],
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
                  this.networkFees.default.gasPrice?.standardFeeHigh ?? '0'
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
              if (this.networkFees.default.gasLimit?.tokenTransaction == null) {
                this.ethNetwork
                  .multicastServers('eth_estimateGas', txParam)
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
                  this.networkFees.default.gasLimit?.tokenTransaction
                )
              }
              break
            }
          }

          return {
            nativeAmount,
            networkFee
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
    const { contractAddress, estimateGasParams, miningFees, publicAddress } =
      context
    const hasUserMemo = estimateGasParams[0].data != null

    // If destination address is the same from the previous
    // estimate call, use the previously calculated gasLimit.
    if (
      this.lastEstimatedGasLimit.gasLimit !== '' &&
      this.lastEstimatedGasLimit.publicAddress === publicAddress &&
      this.lastEstimatedGasLimit.contractAddress === contractAddress
    ) {
      return this.lastEstimatedGasLimit.gasLimit
    }

    let gasLimitReturn = miningFees.gasLimit
    try {
      // Determine if recipient is a normal or contract address
      const getCodeResult = await this.ethNetwork.multicastServers(
        'eth_getCode',
        [estimateGasParams[0].to, 'latest']
      )
      // result === '0x' means we are sending to a plain address (no contract)
      const sendingToContract = getCodeResult.result.result !== '0x'

      const tryEstimatingGasLimit = async (
        attempt: number = 0
      ): Promise<void> => {
        const defaultGasLimit =
          this.networkInfo.defaultNetworkFees.default.gasLimit
        try {
          if (defaultGasLimit != null && !sendingToContract && !hasUserMemo) {
            // Easy case of sending plain mainnet token with no memo/data
            gasLimitReturn = defaultGasLimit.regularTransaction
          } else {
            const estimateGasResult = await this.ethNetwork.multicastServers(
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
          // Save locally to compare for future estimate calls
          this.lastEstimatedGasLimit = {
            publicAddress,
            contractAddress,
            gasLimit: gasLimitReturn
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
          this.networkFees.default.gasLimit?.minGasLimit ?? '21000'
        )
      ) {
        // Revert gasLimit back to the value from calcMiningFee
        gasLimitReturn = miningFees.gasLimit
        this.lastEstimatedGasLimit.gasLimit = ''
        throw new Error('Calculated gasLimit less than minimum')
      }
    } catch (e: any) {
      this.error(`makeSpend Error determining gas limit `, e)
    }

    return gasLimitReturn
  }

  setOtherData(raw: any): void {
    this.otherData = asEthereumWalletOtherData(raw)
  }

  /**
   *  Fetch network fees from various providers in order of priority, stopping
   *  and writing upon successful result.
   */
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async updateNetworkFees() {
    for (const externalFeeProvider of this.externalFeeProviders) {
      try {
        const ethereumFee = await externalFeeProvider()
        if (ethereumFee == null) continue

        const ethereumFeeInts: { [key: string]: string } = {}
        Object.keys(ethereumFee).forEach(key => {
          const k = key as KeysOfEthereumBaseMultiplier
          ethereumFeeInts[k] = biggyRoundToNearestInt(ethereumFee[k])
        })
        if (this.networkFees.default.gasPrice != null) {
          this.networkFees.default.gasPrice = {
            ...this.networkFees.default.gasPrice,
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
  }

  async updateL1RollupParams(): Promise<void> {
    if (this.l1RollupParams == null) return

    // L1GasPrice
    try {
      const params = {
        to: this.l1RollupParams.oracleContractAddress,
        data: this.l1RollupParams.gasPricel1BaseFeeMethod
      }
      const response = await this.ethNetwork.multicastServers(
        'eth_call',
        params
      )
      const result = asRpcResultString(response.result)

      this.l1RollupParams = {
        ...this.l1RollupParams,
        gasPriceL1Wei: ceil(
          mul(
            hexToDecimal(result.result),
            this.l1RollupParams.maxGasPriceL1Multiplier
          ),
          0
        )
      }
    } catch (e: any) {
      this.log.warn('Failed to update l1GasPrice', e)
    }

    // Dynamic overhead (scalar)
    try {
      const params = {
        to: this.l1RollupParams.oracleContractAddress,
        data: this.l1RollupParams.dynamicOverheadMethod
      }
      const response = await this.ethNetwork.multicastServers(
        'eth_call',
        params
      )

      const result = asRpcResultString(response.result)
      this.l1RollupParams = {
        ...this.l1RollupParams,
        dynamicOverhead: hexToDecimal(result.result)
      }
    } catch (e: any) {
      this.log.warn('Failed to update dynamicOverhead', e)
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

    const { baseFeePerGas } = await this.ethNetwork.getBaseFeePerGas()
    if (baseFeePerGas == null) return
    const baseFeePerGasDecimal = hexToDecimal(baseFeePerGas)

    const networkFees: EthereumFees = this.networkFees

    // Make sure there is a default network fee entry and gasPrice entry
    if (networkFees.default == null || networkFees.default.gasPrice == null) {
      return
    }

    const defaultNetworkFee: EthereumFee =
      this.networkInfo.defaultNetworkFees.default

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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async startEngine() {
    this.engineOn = true
    const feeUpdateFrequencyMs =
      this.networkInfo.feeUpdateFrequencyMs ?? NETWORK_FEES_POLL_MILLISECONDS
    // Fetch the static fees from the info server only once to avoid overwriting live values.
    this.infoFeeProvider()
      .then(info => {
        this.log.warn(`infoFeeProvider:`, JSON.stringify(info, null, 2))

        this.networkFees = mergeDeeply(this.networkFees, info)
      })
      .catch(() => this.warn('Error fetching fees from Info Server'))
      .finally(
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        async () =>
          await this.addToLoop('updateNetworkFees', feeUpdateFrequencyMs)
      )
    this.addToLoop('updateL1RollupParams', ROLLUP_FEE_PARAMS).catch(() => {})
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.ethNetwork.needsLoop()
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    super.startEngine()
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

    const balance = this.getBalance({
      currencyCode: spendInfo.currencyCode
    })

    const spendTarget = spendInfo.spendTargets[0]
    const publicAddress = spendTarget.publicAddress
    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }
    const { contractAddress, data, value } = this.getTxParameterInformation(
      edgeSpendInfo,
      currencyCode,
      this.currencyInfo
    )

    if (spendInfo.currencyCode === this.currencyInfo.currencyCode) {
      // For mainnet currency, the fee can scale with the amount sent so we should find the
      // appropriate amount by recursively calling calcMiningFee. This is adapted from the
      // same function in edge-core-js.

      const getMax = async (min: string, max: string): Promise<string> => {
        const diff = sub(max, min)
        if (lte(diff, '1')) {
          return min
        }
        const mid = add(min, div(diff, '2'))

        // Try the average:
        spendInfo.spendTargets[0].nativeAmount = mid
        const miningFees = calcMiningFees(
          spendInfo,
          this.networkFees,
          this.currencyInfo,
          this.networkInfo
        )
        if (miningFees.useEstimatedGasLimit) {
          miningFees.gasLimit = await this.estimateGasLimit({
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
        const fee = mul(miningFees.gasPrice, miningFees.gasLimit)
        let l1Fee = '0'

        if (this.l1RollupParams != null) {
          const txData: CalcL1RollupFeeParams = {
            nonce: this.otherData.unconfirmedNextNonce,
            gasPriceL1Wei: this.l1RollupParams.gasPriceL1Wei,
            gasLimit: miningFees.gasLimit,
            to: publicAddress,
            value: decimalToHex(mid),
            chainParams: this.networkInfo.chainParams,
            dynamicOverhead: this.l1RollupParams.dynamicOverhead,
            fixedOverhead: this.l1RollupParams.fixedOverhead
          }
          l1Fee = calcL1RollupFees(txData)
        }
        const totalAmount = add(add(mid, fee), l1Fee)
        if (gt(totalAmount, balance)) {
          return await getMax(min, mid)
        } else {
          return await getMax(mid, max)
        }
      }

      return await getMax('0', add(balance, '1'))
    } else {
      spendInfo.spendTargets[0].nativeAmount = balance
      await this.makeSpend(spendInfo)
      return this.getBalance({
        currencyCode: spendInfo.currencyCode
      })
    }
  }

  getTxParameterInformation(
    edgeSpendInfo: EdgeSpendInfo,
    currencyCode: string,
    currencyInfo: EdgeCurrencyInfo
  ): EthereumTxParameterInformation {
    const { spendTargets } = edgeSpendInfo
    const spendTarget = spendTargets[0]
    const { publicAddress, nativeAmount } = spendTarget

    // Get data:
    let data: string | undefined =
      spendTarget.memo ?? spendTarget.otherParams?.data
    if (data != null && data.length > 0 && !isHex(data)) {
      throw new Error(`Memo/data field must be of type 'hex'`)
    }
    if (data === '') data = undefined

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

    const { pendingTxs = [] } = edgeSpendInfo

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
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!EthereumUtil.isValidAddress(publicAddress)) {
      throw new TypeError(`Invalid ${this.currencyInfo.pluginId} address`)
    }

    let otherParams: EthereumTxOtherParams

    const miningFees = calcMiningFees(
      edgeSpendInfo,
      this.networkFees,
      this.currencyInfo,
      this.networkInfo
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
    if (contractAddress == null) {
      otherParams = {
        from: [this.walletLocalData.publicKey],
        to: [publicAddress],
        gas: miningFees.gasLimit,
        gasPrice: miningFees.gasPrice,
        gasUsed: '0',
        nonceUsed,
        data,
        isFromMakeSpend: true
      }
    } else {
      otherParams = {
        from: [this.walletLocalData.publicKey],
        to: [contractAddress],
        gas: miningFees.gasLimit,
        gasPrice: miningFees.gasPrice,
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

    if (this.l1RollupParams != null) {
      const txData: CalcL1RollupFeeParams = {
        nonce: otherParams.nonceUsed,
        gasPriceL1Wei: this.l1RollupParams.gasPriceL1Wei,
        gasLimit: otherParams.gas,
        to: otherParams.to[0],
        value: value,
        data: otherParams.data,
        chainParams: this.networkInfo.chainParams,
        dynamicOverhead: this.l1RollupParams.dynamicOverhead,
        fixedOverhead: this.l1RollupParams.fixedOverhead
      }
      l1Fee = calcL1RollupFees(txData)
    }

    //
    // Balance checks:
    //

    if (currencyCode === this.currencyInfo.currencyCode) {
      nativeNetworkFee = add(nativeNetworkFee, l1Fee)
      totalTxAmount = add(nativeNetworkFee, nativeAmount)
      if (!skipChecks && gt(totalTxAmount, nativeBalance)) {
        throw new InsufficientFundsError()
      }
      nativeAmount = mul(totalTxAmount, '-1')
    } else {
      parentNetworkFee = add(nativeNetworkFee, l1Fee)
      // Check if there's enough parent currency to pay the transaction fee, and if not return the parent currency code and amount
      if (!skipChecks && gt(nativeNetworkFee, nativeBalance)) {
        throw new InsufficientFundsError({
          currencyCode: this.currencyInfo.currencyCode,
          networkFee: nativeNetworkFee
        })
      }
      const balanceToken =
        this.walletLocalData.totalBalances[currencyCode] ?? '0'
      if (!skipChecks && gt(nativeAmount, balanceToken)) {
        throw new InsufficientFundsError()
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
      feeRateUsed: getFeeRateUsed(miningFees.gasPrice, otherParams.gas),
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee
      otherParams, // otherParams
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
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

    return this.utils.signMessage(message, ethereumPrivateKeys)
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
    const gasPriceHex = toHex(otherParams.gasPrice)
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
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!nonce) {
      // Use an unconfirmed nonce if
      // 1. We have unconfirmed spending txs in the transaction list
      // 2. It is greater than the confirmed nonce
      // 3. Is no more than 5 higher than confirmed nonce
      // Otherwise, use the next nonce
      if (
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        this.walletLocalData.numUnconfirmedSpendTxs &&
        gt(this.otherData.unconfirmedNextNonce, this.otherData.nextNonce)
      ) {
        const diff = sub(
          this.otherData.unconfirmedNextNonce,
          this.otherData.nextNonce
        )
        if (lte(diff, '5')) {
          nonce = this.otherData.unconfirmedNextNonce
          this.walletLocalDataDirty = true
        } else {
          const e = new Error('Excessive pending spend transactions')
          e.name = 'ErrorExcessivePendingSpends'
          throw e
        }
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

    // Transaction Parameters
    const txParams = {
      nonce: nonceHex,
      gasPrice: gasPriceHex,
      gasLimit: gasLimitHex,
      to: otherParams.to[0],
      value: txValue,
      data
    }

    const privKey = Buffer.from(ethereumPrivateKeys.privateKey, 'hex')

    // Log the private key address
    const wallet = ethWallet.fromPrivateKey(privKey)
    this.warn(`signTx getAddressString ${wallet.getAddressString()}`)

    // Create and sign transaction
    const unsignedTx = Transaction.fromTxData(txParams, { common })
    const signedTx = unsignedTx.sign(privKey)

    edgeTransaction.signedTx = bufToHex(signedTx.serialize())
    edgeTransaction.txid = bufToHex(signedTx.hash())
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
    await this.ethNetwork.multicastServers('broadcastTx', edgeTransaction)

    // Success
    this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)

    return edgeTransaction
  }

  async accelerate(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction | null> {
    const { currencyCode } = edgeTransaction

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
    const gasPrice = mul(replacedTxOtherParams.gasPrice, '2')
    const gasLimit = replacedTxOtherParams.gas
    const newOtherParams: EthereumTxOtherParams = {
      ...replacedTxOtherParams,
      gas: gasLimit,
      gasPrice,
      replacedTxid
    }

    let { nativeAmount } = spendTarget
    let nativeNetworkFee = mul(gasPrice, gasLimit)
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
        throw new InsufficientFundsError()
      }
      nativeAmount = mul(totalTxAmount, '-1')
    } else {
      parentNetworkFee = nativeNetworkFee
      // Check if there's enough parent currency to pay the transaction fee, and if not return the parent currency code and amount
      if (gt(nativeNetworkFee, parentNativeBalance)) {
        throw new InsufficientFundsError({
          currencyCode: this.currencyInfo.currencyCode,
          networkFee: nativeNetworkFee
        })
      }
      const balanceToken =
        this.walletLocalData.totalBalances[currencyCode] ?? '0'
      if (gt(nativeAmount, balanceToken)) {
        throw new InsufficientFundsError()
      }
      nativeNetworkFee = '0' // Do not show a fee for token transactions.
      nativeAmount = mul(nativeAmount, '-1')
    }

    // Return a EdgeTransaction object with the updates
    return {
      ...edgeTransaction,
      txid: '',
      feeRateUsed: getFeeRateUsed(gasPrice, gasLimit),
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

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    super.saveTx(edgeTransaction)
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
