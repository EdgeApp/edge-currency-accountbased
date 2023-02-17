import Common from '@ethereumjs/common'
import { Transaction } from '@ethereumjs/tx'
import WalletConnect from '@walletconnect/client'
import { add, div, gt, lt, lte, mul, sub } from 'biggystring'
import { asMaybe } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeFetchFunction,
  EdgeSpendInfo,
  EdgeSpendTarget,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
// eslint-disable-next-line camelcase
import { signTypedData_v4 } from 'eth-sig-util'
import abi from 'ethereumjs-abi'
import EthereumUtil from 'ethereumjs-util'
import ethWallet from 'ethereumjs-wallet'

import { CurrencyEngine } from '../common/engine'
import { PluginEnvironment } from '../common/innerPlugin'
import { CustomToken } from '../common/types'
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
  removeHexPrefix,
  timeout,
  toHex
} from '../common/utils'
import { NETWORK_FEES_POLL_MILLISECONDS, WEI_MULTIPLIER } from './ethConsts'
import { EthereumNetwork, getFeeRateUsed } from './ethNetwork'
import { EthereumTools } from './ethPlugin'
import { asEIP712TypedData } from './ethSchema'
import {
  asEthereumTxOtherParams,
  asEthereumWalletOtherData,
  asWcSessionRequestParams,
  EIP712TypedDataParam,
  EthereumBaseMultiplier,
  EthereumFee,
  EthereumFees,
  EthereumInitOptions,
  EthereumNetworkInfo,
  EthereumOtherMethods,
  EthereumTxOtherParams,
  EthereumUtils,
  EthereumWalletOtherData,
  KeysOfEthereumBaseMultiplier,
  LastEstimatedGasLimit,
  TxRpcParams,
  WcDappDetails,
  WcProps,
  WcRpcPayload
} from './ethTypes'
import { calcMiningFee } from './fees/ethMiningFees'
import {
  FeeProviderFunction,
  FeeProviders,
  printFees
} from './fees/feeProviders'

export class EthereumEngine
  extends CurrencyEngine<EthereumTools>
  implements EdgeCurrencyEngine
{
  otherData!: EthereumWalletOtherData
  initOptions: EthereumInitOptions
  networkInfo: EthereumNetworkInfo
  ethNetwork: EthereumNetwork
  lastEstimatedGasLimit: LastEstimatedGasLimit
  fetchCors: EdgeFetchFunction
  otherMethods: EthereumOtherMethods
  utils: EthereumUtils
  infoFeeProvider: () => Promise<EthereumFee>
  externalFeeProviders: FeeProviderFunction[]
  constructor(
    env: PluginEnvironment<EthereumNetworkInfo>,
    tools: EthereumTools,
    walletInfo: EdgeWalletInfo,
    initOptions: EthereumInitOptions,
    opts: EdgeCurrencyEngineOptions,
    currencyInfo: EdgeCurrencyInfo
  ) {
    super(env, tools, walletInfo, opts)
    const { pluginId } = this.currencyInfo
    if (typeof this.walletInfo.keys[`${pluginId}Key`] !== 'string') {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
      if (walletInfo.keys.keys && walletInfo.keys.keys[`${pluginId}Key`]) {
        this.walletInfo.keys[`${pluginId}Key`] =
          walletInfo.keys.keys[`${pluginId}Key`]
      }
    }
    this.initOptions = initOptions
    this.networkInfo = env.networkInfo
    this.ethNetwork = new EthereumNetwork(this)
    this.lastEstimatedGasLimit = {
      publicAddress: '',
      contractAddress: '',
      gasLimit: ''
    }
    this.fetchCors = getFetchCors(env)

    // Update network fees from other providers
    const { infoFeeProvider, externalFeeProviders } = FeeProviders(
      this.io.fetch,
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
      signMessage: (message: string) => {
        if (!isHex(message)) throw new Error('ErrorInvalidMessage')
        const privKey = Buffer.from(this.getDisplayPrivateSeed(), 'hex')
        const messageBuffer = hexToBuf(message)
        const messageHash = EthereumUtil.hashPersonalMessage(messageBuffer)
        const { v, r, s } = EthereumUtil.ecsign(messageHash, privKey)

        return EthereumUtil.toRpcSig(v, r, s)
      },

      // @ts-expect-error
      signTypedData: (typedData: EIP712TypedDataParam) => {
        // Adapted from https://github.com/ethereum/EIPs/blob/master/assets/eip-712/Example.js
        const clean = asEIP712TypedData(typedData)

        const privKey = Buffer.from(this.getDisplayPrivateSeed(), 'hex')
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

      txRpcParamsToSpendInfo: (params: TxRpcParams, currencyCode: string) => {
        const spendTarget: EdgeSpendTarget = { otherParams: params }
        if (params.to != null) {
          spendTarget.publicAddress = params.to
        }
        if (params.value != null) {
          spendTarget.nativeAmount = hexToDecimal(params.value)
        } else {
          spendTarget.nativeAmount = '0'
        }

        const spendInfo: EdgeSpendInfo = {
          currencyCode,
          spendTargets: [spendTarget],
          networkFeeOption: 'custom',
          customNetworkFee: {
            gasLimit: hexToDecimal(params.gas),
            gasPrice: div(
              hexToDecimal(params.gasPrice),
              WEI_MULTIPLIER.toString(),
              18
            )
          },
          otherParams: params
        }

        return spendInfo
      }
    }

    this.otherMethods = {
      personal_sign: params => this.utils.signMessage(params[0]),
      eth_sign: params => this.utils.signMessage(params[1]),
      eth_signTypedData: params => {
        try {
          return this.utils.signTypedData(JSON.parse(params[1]))
        } catch (e: any) {
          // It's possible that the dApp makes the wrong call.
          // Try to sign using the latest signTypedData_v4 method.
          return this.otherMethods.eth_signTypedData_v4(params)
        }
      },
      eth_signTypedData_v4: params =>
        signTypedData_v4(Buffer.from(this.getDisplayPrivateSeed(), 'hex'), {
          data: JSON.parse(params[1])
        }),
      eth_sendTransaction: async (params, cc) => {
        // @ts-expect-error
        const spendInfo = this.utils.txRpcParamsToSpendInfo(params[0], cc)
        const tx = await this.makeSpend(spendInfo)
        const signedTx = await this.signTx(tx)
        return await this.broadcastTx(signedTx)
      },
      eth_signTransaction: async (params, cc) => {
        // @ts-expect-error
        const spendInfo = this.utils.txRpcParamsToSpendInfo(params[0], cc)
        const tx = await this.makeSpend(spendInfo)
        return await this.signTx(tx)
      },
      eth_sendRawTransaction: async params => {
        const tx: EdgeTransaction = {
          currencyCode: '',
          nativeAmount: '',
          networkFee: '',
          blockHeight: 0,
          date: Date.now(),
          txid: '',
          signedTx: params[0],
          ourReceiveAddresses: [],
          walletId: this.walletId
        }

        return await this.broadcastTx(tx)
      },

      // Wallet Connect utils
      wcInit: async (
        wcProps: WcProps,
        walletName: string = 'Edge'
      ): Promise<WcDappDetails> => {
        return await timeout(
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          new Promise((resolve, reject) => {
            const connector = new WalletConnect({
              uri: wcProps.uri,
              storageId: wcProps.uri,
              clientMeta: {
                description: 'Edge Wallet',
                url: 'https://www.edge.app',
                icons: ['https://content.edge.app/Edge_logo_Icon.png'],
                name: walletName
              }
            })

            connector.on(
              'session_request',
              // @ts-expect-error
              (error: Error, payload: WcRpcPayload) => {
                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                if (error) {
                  this.error(`Wallet connect session_request`, error)
                  throw error
                }
                const params = asWcSessionRequestParams(payload).params[0]
                const dApp = { ...params, timeConnected: Date.now() / 1000 }
                // Set connector in memory
                this.tools.walletConnectors[wcProps.uri] = {
                  connector,
                  wcProps,
                  dApp
                }
                resolve(dApp)
              }
            )

            // Subscribe to call requests
            connector.on(
              'call_request',
              // @ts-expect-error
              (error: Error, payload: WcRpcPayload) => {
                try {
                  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                  if (error) throw error
                  const out = {
                    uri: wcProps.uri,
                    dApp: this.tools.walletConnectors[wcProps.uri].dApp,
                    payload,
                    walletId: this.tools.walletConnectors[wcProps.uri].walletId
                  }
                  if (
                    payload.method === 'eth_sendTransaction' ||
                    payload.method === 'eth_signTransaction'
                  ) {
                    payload.params = [
                      {
                        // make sure transaction methods have fee
                        ...{
                          gas: decimalToHex(
                            this.otherData.networkFees.default.gasLimit
                              .tokenTransaction
                          ),
                          gasPrice: decimalToHex(
                            // @ts-expect-error
                            this.otherData.networkFees.default.gasPrice
                              .standardFeeHigh
                          )
                        },
                        // @ts-expect-error
                        ...payload.params[0]
                      }
                    ]
                  }
                  this.currencyEngineCallbacks.onWcNewContractCall(out)
                } catch (e: any) {
                  this.warn(`Wallet connect call_request `, e)
                  throw e
                }
              }
            )

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            connector.on('disconnect', (error, payload) => {
              if (error != null) {
                throw error
              }
              // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
              delete this.tools.walletConnectors[wcProps.uri]
            })
          }),
          5000
        )
      },
      wcConnect: (uri: string, publicKey: string, walletId: string) => {
        this.tools.walletConnectors[uri].connector.approveSession({
          accounts: [publicKey],
          chainId: this.networkInfo.chainParams.chainId // required
        })
        this.tools.walletConnectors[uri].walletId = walletId
      },
      wcDisconnect: (uri: string) => {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.tools.walletConnectors[uri].connector.killSession()
        // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
        delete this.tools.walletConnectors[uri]
      },
      wcRequestResponse: async (
        uri: string,
        approve: boolean,
        payload: WcRpcPayload
      ) => {
        const requestBody = (result: Object): Object => ({
          id: payload.id,
          jsonrpc: '2.0',
          ...result
        })

        if (approve) {
          try {
            // @ts-expect-error
            const result = await this.otherMethods[`${payload.method}`](
              payload.params
            )

            switch (payload.method) {
              case 'personal_sign':
              case 'eth_sign':
              case 'eth_signTypedData':
              case 'eth_signTypedData_v4':
                this.tools.walletConnectors[uri].connector.approveRequest(
                  requestBody({ result: result })
                )
                break
              case 'eth_signTransaction':
                this.tools.walletConnectors[uri].connector.approveRequest(
                  requestBody({ result: result.signedTx })
                )
                break
              case 'eth_sendTransaction':
              case 'eth_sendRawTransaction':
                this.tools.walletConnectors[uri].connector.approveRequest(
                  requestBody({ result: result.txid })
                )
            }
          } catch (e: any) {
            this.tools.walletConnectors[uri].connector.rejectRequest(
              requestBody({
                error: {
                  message: 'rejected'
                }
              })
            )
            throw e
          }
        } else {
          this.tools.walletConnectors[uri].connector.rejectRequest(
            requestBody({
              error: {
                message: 'rejected'
              }
            })
          )
        }
      },
      wcGetConnections: () =>
        Object.keys(this.tools.walletConnectors)
          .filter(
            uri =>
              this.tools.walletConnectors[uri].walletId === this.walletInfo.id
          )
          .map(
            uri => ({
              ...this.tools.walletConnectors[uri].dApp,
              ...this.tools.walletConnectors[uri].wcProps
            }) // NOTE: keys are all the uris from the walletConnectors. This returns all the wsProps
          )
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asEthereumWalletOtherData(raw)

    if (this.otherData.networkFees.default.gasPrice == null) {
      this.otherData.networkFees = {
        ...this.networkInfo.defaultNetworkFees
      }
    }
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
        if (this.otherData.networkFees.default.gasPrice != null) {
          this.otherData.networkFees.default.gasPrice = {
            ...this.otherData.networkFees.default.gasPrice,
            ...ethereumFeeInts
          }
        }
        this.walletLocalDataDirty = true
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

    const networkFees: EthereumFees = this.otherData.networkFees

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
    this.otherData.networkFees = this.networkInfo.defaultNetworkFees
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

        this.otherData.networkFees = mergeDeeply(
          this.otherData.networkFees,
          info
        )
        this.walletLocalDataDirty = true
      })
      .catch(() => this.warn('Error fetching fees from Info Server'))
      .finally(
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        async () =>
          await this.addToLoop('updateNetworkFees', feeUpdateFrequencyMs)
      )

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

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    const balance = this.getBalance({
      currencyCode: spendInfo.currencyCode
    })

    if (spendInfo.currencyCode === this.currencyInfo.currencyCode) {
      // For mainnet currency, the fee can scale with the amount sent so we should find the
      // appropriate amount by recursively calling calcMiningFee. This is adapted from the
      // same function in edge-core-js.

      const getMax = (min: string, max: string): string => {
        const diff = sub(max, min)
        if (lte(diff, '1')) {
          return min
        }
        const mid = add(min, div(diff, '2'))

        // Try the average:
        spendInfo.spendTargets[0].nativeAmount = mid
        const { gasPrice, gasLimit } = calcMiningFee(
          spendInfo,
          this.otherData.networkFees,
          this.currencyInfo,
          this.networkInfo
        )
        const fee = mul(gasPrice, gasLimit)
        const totalAmount = add(mid, fee)
        if (gt(totalAmount, balance)) {
          return getMax(min, mid)
        } else {
          return getMax(mid, max)
        }
      }

      return getMax('0', add(balance, '1'))
    } else {
      spendInfo.spendTargets[0].nativeAmount = balance
      await this.makeSpend(spendInfo)
      return this.getBalance({
        currencyCode: spendInfo.currencyCode
      })
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

    let data = spendTarget.memo ?? spendTarget.otherParams?.data
    if (data != null && data.length > 0 && !isHex(data)) {
      throw new Error(`Memo/data field must be of type 'hex'`)
    }

    if (data === '') data = undefined

    const hasUserMemo = data != null

    let otherParams: Object = {}

    const miningFees = calcMiningFee(
      edgeSpendInfo,
      this.otherData.networkFees,
      this.currencyInfo,
      this.networkInfo
    )
    const gasPrice = miningFees.gasPrice
    let gasLimit: string = miningFees.gasLimit
    const useDefaults: boolean = miningFees.useDefaults
    const defaultGasLimit = gasLimit

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

    let contractAddress
    let value
    if (currencyCode === this.currencyInfo.currencyCode) {
      const ethParams: EthereumTxOtherParams = {
        from: [this.walletLocalData.publicKey],
        to: [publicAddress],
        gas: gasLimit,
        gasPrice: gasPrice,
        gasUsed: '0',
        nonceUsed,
        data
      }
      otherParams = ethParams
      value = add(nativeAmount, '0', 16)
    } else {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (data) {
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
        value = '0x0'
      }

      const ethParams: EthereumTxOtherParams = {
        from: [this.walletLocalData.publicKey],
        to: [contractAddress],
        gas: gasLimit,
        gasPrice: gasPrice,
        gasUsed: '0',
        tokenRecipientAddress: publicAddress,
        nonceUsed,
        data
      }
      otherParams = ethParams
    }

    // If the recipient or contractaddress has changed from previous makeSpend(), calculate the gasLimit
    if (
      useDefaults &&
      (this.lastEstimatedGasLimit.publicAddress !== publicAddress ||
        this.lastEstimatedGasLimit.contractAddress !== contractAddress ||
        this.lastEstimatedGasLimit.gasLimit === '')
    ) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!data) {
        const dataArray = abi.simpleEncode(
          'transfer(address,uint256):(uint256)',
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
          contractAddress || publicAddress,
          value
        )
        data = '0x' + Buffer.from(dataArray).toString('hex')
      }

      const estimateGasParams = [
        {
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
          to: contractAddress || publicAddress,
          from: this.walletLocalData.publicKey,
          gas: '0xffffff',
          value,
          data
        },
        'latest'
      ]

      let cacheGasLimit = false
      try {
        // Determine if recipient is a normal or contract address
        const getCodeResult = await this.ethNetwork.multicastServers(
          'eth_getCode',
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-nullish-coalescing
          [contractAddress || publicAddress, 'latest']
        )
        // result === '0x' means we are sending to a plain address (no contract)
        const sendingToContract = getCodeResult.result.result !== '0x'

        try {
          if (!sendingToContract && !hasUserMemo) {
            // Easy case of sending plain mainnet token with no memo/data
            gasLimit = '21000'
          } else {
            const estimateGasResult = await this.ethNetwork.multicastServers(
              'eth_estimateGas',
              estimateGasParams
            )
            gasLimit = add(
              parseInt(estimateGasResult.result.result, 16).toString(),
              '0'
            )
            if (sendingToContract) {
              // Overestimate (double) gas limit to reduce chance of failure when sending
              // to a contract. This includes sending any ERC20 token, sending ETH
              // to a contract, sending tokens to a contract, or any contract
              // execution (ie approvals, unstaking, etc)
              gasLimit = mul(gasLimit, '2')
            }
          }
          cacheGasLimit = true
        } catch (e: any) {
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
          if (
            this.networkInfo.defaultNetworkFees.default.gasLimit
              .tokenTransaction != null
          )
            gasLimit =
              this.networkInfo.defaultNetworkFees.default.gasLimit
                .tokenTransaction
        }

        // Sanity check calculated value
        if (lt(gasLimit, '21000')) {
          gasLimit = defaultGasLimit
          this.lastEstimatedGasLimit.gasLimit = ''
          throw new Error('Calculated gasLimit less than minimum')
        }

        // Save locally to compare for future makeSpend() calls
        if (cacheGasLimit) {
          this.lastEstimatedGasLimit = {
            publicAddress,
            contractAddress,
            gasLimit
          }
        }
      } catch (e: any) {
        this.error(`makeSpend Error determining gas limit `, e)
      }
    } else if (useDefaults) {
      // If recipient and contract address are the same from the previous makeSpend(), use the previously calculated gasLimit
      gasLimit = this.lastEstimatedGasLimit.gasLimit
    }
    // @ts-expect-error
    otherParams.gas = gasLimit

    const nativeBalance =
      this.walletLocalData.totalBalances[this.currencyInfo.currencyCode]

    let nativeNetworkFee = mul(gasPrice, gasLimit)
    let totalTxAmount = '0'
    let parentNetworkFee = null

    //
    // Balance checks:
    //

    if (currencyCode === this.currencyInfo.currencyCode) {
      totalTxAmount = add(nativeNetworkFee, nativeAmount)
      if (!skipChecks && gt(totalTxAmount, nativeBalance)) {
        throw new InsufficientFundsError()
      }
      nativeAmount = mul(totalTxAmount, '-1')
    } else {
      parentNetworkFee = nativeNetworkFee
      // Check if there's enough parent currency to pay the transaction fee, and if not return the parent currency code and amount
      if (!skipChecks && gt(nativeNetworkFee, nativeBalance)) {
        throw new InsufficientFundsError({
          currencyCode: this.currencyInfo.currencyCode,
          networkFee: nativeNetworkFee
        })
      }
      const balanceToken = this.walletLocalData.totalBalances[currencyCode]
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
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee
      feeRateUsed: getFeeRateUsed(gasPrice, gasLimit),
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams, // otherParams
      walletId: this.walletId
    }

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (parentNetworkFee) {
      edgeTransaction.parentNetworkFee = parentNetworkFee
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
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

    const privKey = Buffer.from(
      this.walletInfo.keys[`${this.currencyInfo.pluginId}Key`],
      'hex'
    )

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

    // Transaction checks
    if (replacedTx == null || replacedTx.blockHeight > 0) {
      return null
    }
    // Other params checks
    if (
      replacedTxOtherParams == null ||
      replacedTxOtherParams.nonceUsed == null ||
      replacedTxOtherParams.data != null
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
      this.walletLocalData.totalBalances[this.currencyInfo.currencyCode]

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
      const balanceToken = this.walletLocalData.totalBalances[currencyCode]
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPrivateSeed() {
    if (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
      this.walletInfo.keys &&
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      this.walletInfo.keys[`${this.currencyInfo.pluginId}Key`]
    ) {
      return this.walletInfo.keys[`${this.currencyInfo.pluginId}Key`]
    }
    return ''
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPublicSeed() {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async addCustomToken(obj: CustomToken) {
    const { contractAddress } = obj
    if (
      !isHex(contractAddress) ||
      removeHexPrefix(contractAddress).length !== 40
    ) {
      throw new Error('ErrorInvalidContractAddress')
    }
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    super.addCustomToken(obj, contractAddress.toLowerCase())
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<EthereumNetworkInfo>,
  tools: EthereumTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { currencyInfo, initOptions } = env

  const engine = new EthereumEngine(
    env,
    tools,
    walletInfo,
    initOptions,
    opts,
    currencyInfo
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine(tools, walletInfo, opts)

  return engine
}
