/**
 * Created by paul on 7/7/17.
 */
// @flow

import Common from '@ethereumjs/common'
import { Transaction } from '@ethereumjs/tx'
import WalletConnect from '@walletconnect/client'
import { bns } from 'biggystring'
import { asMaybe } from 'cleaners'
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
  getEdgeInfoServer,
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
import { calcMiningFee } from './ethMiningFees.js'
import { EthereumNetwork } from './ethNetwork'
import { EthereumPlugin } from './ethPlugin'
import { EIP712TypedDataSchema, EthGasStationSchema } from './ethSchema.js'
import {
  type EIP712TypedDataParam,
  type EthereumFee,
  type EthereumFees,
  type EthereumFeesGasPrice,
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
  asEthereumFees,
  asWcSessionRequestParams
} from './ethTypes.js'

const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000 // 10 minutes
const ETH_GAS_STATION_WEI_MULTIPLIER = 100000000 // 100 million is the multiplier for ethgassstation because it uses 10x gwei
const WEI_MULTIPLIER = 1000000000
const GAS_PRICE_SANITY_CHECK = 30000 // 3000 Gwei (ethgasstation api reports gas prices with additional decimal place)

export class EthereumEngine extends CurrencyEngine {
  otherData: EthereumWalletOtherData
  initOptions: EthereumInitOptions
  ethNetwork: EthereumNetwork
  lastEstimatedGasLimit: LastEstimatedGasLimit
  fetchCors: EdgeFetchFunction
  walletConnectors: WalletConnectors
  otherMethods: EthereumOtherMethods
  utils: EthereumUtils

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
    this.walletConnectors = {}

    this.utils = {
      signMessage: (message: string) => {
        if (!isHex(removeHexPrefix(message)))
          throw new Error('ErrorInvalidMessage')
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
        }

        const spendInfo: EdgeSpendInfo = {
          currencyCode,
          spendTargets: [spendTarget],
          networkFeeOption: 'standard',
          otherParams: params
        }

        const {
          gasLimit,
          gasPrice: { minGasPrice }
        } =
          this.currencyInfo.defaultSettings.otherSettings.defaultNetworkFees
            .default

        const customNetworkFee = {
          gasLimit:
            this.currencyInfo.currencyCode === currencyCode
              ? gasLimit.regularTransaction
              : gasLimit.tokenTransaction,
          gasPrice: minGasPrice
        }

        if (params.gas != null) {
          spendInfo.networkFeeOption = 'custom'
          customNetworkFee.gasLimit = hexToDecimal(params.gas)
        }
        if (params.gasPrice != null) {
          spendInfo.networkFeeOption = 'custom'
          customNetworkFee.gasPrice = hexToDecimal(params.gasPrice)
        }
        if (spendInfo.networkFeeOption === 'custom') {
          spendInfo.customNetworkFee = customNetworkFee
        }

        return spendInfo
      }
    }

    this.otherMethods = {
      personal_sign: params => this.utils.signMessage(params[0]),
      eth_sign: params => this.utils.signMessage(params[1]),
      eth_signTypedData: params =>
        this.utils.signTypedData(JSON.parse(params[1])),
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
                  this.log.error(
                    `Wallet connect session_request ${error?.message ?? ''}`
                  )
                  throw error
                }
                const dApp = asWcSessionRequestParams(payload).params[0]
                // Set connector in memory
                this.walletConnectors[wcProps.uri] = {
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
                    uri: connector.uri,
                    dApp: this.walletConnectors[connector.uri].dApp,
                    payload
                  }
                  if (
                    payload.method === 'eth_sendTransaction' ||
                    payload.method === 'eth_signTransaction'
                  ) {
                    payload.params = [
                      {
                        // make sure transaction methods have fee
                        ...{
                          gas: `0x${decimalToHex(
                            this.otherData.networkFees.default.gasLimit
                              .tokenTransaction
                          )}`,
                          gasPrice: `0x${decimalToHex(
                            this.otherData.networkFees.default.gasPrice
                              .standardFeeHigh
                          )}`
                        },
                        ...payload.params[0]
                      }
                    ]
                  }
                  this.currencyEngineCallbacks.onWcNewContractCall(out)
                } catch (e) {
                  this.log.warn(
                    `Wallet connect call_request ${e?.message ?? ''}`
                  )
                  throw e
                }
              }
            )
          }),
          5000
        )
      },
      wcConnect: (wcProps: WcProps) => {
        this.walletConnectors[wcProps.uri].connector.approveSession({
          accounts: [this.walletInfo.keys.publicKey],
          chainId:
            this.currencyInfo.defaultSettings.otherSettings.chainParams.chainId // required
        })
      },
      wcDisconnect: (uri: string) => {
        this.walletConnectors[uri].connector.killSession()
        delete this.walletConnectors[uri]
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
                this.walletConnectors[uri].connector.approveRequest(
                  requestBody({ result: result })
                )
                break
              case 'eth_signTransaction':
                this.walletConnectors[uri].connector.approveRequest(
                  requestBody({ result: result.signedTx })
                )
                break
              case 'eth_sendTransaction':
              case 'eth_sendRawTransaction':
                this.walletConnectors[uri].connector.approveRequest(
                  requestBody({ result: result.txid })
                )
            }
          } catch (e) {
            this.walletConnectors[uri].connector.rejectRequest(
              requestBody({
                error: {
                  message: 'rejected'
                }
              })
            )
            throw e
          }
        } else {
          this.walletConnectors[uri].connector.rejectRequest(
            requestBody({
              error: {
                message: 'rejected'
              }
            })
          )
        }
      },
      wcGetConnections: () =>
        Object.keys(this.walletConnectors).map(
          uri => ({
            ...this.walletConnectors[uri].dApp,
            ...this.walletConnectors[uri].wcProps
          }) // NOTE: keys are all the uris from the walletConnectors. This returns all the wsProps
        )
    }
  }

  updateBalance(tk: string, balance: string) {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!bns.eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.log.warn(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
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

  // curreently for Ethereum but should allow other currencies
  async checkUpdateNetworkFees() {
    // Get the network fees from the info server
    try {
      const infoServer = getEdgeInfoServer()
      const url = `${infoServer}/v1/networkFees/${this.currencyInfo.currencyCode}`
      const jsonObj: EthereumFees = await this.ethNetwork.fetchGet(url)
      const valid = asMaybe(asEthereumFees)(jsonObj) != null

      if (valid) {
        if (
          JSON.stringify(this.walletLocalData.otherData.networkFees) !==
          JSON.stringify(jsonObj)
        ) {
          this.walletLocalData.otherData.networkFees = jsonObj
          this.walletLocalDataDirty = true
        }
      } else {
        this.log.error(
          `Error: Fetched invalid networkFees ${JSON.stringify(jsonObj)}`
        )
      }
    } catch (err) {
      this.log.error(
        `Error fetching ${this.currencyInfo.currencyCode} networkFees from Edge info server`
      )
      this.log.error(err)
    }

    try {
      const { baseFeePerGas } = await this.ethNetwork.getBaseFeePerGas()

      if (baseFeePerGas == null) throw new Error('baseFeePerGas is null')

      // Update the network fees from network base fee
      return this.updateNetworkFeesFromBaseFeePerGas(
        hexToDecimal(baseFeePerGas)
      )
    } catch (error) {
      this.log.error(error)
    }

    try {
      // If base fee is not suppported, update network fees fromethgasstation.info
      this.log.warn(`Updating networkFees from ethgasstation.info`)
      this.updateNetworkFeesFromEthGasStation()
    } catch (error) {
      this.log.error(error)
    }
  }

  async updateNetworkFeesFromBaseFeePerGas(baseFeePerGas: string) {
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
    const baseMultiplier =
      networkFees.default.baseFeeMultiplier ||
      defaultNetworkFee.baseFeeMultiplier

    // Make sure the properties exist
    if (minPriorityFee == null || baseMultiplier == null) {
      return
    }

    const { gasPrice } = networkFees.default

    const formula = (baseMultiplier: string): string =>
      bns.div(
        bns.add(bns.mul(baseMultiplier, baseFeePerGas), minPriorityFee),
        '1'
      )

    // Update default network fees
    networkFees.default = {
      ...networkFees.default,
      gasPrice: {
        ...gasPrice,
        ...Object.keys(baseMultiplier).reduce(
          (fees, key) => ({ ...fees, [key]: formula(baseMultiplier[key]) }),
          {}
        )
      }
    }
  }

  // deprecate after london hardfork because of EIP 1559
  async updateNetworkFeesFromEthGasStation() {
    let jsonObj
    try {
      const { ethGasStationUrl } =
        this.currencyInfo.defaultSettings.otherSettings
      if (ethGasStationUrl == null) return
      const { ethGasStationApiKey } = this.initOptions
      jsonObj = await this.ethNetwork.fetchGet(
        `${ethGasStationUrl}?api-key=${ethGasStationApiKey || ''}`
      )
      const valid = validateObject(jsonObj, EthGasStationSchema)

      if (valid) {
        const fees: EthereumFees = this.walletLocalData.otherData.networkFees
        const ethereumFee: EthereumFee = fees.default
        if (!ethereumFee.gasPrice) {
          return
        }
        const gasPrice: EthereumFeesGasPrice = ethereumFee.gasPrice

        const safeLow = jsonObj.safeLow
        let average = jsonObj.average
        let fast = jsonObj.fast
        let fastest = jsonObj.fastest

        // Sanity checks
        if (safeLow <= 0 || safeLow > GAS_PRICE_SANITY_CHECK) {
          throw new Error('Invalid safeLow value from EthGasStation')
        }
        if (average < 1 || average > GAS_PRICE_SANITY_CHECK) {
          throw new Error('Invalid average value from EthGasStation')
        }
        if (fast < 1 || fast > GAS_PRICE_SANITY_CHECK) {
          throw new Error('Invalid fastest value from EthGasStation')
        }
        if (fastest < 1 || fastest > GAS_PRICE_SANITY_CHECK) {
          throw new Error('Invalid fastest value from EthGasStation')
        }

        // Correct inconsistencies
        if (average <= safeLow) average = safeLow + 1
        if (fast <= average) fast = average + 1
        if (fastest <= fast) fastest = fast + 1

        let lowFee = safeLow
        let standardFeeLow = fast
        let standardFeeHigh = (fast + fastest) * 0.75
        let highFee = fastest

        lowFee = (
          Math.round(lowFee) * ETH_GAS_STATION_WEI_MULTIPLIER
        ).toString()
        standardFeeLow = (
          Math.round(standardFeeLow) * ETH_GAS_STATION_WEI_MULTIPLIER
        ).toString()
        standardFeeHigh = (
          Math.round(standardFeeHigh) * ETH_GAS_STATION_WEI_MULTIPLIER
        ).toString()
        highFee = (
          Math.round(highFee) * ETH_GAS_STATION_WEI_MULTIPLIER
        ).toString()

        if (
          gasPrice.lowFee !== lowFee ||
          gasPrice.standardFeeLow !== standardFeeLow ||
          gasPrice.highFee !== highFee ||
          gasPrice.standardFeeHigh !== standardFeeHigh
        ) {
          gasPrice.lowFee = lowFee
          gasPrice.standardFeeLow = standardFeeLow
          gasPrice.highFee = highFee
          gasPrice.standardFeeHigh = standardFeeHigh
          this.walletLocalDataDirty = true
        }
      } else {
        throw new Error(`Error: Fetched invalid networkFees from EthGasStation`)
      }
    } catch (err) {
      this.log.error(
        `Error fetching ${this.currencyInfo.currencyCode} networkFees from EthGasStation`
      )
      this.log.error(err)
      this.log.crash(err, { rawData: jsonObj })
    }
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
    this.addToLoop('checkUpdateNetworkFees', NETWORKFEES_POLL_MILLISECONDS)

    this.ethNetwork.needsLoop()

    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
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
            this.log.warn(
              'lookhere estimateGas estimateGasResult',
              JSON.stringify(estimateGasResult)
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
      } catch (err) {
        this.log.error(`makeSpend Error determining gas limit ${err}`)
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
      // Othewise, use the next nonce
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
    this.log.warn(`signTx getAddressString ${wallet.getAddressString()}`)

    // Create and sign transaction
    const unsignedTx = Transaction.fromTxData(txParams, { common })
    const signedTx = unsignedTx.sign(privKey)

    edgeTransaction.signedTx = bufToHex(signedTx.serialize())
    edgeTransaction.txid = bufToHex(signedTx.hash())
    edgeTransaction.date = Date.now() / 1000
    if (edgeTransaction.otherParams) {
      edgeTransaction.otherParams.nonceUsed = nonce
    }
    this.log.warn(`signTx\n${cleanTxLogs(edgeTransaction)}`)
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    await this.ethNetwork.multicastServers('broadcastTx', edgeTransaction)

    // Success
    this.log.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)

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
    let contractAddress = obj.contractAddress.replace('0x', '').toLowerCase()
    if (!isHex(contractAddress) || contractAddress.length !== 40) {
      throw new Error('ErrorInvalidContractAddress')
    }
    contractAddress = '0x' + contractAddress
    super.addCustomToken(obj, contractAddress)
  }
}

export { CurrencyEngine }
