/**
 * Created by paul on 7/7/17.
 */
// @flow

import Common from '@ethereumjs/common'
import { Transaction } from '@ethereumjs/tx'
import WalletConnect from '@walletconnect/client'
import { bns } from 'biggystring'
import {
  type EdgeCurrencyEngineOptions,
  type EdgeCurrencyInfo,
  type EdgeFetchFunction,
  type EdgeSpendInfo,
  type EdgeSpendTarget,
  type EdgeTransaction,
  type EdgeWalletInfo,
  InsufficientFundsError
} from 'edge-core-js/types'
// eslint-disable-next-line camelcase
import { signTypedData_v4 } from 'eth-sig-util'
import abi from 'ethereumjs-abi'
import EthereumUtil from 'ethereumjs-util'
import ethWallet from 'ethereumjs-wallet'

import { CurrencyEngine } from '../common/engine.js'
import { type CustomToken } from '../common/types'
import {
  addHexPrefix,
  bufToHex,
  cleanTxLogs,
  decimalToHex,
  getOtherParams,
  hexToBuf,
  hexToDecimal,
  isHex,
  normalizeAddress,
  removeHexPrefix,
  timeout,
  toHex,
  validateObject
} from '../common/utils'
import { NETWORK_FEES_POLL_MILLISECONDS, WEI_MULTIPLIER } from './ethConsts.js'
import { EthereumNetwork } from './ethNetwork'
import { EthereumPlugin } from './ethPlugin'
import { EIP712TypedDataSchema } from './ethSchema.js'
import {
  type EIP712TypedDataParam,
  type EthereumBaseMultiplier,
  type EthereumFee,
  type EthereumFees,
  type EthereumInitOptions,
  type EthereumOtherMethods,
  type EthereumSettings,
  type EthereumTxOtherParams,
  type EthereumUtils,
  type EthereumWalletOtherData,
  type LastEstimatedGasLimit,
  type TxRpcParams,
  type WalletConnectors,
  type WcDappDetails,
  type WcProps,
  type WcRpcPayload,
  asWcSessionRequestParams
} from './ethTypes.js'
import { calcMiningFee } from './fees/ethMiningFees.js'
import { type FeeProviderFunction, FeeProviders } from './fees/feeProviders.js'

const walletConnectors: WalletConnectors = {}

export class EthereumEngine extends CurrencyEngine {
  otherData: EthereumWalletOtherData
  initOptions: EthereumInitOptions
  ethNetwork: EthereumNetwork
  lastEstimatedGasLimit: LastEstimatedGasLimit
  fetchCors: EdgeFetchFunction
  otherMethods: EthereumOtherMethods
  utils: EthereumUtils
  infoFeeProvider: () => Promise<EthereumFee>
  externalFeeProviders: FeeProviderFunction[]
  constructor(
    currencyPlugin: EthereumPlugin,
    walletInfo: EdgeWalletInfo,
    initOptions: EthereumInitOptions,
    opts: EdgeCurrencyEngineOptions,
    currencyInfo: EdgeCurrencyInfo,
    fetchCors: EdgeFetchFunction
  ) {
    super(currencyPlugin, walletInfo, opts)
    const { pluginId } = this.currencyInfo
    if (typeof this.walletInfo.keys[`${pluginId}Key`] !== 'string') {
      if (walletInfo.keys.keys && walletInfo.keys.keys[`${pluginId}Key`]) {
        this.walletInfo.keys[`${pluginId}Key`] =
          walletInfo.keys.keys[`${pluginId}Key`]
      }
    }
    this.currencyPlugin = currencyPlugin
    this.initOptions = initOptions
    this.ethNetwork = new EthereumNetwork(this, this.currencyInfo)
    this.lastEstimatedGasLimit = {
      publicAddress: '',
      contractAddress: '',
      gasLimit: ''
    }
    this.fetchCors = fetchCors

    // Update network fees from other providers
    const { infoFeeProvider, externalFeeProviders } = FeeProviders(
      this.io.fetch,
      this.currencyInfo,
      this.initOptions,
      this.log
    )
    this.infoFeeProvider = infoFeeProvider
    this.externalFeeProviders = [
      this.updateNetworkFeesFromBaseFeePerGas,
      ...externalFeeProviders
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

      signTypedData: (typedData: EIP712TypedDataParam) => {
        // Adapted from https://github.com/ethereum/EIPs/blob/master/assets/eip-712/Example.js
        const valid = validateObject(typedData, EIP712TypedDataSchema)
        if (!valid) throw new Error('ErrorInvalidTypedData')

        const privKey = Buffer.from(this.getDisplayPrivateSeed(), 'hex')
        const types = typedData.types

        // Recursively finds all the dependencies of a type
        function dependencies(primaryType, found = []) {
          if (found.includes(primaryType)) {
            return found
          }
          if (types[primaryType] === undefined) {
            return found
          }
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

        function encodeType(primaryType) {
          // Get dependencies primary first, then alphabetical
          let deps = dependencies(primaryType)
          deps = deps.filter(t => t !== primaryType)
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

        function typeHash(primaryType) {
          return EthereumUtil.keccak256(encodeType(primaryType))
        }

        function encodeData(primaryType, data) {
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

        function structHash(primaryType, data) {
          return EthereumUtil.keccak256(encodeData(primaryType, data))
        }

        function signHash() {
          return EthereumUtil.keccak256(
            Buffer.concat([
              Buffer.from('1901', 'hex'),
              structHash('EIP712Domain', typedData.domain),
              structHash(typedData.primaryType, typedData.message)
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
            gasPrice: bns.div(
              hexToDecimal(removeHexPrefix(params.gasPrice)),
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
        } catch (e) {
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
        const spendInfo = this.utils.txRpcParamsToSpendInfo(params[0], cc)
        const tx = await this.makeSpend(spendInfo)
        const signedTx = await this.signTx(tx)
        return this.broadcastTx(signedTx)
      },
      eth_signTransaction: async (params, cc) => {
        const spendInfo = this.utils.txRpcParamsToSpendInfo(params[0], cc)
        const tx = await this.makeSpend(spendInfo)
        return this.signTx(tx)
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
          ourReceiveAddresses: []
        }

        return this.broadcastTx(tx)
      },

      // Wallet Connect utils
      wcInit: async (
        wcProps: WcProps,
        walletName: string = 'Edge'
      ): Promise<WcDappDetails> => {
        return timeout(
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
              (error: Error, payload: WcRpcPayload) => {
                if (error) {
                  this.error(`Wallet connect session_request`, error)
                  throw error
                }
                const params = asWcSessionRequestParams(payload).params[0]
                const dApp = { ...params, timeConnected: Date.now() / 1000 }
                // Set connector in memory
                walletConnectors[wcProps.uri] = {
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
              (error: Error, payload: WcRpcPayload) => {
                try {
                  if (error) throw error
                  const out = {
                    uri: wcProps.uri,
                    dApp: walletConnectors[wcProps.uri].dApp,
                    payload,
                    walletId: walletConnectors[wcProps.uri].walletId
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
                            this.otherData.networkFees.default.gasPrice
                              .standardFeeHigh
                          )
                        },
                        ...payload.params[0]
                      }
                    ]
                  }
                  this.currencyEngineCallbacks.onWcNewContractCall(out)
                } catch (e) {
                  this.warn(`Wallet connect call_request `, e)
                  throw e
                }
              }
            )

            connector.on('disconnect', (error, payload) => {
              if (error) {
                throw error
              }
              delete walletConnectors[wcProps.uri]
            })
          }),
          5000
        )
      },
      wcConnect: (uri: string, publicKey: string, walletId: string) => {
        walletConnectors[uri].connector.approveSession({
          accounts: [publicKey],
          chainId:
            this.currencyInfo.defaultSettings.otherSettings.chainParams.chainId // required
        })
        walletConnectors[uri].walletId = walletId
      },
      wcDisconnect: (uri: string) => {
        walletConnectors[uri].connector.killSession()
        delete walletConnectors[uri]
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
            const result = await this.otherMethods[`${payload.method}`](
              payload.params
            )

            switch (payload.method) {
              case 'personal_sign':
              case 'eth_sign':
              case 'eth_signTypedData':
              case 'eth_signTypedData_v4':
                walletConnectors[uri].connector.approveRequest(
                  requestBody({ result: result })
                )
                break
              case 'eth_signTransaction':
                walletConnectors[uri].connector.approveRequest(
                  requestBody({ result: result.signedTx })
                )
                break
              case 'eth_sendTransaction':
              case 'eth_sendRawTransaction':
                walletConnectors[uri].connector.approveRequest(
                  requestBody({ result: result.txid })
                )
            }
          } catch (e) {
            walletConnectors[uri].connector.rejectRequest(
              requestBody({
                error: {
                  message: 'rejected'
                }
              })
            )
            throw e
          }
        } else {
          walletConnectors[uri].connector.rejectRequest(
            requestBody({
              error: {
                message: 'rejected'
              }
            })
          )
        }
      },
      wcGetConnections: () =>
        Object.keys(walletConnectors)
          .filter(uri => walletConnectors[uri].walletId === this.walletInfo.id)
          .map(
            uri => ({
              ...walletConnectors[uri].dApp,
              ...walletConnectors[uri].wcProps
            }) // NOTE: keys are all the uris from the walletConnectors. This returns all the wsProps
          )
    }
  }

  processUnconfirmedTransaction(tx: Object) {
    const fromAddress = '0x' + tx.inputs[0].addresses[0]
    const toAddress = '0x' + tx.outputs[0].addresses[0]
    const epochTime = Date.parse(tx.received) / 1000
    const ourReceiveAddresses: string[] = []

    let nativeAmount: string
    if (
      normalizeAddress(fromAddress) ===
      normalizeAddress(this.walletLocalData.publicKey)
    ) {
      if (fromAddress === toAddress) {
        // Spend to self
        nativeAmount = bns.sub('0', tx.fees.toString(10))
      } else {
        nativeAmount = (0 - tx.total).toString(10)
        nativeAmount = bns.sub(nativeAmount, tx.fees.toString(10))
      }
    } else {
      nativeAmount = tx.total.toString(10)
      ourReceiveAddresses.push(this.walletLocalData.publicKey)
    }

    const otherParams: EthereumTxOtherParams = {
      from: [fromAddress],
      to: [toAddress],
      gas: '',
      gasPrice: '',
      gasUsed: tx.fees.toString(10),
      cumulativeGasUsed: '',
      errorVal: 0,
      tokenRecipientAddress: null
    }

    const edgeTransaction: EdgeTransaction = {
      txid: addHexPrefix(tx.hash),
      date: epochTime,
      currencyCode: this.currencyInfo.currencyCode,
      blockHeight: 0,
      nativeAmount,
      networkFee: tx.fees.toString(10),
      ourReceiveAddresses,
      signedTx: '',
      otherParams
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  /**
   *  Fetch network fees from various providers in order of priority, stopping
   *  and writing upon successful result.
   */
  async updateNetworkFees() {
    for (const externalFeeProvider of this.externalFeeProviders) {
      try {
        const ethereumFee = await externalFeeProvider()
        if (ethereumFee == null) continue
        this.walletLocalData.otherData.networkFees.default.gasPrice = {
          ...this.walletLocalData.otherData.networkFees.default.gasPrice,
          ethereumFee
        }
        this.walletLocalDataDirty = true
        break
      } catch (e) {
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
  async updateNetworkFeesFromBaseFeePerGas(): Promise<EthereumBaseMultiplier | void> {
    // Get base fees from 'rpcServers' and convert to our network fees format.
    // * Supported for post EIP-1559 chains only
    const { supportsEIP1559 = false } =
      this.currencyInfo.defaultSettings.otherSettings
    if (!supportsEIP1559) return

    const { baseFeePerGas } = await this.ethNetwork.getBaseFeePerGas()
    if (baseFeePerGas == null) return
    const baseFeePerGasDecimal = hexToDecimal(baseFeePerGas)

    const networkFees: EthereumFees = this.walletLocalData.otherData.networkFees

    // Make sure there is a default network fee entry and gasPrice entry
    if (networkFees.default == null || networkFees.default.gasPrice == null) {
      return
    }

    const defaultNetworkFee: EthereumFee =
      this.currencyInfo.defaultSettings.otherSettings.defaultNetworkFees.default

    // The minimum priority fee for slow transactions
    const minPriorityFee =
      networkFees.default.minPriorityFee || defaultNetworkFee.minPriorityFee
    // This is how much we will multiply the base fee by
    const baseMultiplier: EthereumBaseMultiplier =
      networkFees.default.baseFeeMultiplier ||
      defaultNetworkFee.baseFeeMultiplier

    // Make sure the properties exist
    if (minPriorityFee == null || baseMultiplier == null) return

    for (const feeType of Object.keys(baseMultiplier)) {
      const baseFee = bns.mul(baseMultiplier[feeType], baseFeePerGasDecimal)
      const totalFee = bns.add(baseFee, minPriorityFee)
      baseMultiplier[feeType] = bns.div(totalFee, '1')
    }

    return baseMultiplier
  }

  async clearBlockchainCache() {
    await super.clearBlockchainCache()
    this.otherData.nextNonce = '0'
    this.otherData.unconfirmedNextNonce = '0'
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  async startEngine() {
    this.engineOn = true
    // Fetch the static fees from the info server only once to avoid overwriting live values.
    this.infoFeeProvider()
      .then(info => {
        Object.assign(this.walletLocalData.otherData.networkFees.default, info)
        this.walletLocalDataDirty = true
      })
      .catch(() => this.warn('Error fetching fees from Info Server'))
      .finally(() =>
        this.addToLoop('updateNetworkFees', NETWORK_FEES_POLL_MILLISECONDS)
      )

    this.ethNetwork.needsLoop()
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
        const diff = bns.sub(max, min)
        if (bns.lte(diff, '1')) {
          return min
        }
        const mid = bns.add(min, bns.div(diff, '2'))

        // Try the average:
        spendInfo.spendTargets[0].nativeAmount = mid
        const { gasPrice, gasLimit } = calcMiningFee(
          spendInfo,
          this.walletLocalData.otherData.networkFees,
          this.currencyInfo
        )
        const fee = bns.mul(gasPrice, gasLimit)
        const totalAmount = bns.add(mid, fee)
        if (bns.gt(totalAmount, balance)) {
          return getMax(min, mid)
        } else {
          return getMax(mid, max)
        }
      }

      return getMax('0', bns.add(balance, '1'))
    } else {
      // For tokens, the max amount is the balance but we should call makeSpend to make sure there's
      // enough mainnet currency to pay the fee
      spendInfo.spendTargets[0].nativeAmount = balance
      await this.makeSpend(spendInfo)
      return this.getBalance({
        currencyCode: spendInfo.currencyCode
      })
    }
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode } = super.makeSpend(edgeSpendInfoIn)

    /**
    For RBF transactions, get the gas price and limit (fees) of the existing
    transaction as well as the current nonce. The fees and the nonce will be
    used instead of the calculated equivalents.
    */
    let rbfGasPrice: string
    let rbfGasLimit: string
    let rbfNonce: string
    const rbfTxid =
      edgeSpendInfo.rbfTxid && normalizeAddress(edgeSpendInfo.rbfTxid)
    if (rbfTxid) {
      const rbfTxIndex = this.findTransaction(currencyCode, rbfTxid)

      if (rbfTxIndex > -1) {
        const rbfTrx = this.transactionList[currencyCode][rbfTxIndex]

        if (rbfTrx.otherParams) {
          const { gasPrice, gas, nonceUsed } = rbfTrx.otherParams
          rbfGasPrice = bns.mul(gasPrice, '2')
          rbfGasLimit = gas
          rbfNonce = nonceUsed
        }
      }

      if (!rbfGasPrice || !rbfGasLimit || !rbfNonce) {
        throw new Error('Missing data to complete RBF transaction.')
      }
    }

    // Ethereum can only have one output
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }

    const spendTarget = edgeSpendInfo.spendTargets[0]
    const publicAddress = spendTarget.publicAddress
    if (!EthereumUtil.isValidAddress(publicAddress)) {
      throw new TypeError(`Invalid ${this.currencyInfo.pluginId} address`)
    }

    let data =
      spendTarget.otherParams != null ? spendTarget.otherParams.data : undefined

    let otherParams: Object = {}

    let gasPrice: string
    let gasLimit: string
    let useDefaults: boolean = false

    // Use RBF gas price and gas limit when present, otherwise, calculate mining fees
    if (rbfGasPrice && rbfGasLimit) {
      gasPrice = rbfGasPrice
      gasLimit = rbfGasLimit
    } else {
      const miningFees = calcMiningFee(
        edgeSpendInfo,
        this.walletLocalData.otherData.networkFees,
        this.currencyInfo
      )
      gasPrice = miningFees.gasPrice
      gasLimit = miningFees.gasLimit
      useDefaults = miningFees.useDefaults
    }

    const defaultGasLimit = gasLimit
    let nativeAmount = edgeSpendInfo.spendTargets[0].nativeAmount

    let contractAddress
    let value
    if (currencyCode === this.currencyInfo.currencyCode) {
      const ethParams: EthereumTxOtherParams = {
        from: [this.walletLocalData.publicKey],
        to: [publicAddress],
        gas: gasLimit,
        gasPrice: gasPrice,
        gasUsed: '0',
        cumulativeGasUsed: '0',
        errorVal: 0,
        tokenRecipientAddress: null,
        nonceArg: rbfNonce,
        rbfTxid,
        data
      }
      otherParams = ethParams
      value = bns.add(nativeAmount, '0', 16)
    } else {
      if (data) {
        contractAddress = publicAddress
      } else {
        const tokenInfo = this.getTokenInfo(currencyCode)
        if (!tokenInfo || typeof tokenInfo.contractAddress !== 'string') {
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
        cumulativeGasUsed: '0',
        errorVal: 0,
        tokenRecipientAddress: publicAddress,
        nonceArg: rbfNonce,
        rbfTxid,
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
      if (!data) {
        const dataArray = abi.simpleEncode(
          'transfer(address,uint256):(uint256)',
          contractAddress || publicAddress,
          value
        )
        data = '0x' + Buffer.from(dataArray).toString('hex')
      }

      const estimateGasParams = [
        {
          to: contractAddress || publicAddress,
          from: this.walletLocalData.publicKey,
          gas: '0xffffff',
          value,
          data
        },
        'latest'
      ]
      try {
        // Determine if recipient is a normal or contract address
        const getCodeResult = await this.ethNetwork.multicastServers(
          'eth_getCode',
          [contractAddress || publicAddress, 'latest']
        )

        try {
          if (getCodeResult.result.result !== '0x') {
            const estimateGasResult = await this.ethNetwork.multicastServers(
              'eth_estimateGas',
              estimateGasParams
            )
            gasLimit = bns.add(
              parseInt(estimateGasResult.result.result, 16).toString(),
              '0'
            )
            // Overestimate gas limit to reduce chance of failure when sending to a contract
            if (currencyCode === this.currencyInfo.currencyCode) {
              // Double gas limit estimate when sending ETH to contract
              gasLimit = bns.mul(gasLimit, '2')
            } else {
              // For tokens, double estimate if it's less than half of default, otherwise use default. For estimates beyond default value, use the estimate as-is.
              gasLimit = bns.lt(gasLimit, bns.div(defaultGasLimit, '2'))
                ? bns.mul(gasLimit, '2')
                : bns.lt(gasLimit, defaultGasLimit)
                ? defaultGasLimit
                : gasLimit
            }
          } else {
            gasLimit = '21000'
          }
        } catch (e) {
          // If we know the address is a contract but estimateGas fails use the default token gas limit
          if (
            this.currencyInfo.defaultSettings.otherSettings.defaultNetworkFees
              .default.gasLimit.tokenTransaction != null
          )
            gasLimit =
              this.currencyInfo.defaultSettings.otherSettings.defaultNetworkFees
                .default.gasLimit.tokenTransaction
        }

        // Sanity check calculated value
        if (bns.lt(gasLimit, '21000')) {
          gasLimit = defaultGasLimit
          this.lastEstimatedGasLimit.gasLimit = ''
          throw new Error('Calculated gasLimit less than minimum')
        }

        // Save locally to compare for future makeSpend() calls
        this.lastEstimatedGasLimit = {
          publicAddress,
          contractAddress,
          gasLimit
        }
      } catch (e) {
        this.error(`makeSpend Error determining gas limit `, e)
      }
    } else if (useDefaults) {
      // If recipient and contract address are the same from the previous makeSpend(), use the previously calculated gasLimit
      gasLimit = this.lastEstimatedGasLimit.gasLimit
    }
    otherParams.gas = gasLimit

    const nativeBalance =
      this.walletLocalData.totalBalances[this.currencyInfo.currencyCode]

    let nativeNetworkFee = bns.mul(gasPrice, gasLimit)
    let totalTxAmount = '0'
    let parentNetworkFee = null

    if (currencyCode === this.currencyInfo.currencyCode) {
      totalTxAmount = bns.add(nativeNetworkFee, nativeAmount)
      if (bns.gt(totalTxAmount, nativeBalance)) {
        throw new InsufficientFundsError()
      }
      nativeAmount = bns.mul(totalTxAmount, '-1')
    } else {
      parentNetworkFee = nativeNetworkFee
      // Check if there's enough parent currency to pay the transaction fee, and if not return the parent currency code and amount
      if (bns.gt(nativeNetworkFee, nativeBalance)) {
        throw new InsufficientFundsError({
          currencyCode: this.currencyInfo.currencyCode,
          networkFee: nativeNetworkFee
        })
      }
      const balanceToken = this.walletLocalData.totalBalances[currencyCode]
      if (bns.gt(nativeAmount, balanceToken)) {
        throw new InsufficientFundsError()
      }
      nativeNetworkFee = '0' // Do not show a fee for token transactions.
      nativeAmount = bns.mul(nativeAmount, '-1')
    }
    // **********************************
    // Create the unsigned EdgeTransaction

    // This is used for display purposes in the GUI
    const feeRateUsed = {
      // Convert gasPrice from wei to gwei
      gasPrice: bns.div(
        gasPrice,
        WEI_MULTIPLIER.toString(),
        WEI_MULTIPLIER.toString().length - 1
      ),
      gasLimit
    }

    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee
      feeRateUsed,
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams // otherParams
    }

    if (parentNetworkFee) {
      edgeTransaction.parentNetworkFee = parentNetworkFee
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)

    // Do signing
    const gasLimitHex = toHex(otherParams.gas)
    const gasPriceHex = toHex(otherParams.gasPrice)
    let nativeAmountHex

    if (edgeTransaction.currencyCode === this.currencyInfo.currencyCode) {
      // Remove the networkFee from the nativeAmount
      const nativeAmount = bns.add(
        edgeTransaction.nativeAmount,
        edgeTransaction.networkFee
      )
      nativeAmountHex = bns.mul('-1', nativeAmount, 16)
    } else {
      nativeAmountHex = bns.mul('-1', edgeTransaction.nativeAmount, 16)
    }

    // Nonce:

    const nonceArg: string = otherParams.nonceArg
    let nonce: string = nonceArg
    if (!nonce) {
      // Use an unconfirmed nonce if
      // 1. We have unconfirmed spending txs in the transaction list
      // 2. It is greater than the confirmed nonce
      // 3. Is no more than 5 higher than confirmed nonce
      // Otherwise, use the next nonce
      if (
        this.walletLocalData.numUnconfirmedSpendTxs &&
        bns.gt(
          this.walletLocalData.otherData.unconfirmedNextNonce,
          this.walletLocalData.otherData.nextNonce
        )
      ) {
        const diff = bns.sub(
          this.walletLocalData.otherData.unconfirmedNextNonce,
          this.walletLocalData.otherData.nextNonce
        )
        if (bns.lte(diff, '5')) {
          nonce = this.walletLocalData.otherData.unconfirmedNextNonce
          this.walletLocalData.otherData.unconfirmedNextNonce = bns.add(
            this.walletLocalData.otherData.unconfirmedNextNonce,
            '1'
          )
          this.walletLocalDataDirty = true
        } else {
          const e = new Error('Excessive pending spend transactions')
          e.name = 'ErrorExcessivePendingSpends'
          throw e
        }
      } else {
        nonce = this.walletLocalData.otherData.nextNonce
        this.walletLocalData.otherData.unconfirmedNextNonce = bns.add(
          this.walletLocalData.otherData.nextNonce,
          '1'
        )
      }
    }
    // Convert nonce to hex for tsParams
    const nonceHex = toHex(nonce)

    // Data:

    let data
    if (otherParams.data != null) {
      data = otherParams.data
    } else if (
      edgeTransaction.currencyCode === this.currencyInfo.currencyCode
    ) {
      data = ''
    } else {
      const dataArray = abi.simpleEncode(
        'transfer(address,uint256):(uint256)',
        otherParams.tokenRecipientAddress,
        nativeAmountHex
      )
      data = '0x' + Buffer.from(dataArray).toString('hex')
      nativeAmountHex = '0x00'
    }

    // Select the chain
    const otherSettings: EthereumSettings =
      this.currencyInfo.defaultSettings.otherSettings
    const { chainParams } = otherSettings
    const common = Common.custom(chainParams)

    // Transaction Parameters
    const txParams = {
      nonce: nonceHex,
      gasPrice: gasPriceHex,
      gasLimit: gasLimitHex,
      to: otherParams.to[0],
      value: nativeAmountHex,
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
    if (edgeTransaction.otherParams) {
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

  getDisplayPrivateSeed() {
    if (
      this.walletInfo.keys &&
      this.walletInfo.keys[`${this.currencyInfo.pluginId}Key`]
    ) {
      return this.walletInfo.keys[`${this.currencyInfo.pluginId}Key`]
    }
    return ''
  }

  getDisplayPublicSeed() {
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      return this.walletInfo.keys.publicKey
    }
    return ''
  }

  // Overload saveTx to mutate replaced transactions by RBF
  async saveTx(edgeTransaction: EdgeTransaction) {
    // We must check if this transaction replaces another transaction
    if (edgeTransaction.otherParams && edgeTransaction.otherParams.rbfTxid) {
      const { currencyCode } = edgeTransaction

      // Get the replaced transaction using the rbfTxid
      const txid = edgeTransaction.otherParams.rbfTxid
      const idx = this.findTransaction(currencyCode, txid)
      const replacedEdgeTransaction = this.transactionList[currencyCode][idx]

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

    super.saveTx(edgeTransaction)
  }

  async addCustomToken(obj: CustomToken) {
    const { contractAddress } = obj
    if (
      !isHex(contractAddress) ||
      removeHexPrefix(contractAddress).length !== 40
    ) {
      throw new Error('ErrorInvalidContractAddress')
    }
    super.addCustomToken(obj, contractAddress.toLowerCase())
  }
}

export { CurrencyEngine }
