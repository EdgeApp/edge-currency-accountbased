import { getGasPriceRangesFromChain } from '@chain-registry/utils'
import {
  decodeSignature,
  encodeSecp256k1Pubkey,
  makeSignDoc,
  Secp256k1HdWallet
} from '@cosmjs/amino'
import { stringToPath } from '@cosmjs/crypto'
import { fromBech32, toHex } from '@cosmjs/encoding'
import {
  decodeTxRaw,
  EncodeObject,
  encodePubkey,
  makeAuthInfoBytes
} from '@cosmjs/proto-signing'
import {
  AminoTypes,
  Coin,
  coin,
  createBankAminoConverters,
  createIbcAminoConverters,
  fromTendermintEvent
} from '@cosmjs/stargate'
import { longify } from '@cosmjs/stargate/build/queryclient'
import { fromRfc3339WithNanoseconds, toSeconds } from '@cosmjs/tendermint-rpc'
import { add, ceil, gt, lt, mul, sub } from 'biggystring'
import {
  asArray,
  asEither,
  asJSON,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown
} from 'cleaners'
import {
  AuthInfo,
  Fee,
  SignDoc,
  TxBody,
  TxRaw
} from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx'
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx'
import {
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeStakingStatus,
  EdgeTokenId,
  EdgeTransaction,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../../common/CurrencyEngine'
import { PluginEnvironment } from '../../common/innerPlugin'
import { getRandomDelayMs } from '../../common/network'
import { asMaybeContractLocation } from '../../common/tokenHelpers'
import { MakeTxParams } from '../../common/types'
import { cleanTxLogs } from '../../common/utils'
import { CosmosTools } from '../CosmosTools'
import {
  asCosmosPrivateKeys,
  asCosmosTxOtherParams,
  asCosmosWalletOtherData,
  asCosmosWcGetAccountsRpcPayload,
  asCosmosWcSignAminoRpcPayload,
  asCosmosWcSignDirectRpcPayload,
  CosmosClients,
  CosmosCoin,
  CosmosFee,
  CosmosNetworkInfo,
  CosmosOtherMethods,
  CosmosTxOtherParams,
  CosmosWalletOtherData,
  CosmosWcRpcPayload,
  IbcChannel,
  SafeCosmosWalletInfo,
  txQueryStrings
} from '../cosmosTypes'
import {
  assetFromString,
  checkAndValidateADR36AminoSignDoc,
  coerceToBytes,
  createCosmosClients,
  getIbcChannelAndPort,
  reduceCoinEventsForAddress,
  rpcWithApiKey,
  safeAddCoins,
  safeParse
} from '../cosmosUtils'

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TWO_WEEKS = 1000 * 60 * 60 * 24 * 14
const TWO_MINUTES = 1000 * 60 * 2
const TXS_PER_PAGE = 50

// RANGO-specific provider payload cleaner (provider-shaped Cosmos tx payloads)
const asRangoProviderTxData = asObject({
  chainId: asString,
  account_number: asEither(asNumber, asString),
  sequence: asEither(asNumber, asString),
  memo: asOptional(asString, ''),
  fee: asOptional(
    asObject({
      gas: asEither(asNumber, asString),
      amount: asArray(
        asObject({
          denom: asString,
          amount: asString
        })
      )
    })
  ),
  // Rango uses protoMsgs with type_url and value bytes; also sometimes amino msgs
  protoMsgs: asOptional(
    asArray(
      asObject({
        type_url: asString,
        value: asUnknown
      })
    )
  ),
  msgs: asOptional(asArray(asUnknown))
})

const asRangoProviderTxDataFromJson = asJSON(asRangoProviderTxData)

export class CosmosEngine extends CurrencyEngine<
  CosmosTools,
  SafeCosmosWalletInfo
> {
  networkInfo: CosmosNetworkInfo
  fetchCors: EdgeFetchFunction
  accountNumber: number
  sequence: number
  unconfirmedTransactionCache: {
    cacheSequence: number
    txids: Map<string, Date>
  }

  otherData!: CosmosWalletOtherData
  otherMethods: CosmosOtherMethods
  feeCache: Map<string, CosmosFee>
  stakedBalanceCache: string
  stakingSupported: boolean
  chainId: string

  constructor(
    env: PluginEnvironment<CosmosNetworkInfo>,
    tools: CosmosTools,
    walletInfo: SafeCosmosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.networkInfo = env.networkInfo
    this.fetchCors = env.io.fetchCors
    this.accountNumber = 0
    this.sequence = 0
    this.unconfirmedTransactionCache = {
      cacheSequence: 0,
      txids: new Map()
    }
    this.feeCache = new Map()
    this.stakedBalanceCache = '0'
    this.stakingSupported = true
    this.chainId = this.networkInfo.defaultChainId
    this.otherMethods = {
      getMaxTx: async (params: MakeTxParams) => {
        switch (params.type) {
          case 'MakeTxDeposit': {
            if (this.tools.methods.deposit == null) {
              throw new Error(
                `${this.currencyInfo.displayName} does not support the deposit method`
              )
            }

            const { assets, memo } = params

            if (assets.length !== 1) {
              throw new Error('Cannot calculate max tx for more than one asset')
            }

            const msg = this.tools.methods.deposit({
              assets,
              memo,
              signer: this.walletInfo.keys.bech32Address
            })

            const { networkFee } = await this.calculateFee({
              messages: [msg],
              memo
            })

            const balance = this.getBalance({
              tokenId: null
            })
            return sub(balance, networkFee)
          }
          default: {
            throw new Error(`Invalid type: ${params.type}`)
          }
        }
      },
      makeTx: async (params: MakeTxParams) => {
        switch (params.type) {
          case 'MakeTxDeposit': {
            if (this.tools.methods.deposit == null) {
              throw new Error(
                `${this.currencyInfo.displayName} does not support the deposit method`
              )
            }

            const { assets, memo, metadata } = params

            const memos: EdgeMemo[] = []
            if (memo !== '') {
              memos.push({ type: 'text', value: memo })
            }

            const msg = this.tools.methods.deposit({
              assets,
              memo,
              signer: this.walletInfo.keys.bech32Address
            })
            const unsignedTxHex = this.createUnsignedTxHex([msg], memo)

            let { gasFeeCoin, gasLimit, networkFee } = await this.calculateFee({
              messages: [msg],
              memo
            })
            const otherParams: CosmosTxOtherParams = {
              gasFeeCoin,
              gasLimit,
              unsignedTxHex
            }

            let currencyCode = this.currencyInfo.currencyCode
            let tokenId = null
            let nativeAmount = `-${networkFee}`
            let parentNetworkFee: string | undefined
            // For one asset, we can make a pretty good guess at filling in the EdgeTransaction fields
            if (assets.length === 1) {
              const asset = assets[0]

              const ticker = assetFromString(asset.asset).ticker
              if (ticker === this.currencyInfo.currencyCode) {
                nativeAmount = `-${add(asset.amount, networkFee)}`
              } else {
                const tokenObj = Object.entries(this.allTokensMap).find(
                  ([_, token]) => {
                    return token.currencyCode === ticker
                  }
                )
                if (tokenObj != null) {
                  tokenId = tokenObj[0]
                  currencyCode = ticker
                  nativeAmount = asset.amount
                  parentNetworkFee = networkFee
                  networkFee = '0'
                }
              }
            }

            const out: EdgeTransaction = {
              blockHeight: 0, // blockHeight,
              currencyCode,
              date: Date.now() / 1000,
              isSend: true,
              memos,
              metadata,
              nativeAmount,
              networkFee,
              parentNetworkFee,
              networkFees: [
                { tokenId: null, nativeAmount: parentNetworkFee ?? networkFee }
              ],
              otherParams,
              ourReceiveAddresses: [],
              signedTx: '',
              tokenId,
              txid: '',
              walletId: this.walletId
            }
            return out
          }
          case 'MakeTxDexSwap': {
            const { fromTokenId, fromNativeAmount, metadata, txData } = params

            if (txData == null)
              throw new Error('Cosmos MakeTxDexSwap requires txData')

            const memos: EdgeMemo[] = []

            // Accept only Rango provider-shaped payload for DEX swaps
            const rango = asRangoProviderTxDataFromJson(txData)

            // Build TxBody from Rango protoMsgs or msgs
            let messages: EncodeObject[] = []
            if (rango.protoMsgs != null && rango.protoMsgs.length > 0) {
              messages = rango.protoMsgs.map((m: any) => {
                const valueBytes = coerceToBytes(m.value)
                if (valueBytes == null)
                  throw new Error('Rango txData: message value is not bytes')
                return { typeUrl: String(m.type_url), value: valueBytes }
              })
            } else if (rango.msgs != null && rango.msgs.length > 0) {
              const aminoTypes = new AminoTypes({
                ...createBankAminoConverters(),
                ...createIbcAminoConverters()
              })
              messages = rango.msgs.map((aminoMsg: any) =>
                aminoTypes.fromAmino(aminoMsg)
              )
            } else {
              throw new Error('Rango txData has no messages')
            }

            // Estimate gas and compute fee using chain gas price (high) for safety
            const { queryClient } = this.getClients()
            const { gasInfo } = await queryClient.tx.simulate(
              messages,
              rango.memo,
              encodeSecp256k1Pubkey(
                base16.parse(this.walletInfo.keys.publicKey)
              ),
              this.getSequence()
            )
            if (gasInfo?.gasUsed == null)
              throw new Error(`simulate didn't return gasUsed `)
            const gasLimit = ceil(mul(gasInfo.gasUsed.toString(), '1.5'), 0)
            const { high } = getGasPriceRangesFromChain(this.tools.chainData)
            const feeDenom = this.networkInfo.nativeDenom
            const gasFee = ceil(mul(gasLimit, high.toString()), 0)
            const gasFeeCoin = coin(gasFee, feeDenom)
            const networkFee = gasFeeCoin.amount

            // Memo (for routing/debugging)
            if (rango.memo !== '') {
              memos.push({ type: 'text', value: rango.memo })
            }

            const otherParams: CosmosTxOtherParams = {
              gasFeeCoin,
              gasLimit,
              unsignedTxHex: txData
            }

            // Determine which asset we're spending for amount validation/display
            let currencyCode = this.currencyInfo.currencyCode
            const tokenId = fromTokenId ?? null
            if (fromTokenId != null) {
              const token = this.allTokensMap[fromTokenId]
              if (token != null) currencyCode = token.currencyCode
            }

            const amounts = this.makeEdgeTransactionAmounts(
              fromNativeAmount,
              networkFee,
              tokenId
            )
            this.checkBalances(amounts, tokenId)

            const edgeTransaction: EdgeTransaction = {
              blockHeight: 0,
              currencyCode,
              date: Date.now() / 1000,
              isSend: true,
              memos,
              metadata,
              nativeAmount: amounts.nativeAmount,
              networkFee: amounts.networkFee,
              parentNetworkFee: amounts.parentNetworkFee,
              networkFees: [
                {
                  tokenId: null,
                  nativeAmount: amounts.parentNetworkFee ?? amounts.networkFee
                }
              ],
              otherParams,
              ourReceiveAddresses: [],
              signedTx: '',
              tokenId,
              txid: '',
              walletId: this.walletId
            }

            return edgeTransaction
          }
          default: {
            throw new Error(`Invalid type: ${params.type}`)
          }
        }
      },
      parseWalletConnectV2Payload: async (rawPayload: CosmosWcRpcPayload) => {
        try {
          switch (rawPayload?.method) {
            case 'cosmos_getAccounts': {
              return {
                nativeAmount: '0',
                networkFee: '0',
                tokenId: null
              }
            }
            case 'cosmos_signDirect': {
              const payload = asCosmosWcSignDirectRpcPayload(rawPayload)
              const { authInfoBytes, bodyBytes } = payload.params.signDoc

              const decodedTxBody = TxBody.decode(safeParse(bodyBytes))

              const { nativeAmount, tokenId } =
                this.getAmountAndTokenIdFromKnownMessageTypes(
                  decodedTxBody.messages
                )

              const parsedAuthInfoBytes = AuthInfo.decode(
                safeParse(authInfoBytes)
              )

              let networkFee = '0'
              const fee = parsedAuthInfoBytes.fee
              if (fee != null) {
                const totalFeeCoins = safeAddCoins([
                  coin('0', this.networkInfo.nativeDenom),
                  ...fee.amount
                ])
                networkFee = totalFeeCoins.amount
              }

              return {
                nativeAmount,
                networkFee,
                tokenId
              }
            }
            case 'cosmos_signAmino': {
              const payload = asCosmosWcSignAminoRpcPayload(rawPayload)
              const { signDoc } = payload.params

              const aminoDoc = makeSignDoc(
                signDoc.msgs,
                signDoc.fee,
                signDoc.chain_id,
                signDoc.memo,
                signDoc.account_number,
                signDoc.sequence
              )

              const aminoTypes = new AminoTypes({
                ...createBankAminoConverters,
                ...createIbcAminoConverters
              })

              const messages = aminoDoc.msgs
                // ADR-036 messages are not yet included as an amino type in the sdk and don't have amounts to parse
                .filter(msg => msg.type !== 'sign/MsgSignData')
                .map(msg => aminoTypes.fromAmino(msg))

              const { nativeAmount, tokenId } =
                this.getAmountAndTokenIdFromKnownMessageTypes(messages)

              let networkFee = '0'
              const fee = signDoc.fee
              if (fee != null) {
                const totalFeeCoins = safeAddCoins([
                  coin('0', this.networkInfo.nativeDenom),
                  ...fee.amount
                ])
                networkFee = totalFeeCoins.amount
              }

              return {
                nativeAmount,
                networkFee,
                tokenId
              }
            }
            default: {
              // Gracefully handle unknown methods for estimation purposes
              return {
                nativeAmount: '0',
                networkFee: '0',
                tokenId: null
              }
            }
          }
        } catch (e: any) {
          this.warn(`Wallet connect call_request `, e)
          throw e
        }
      }
    }
  }

  tokenIdFromDenom(denom: string): EdgeTokenId {
    if (this.networkInfo.nativeDenom === denom) return null

    const tokenId = Object.keys(this.allTokensMap).find(
      tokenId =>
        this.allTokensMap[tokenId].networkLocation?.contractAddress === denom
    )
    if (tokenId === undefined) {
      throw new Error(`Unrecognized denom: ${denom}`)
    }
    return tokenId
  }

  // This parses common actions into nativeAmount and tokenId
  getAmountAndTokenIdFromKnownMessageTypes(messages: EncodeObject[]): {
    nativeAmount: string
    tokenId: EdgeTokenId
  } {
    let tokenId = null
    let totalCoinAmount: Coin | undefined
    for (const msg of messages) {
      switch (msg.typeUrl) {
        case '/ibc.applications.transfer.v1.MsgTransfer': {
          const decodedMsg = this.tools.registry.decode(msg)
          const value = MsgTransfer.fromPartial(decodedMsg)

          // We're assuming the first denom is the most relevant and we'll derive the amount and tokenId from it
          if (tokenId === undefined) {
            tokenId = this.tokenIdFromDenom(value.token.denom)
          }

          const transferCoin = coin(value.token.amount, value.token.denom)
          if (totalCoinAmount == null) {
            totalCoinAmount = transferCoin
          } else {
            totalCoinAmount = safeAddCoins([totalCoinAmount, transferCoin])
          }

          break
        }
        case '/cosmwasm.wasm.v1.MsgExecuteContract': {
          const decodedMsg = this.tools.registry.decode(msg)
          const msgExecuteContract = MsgExecuteContract.fromPartial(decodedMsg)
          const { funds } = msgExecuteContract
          if (funds.length > 0) {
            // We're assuming the first denom is the most relevant and we'll derive the amount and tokenId from it
            const { denom } = funds[0]

            if (tokenId === undefined) {
              tokenId = this.tokenIdFromDenom(denom)
            }

            let sumCoin = coin('0', denom)
            for (const fund of funds) {
              sumCoin = safeAddCoins([sumCoin, fund])
            }
            if (totalCoinAmount == null) {
              totalCoinAmount = sumCoin
            } else {
              totalCoinAmount = safeAddCoins([totalCoinAmount, sumCoin])
            }
          }

          break
        }
        default: {
          // unknown typeUrl
        }
      }
    }

    return {
      nativeAmount: totalCoinAmount?.amount ?? '0',
      tokenId
    }
  }

  setOtherData(raw: any): void {
    this.otherData = asCosmosWalletOtherData(raw)
  }

  getClients(): CosmosClients {
    if (this.tools.clients == null) {
      throw new Error('No StargateClient')
    }
    return this.tools.clients
  }

  async queryBalance(): Promise<void> {
    try {
      const { stargateClient } = this.getClients()
      const balances = await stargateClient.getAllBalances(
        this.walletInfo.keys.bech32Address
      )
      const mainnetBal = balances.find(
        bal => bal.denom === this.networkInfo.nativeDenom
      )
      this.updateBalance(null, mainnetBal?.amount ?? '0')

      const detectedTokenIds: string[] = []
      Object.keys(this.allTokensMap).forEach(tokenId => {
        const token = this.allTokensMap[tokenId]
        const tokenBal = balances.find(
          bal => bal.denom === token.networkLocation?.contractAddress
        )
        const balance = tokenBal?.amount ?? '0'
        this.updateBalance(tokenId, balance)

        if (gt(balance, '0') && !this.enabledTokenIds.includes(tokenId)) {
          detectedTokenIds.push(tokenId)
        }
      })

      if (detectedTokenIds.length > 0) {
        this.currencyEngineCallbacks.onNewTokens(detectedTokenIds)
      }

      if (this.stakingSupported) {
        try {
          const stakedBalance = await stargateClient.getBalanceStaked(
            this.walletInfo.keys.bech32Address
          )
          if (
            stakedBalance != null &&
            this.stakedBalanceCache !== stakedBalance.amount
          ) {
            const stakingStatus: EdgeStakingStatus = {
              stakedAmounts: [
                {
                  nativeAmount: stakedBalance.amount
                }
              ]
            }
            this.currencyEngineCallbacks.onStakingStatusChanged(stakingStatus)
            this.stakedBalanceCache = stakedBalance.amount
          }
        } catch (e) {
          // Staking is not supported on all chains. Failure is OK. Other errors are not OK
          if (String(e).includes('unknown query path')) {
            this.stakingSupported = false
          } else {
            throw e
          }
        }
      }

      const { accountNumber, sequence } = await stargateClient.getSequence(
        this.walletInfo.keys.bech32Address
      )
      this.accountNumber = accountNumber
      this.sequence = sequence
    } catch (e) {
      if (String(e).includes('does not exist on chain')) {
        this.updateBalance(null, '0')
      } else {
        this.log.warn('queryBalance error:', e)
      }
    }
  }

  async queryBlockheight(): Promise<void> {
    try {
      const { stargateClient } = this.getClients()
      const blockheight = await stargateClient.getHeight()
      if (blockheight > this.walletLocalData.blockHeight) {
        this.walletLocalData.blockHeight = blockheight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e: any) {
      this.error(`queryBlockheight Error `, e)
    }
  }

  async queryTransactions(): Promise<void> {
    let progress = 0
    const clientsList: CosmosClients[] = []
    if (
      this.networkInfo.archiveNodes != null &&
      Date.now() - TWO_WEEKS > this.otherData.archivedTxLastCheckTime
    ) {
      const sortedArchiveNodes = this.networkInfo.archiveNodes.sort(
        (a, b) => a.blockTimeRangeSeconds.start - b.blockTimeRangeSeconds.start
      )
      for (const node of sortedArchiveNodes) {
        if (
          node.blockTimeRangeSeconds.end == null ||
          node.blockTimeRangeSeconds.end >
            this.otherData.archivedTxLastCheckTime
        ) {
          try {
            const archiveClients = await createCosmosClients(
              this.fetchCors,
              rpcWithApiKey(node.endpoint, this.tools.initOptions)
            )
            clientsList.push(archiveClients)
          } catch (e) {
            this.log.warn('Skipping archive node due to error:', e)
            continue
          }
        }
      }
    }
    clientsList.push(this.getClients())

    for (const clients of clientsList) {
      let archivedTxLastCheckTime = 0
      for (const query of txQueryStrings) {
        const { newestTxid, lastTimestamp } = await this.queryTransactionsInner(
          query,
          clients
        )
        if (
          newestTxid != null &&
          this.otherData[query]?.newestTxid !== newestTxid
        ) {
          this.otherData[query] = { newestTxid }
          this.walletLocalDataDirty = true
          archivedTxLastCheckTime = Math.max(
            archivedTxLastCheckTime,
            lastTimestamp
          )
        }
        progress += 0.5 / clientsList.length
        for (const tokenId of [null, ...this.enabledTokenIds]) {
          this.tokenCheckTransactionsStatus.set(tokenId, progress)
        }
        this.updateOnAddressesChecked()
      }
      this.otherData.archivedTxLastCheckTime = archivedTxLastCheckTime
      this.walletLocalDataDirty = true
    }
    this.otherData.archivedTxLastCheckTime = Date.now()
    this.walletLocalDataDirty = true
    this.sendTransactionEvents()
  }

  async queryTransactionsInner(
    queryString: typeof txQueryStrings[number],
    clients: CosmosClients
  ): Promise<{ newestTxid: string | undefined; lastTimestamp: number }> {
    const txSearchParams = {
      query: `${queryString}='${this.walletInfo.keys.bech32Address}'`,
      per_page: TXS_PER_PAGE, // sdk default 50
      order_by: 'asc'
    }
    let newestTxid: string | undefined
    let lastTimestamp = 0
    let page = 1
    do {
      try {
        const { totalCount, txs } = await clients.cometClient.txSearch({
          ...txSearchParams,
          page
        })

        const newestTxidIndex = txs.findIndex(
          tx =>
            toHex(tx.hash).toUpperCase() ===
            this.otherData[queryString]?.newestTxid
        )

        for (let i = newestTxidIndex + 1; i < txs.length; i++) {
          const tx = txs[i]
          if (tx == null) break

          const txidHex = toHex(tx.hash).toUpperCase()

          const events = tx.result.events.map(fromTendermintEvent)
          let netBalanceChanges: CosmosCoin[] = []
          try {
            netBalanceChanges = reduceCoinEventsForAddress(
              events,
              this.walletInfo.keys.bech32Address
            )
          } catch (e) {
            this.log.warn('reduceCoinEventsForAddress error:', String(e))
          }
          if (netBalanceChanges.length === 0) continue

          const block = await clients.stargateClient.getBlock(tx.height)
          const date = toSeconds(
            fromRfc3339WithNanoseconds(block.header.time)
          ).seconds
          const { height, tx: txRaw } = tx
          const signedTx = base16.stringify(txRaw)
          const {
            authInfo: { fee },
            body: { memo }
          } = decodeTxRaw(txRaw)
          netBalanceChanges.forEach(coin => {
            this.processCosmosTransaction(
              txidHex,
              date,
              signedTx,
              coin,
              memo,
              height,
              fee
            )
          })

          newestTxid = txidHex
          this.otherData[queryString] = { newestTxid: txidHex }
          lastTimestamp = date * 1000
          this.walletLocalDataDirty = true
        }

        if (txs.length < TXS_PER_PAGE || totalCount === page * TXS_PER_PAGE) {
          break
        }
      } catch (e) {
        if (String(e).includes('page should be within')) {
          // Some public nodes return an empty array when there are actually transactions to return.
          // We can't determine the node is wrong if the very first request is empty,
          // but we can once we start paging. These queries should be tried again.
          continue
        }

        this.log.warn('queryTransactions error:', e)
        throw e
      }

      page++
      this.otherData[queryString] = { newestTxid }
      this.walletLocalDataDirty = true
    } while (true)

    return { newestTxid, lastTimestamp }
  }

  processCosmosTransaction(
    txidHex: string,
    date: number,
    signedTx: string,
    cosmosCoin: CosmosCoin,
    memo: string,
    height: number,
    fee?: Fee
  ): void {
    const { amount, denom } = cosmosCoin

    const isMainnet = this.networkInfo.nativeDenom === denom

    let tokenId: EdgeTokenId
    try {
      tokenId = this.tokenIdFromDenom(denom)
    } catch (e) {
      // unknown token denom, ignoring
      return
    }

    const { currencyCode } =
      tokenId == null ? this.currencyInfo : this.allTokensMap[tokenId]

    let networkFee = '0'
    if (fee != null) {
      const { amount: feeCoin } = fee
      const networkFeeCoin = safeAddCoins([
        coin('0', this.networkInfo.nativeDenom),
        ...feeCoin
      ])
      networkFee = networkFeeCoin.amount
    }

    const isSend = lt(amount, '0')
    const ourReceiveAddresses: string[] = []

    let nativeAmount = amount
    let parentNetworkFee: string | undefined
    if (isSend) {
      if (isMainnet) {
        nativeAmount = sub(nativeAmount, networkFee)
      } else {
        parentNetworkFee = networkFee !== '0' ? networkFee : undefined
        networkFee = '0'
      }
    } else {
      ourReceiveAddresses.push(this.walletInfo.keys.bech32Address)
      networkFee = '0'
    }

    const memos: EdgeMemo[] = []
    if (memo !== '') {
      memos.push({
        type: 'text',
        value: memo
      })
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: height,
      currencyCode,
      date,
      isSend,
      memos,
      nativeAmount,
      networkFee,
      networkFees: [],
      ourReceiveAddresses,
      parentNetworkFee,
      signedTx,
      tokenId,
      txid: txidHex,
      walletId: this.walletId
    }
    this.addTransaction(tokenId, edgeTransaction)
  }

  addTransaction(tokenId: EdgeTokenId, edgeTransaction: EdgeTransaction): void {
    // update unconfirmed cache
    this.removeFromUnconfirmedCache(edgeTransaction.txid)
    super.addTransaction(tokenId, edgeTransaction)
  }

  private createUnsignedTxHex(messages: EncodeObject[], memo?: string): string {
    const body = TxBody.fromPartial({ messages, memo })
    const bodyBytes = TxBody.encode(body).finish()
    const unsignedTxRaw = TxRaw.fromPartial({
      bodyBytes
    })

    return base16.stringify(TxRaw.encode(unsignedTxRaw).finish())
  }

  private addToUnconfirmedCache(txid: string): void {
    const twoMinutesFromNow = new Date(new Date().getTime() + TWO_MINUTES)
    if (this.unconfirmedTransactionCache.txids.size === 0) {
      this.unconfirmedTransactionCache.cacheSequence = this.sequence
    }
    this.unconfirmedTransactionCache.txids.set(txid, twoMinutesFromNow)
  }

  private removeFromUnconfirmedCache(txid: string): void {
    if (this.unconfirmedTransactionCache.txids.has(txid)) {
      this.unconfirmedTransactionCache.cacheSequence =
        this.unconfirmedTransactionCache.cacheSequence + 1
      this.sequence = this.unconfirmedTransactionCache.cacheSequence
      this.unconfirmedTransactionCache.txids.delete(txid)
    }
  }

  private getSequence(): number {
    if (this.unconfirmedTransactionCache.txids.size === 0) {
      return this.sequence
    } else {
      // If cache has any expired transactions, trash it and use the sequence
      if (
        [...this.unconfirmedTransactionCache.txids.values()].some(
          expiration => expiration < new Date()
        )
      ) {
        this.unconfirmedTransactionCache.txids = new Map()
        return this.sequence
      }

      // Otherwise calculate sequence from pending txids
      return (
        this.unconfirmedTransactionCache.cacheSequence +
        this.unconfirmedTransactionCache.txids.size
      )
    }
  }

  async calculateFee(opts: {
    messages: EncodeObject[]
    memo?: string
    networkFeeOption?: EdgeSpendInfo['networkFeeOption']
  }): Promise<CosmosFee> {
    const { queryClient } = this.getClients()
    const { gasInfo } = await queryClient.tx.simulate(
      opts.messages,
      opts.memo,
      encodeSecp256k1Pubkey(base16.parse(this.walletInfo.keys.publicKey)),
      this.getSequence()
    )
    if (gasInfo?.gasUsed == null) {
      throw new Error(`simulate didn't return gasUsed `)
    }
    // The simulate endpoint is imperfect and under-estimates. It's typical to use 1.5x the estimated amount
    const gasLimit = ceil(mul(gasInfo?.gasUsed.toString(), '1.5'), 0)

    const { low, average, high } = getGasPriceRangesFromChain(
      this.tools.chainData
    )

    let gasPrice = average
    switch (opts.networkFeeOption) {
      case 'low': {
        gasPrice = low
        break
      }
      case 'high': {
        gasPrice = high
        break
      }
      case 'custom': {
        throw new Error('Custom fee not supported')
      }
    }

    const gasFee = ceil(mul(gasLimit, gasPrice.toString()), 0)
    const gasFeeCoin = coin(gasFee, this.networkInfo.nativeDenom)

    return {
      gasFeeCoin,
      gasLimit,
      networkFee: gasFeeCoin.amount
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    await this.tools.connectClient()
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('queryBlockheight', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await this.tools.disconnectClient()
    await super.killEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  /**
   * Allow sending native asset to any chain
   * Allow sending ibc asset on same chain
   * Allow sending ibc asset to chain it was bridged from
   */
  async validateTransfer(
    recipientAddress: string,
    tokenId: EdgeTokenId,
    channelInfo: IbcChannel
  ): Promise<void> {
    if (tokenId == null) return

    const edgeToken = this.allTokensMap[tokenId]
    const cleanLocation = asMaybeContractLocation(edgeToken.networkLocation)
    const denom = cleanLocation?.contractAddress
    if (denom == null) {
      throw new Error('Unknown denom')
    }

    const { queryClient } = this.getClients()
    try {
      // see if it's a native asset. this will throw if it is not
      await queryClient.bank.denomMetadata(denom)
      return
    } catch (e) {
      // see if it's an ibc asset
      const ibcAsset = await queryClient.ibc.transfer.denomTrace(denom)
      const matches = ibcAsset.denomTrace?.path.match(/transfer\/channel-\d+/) // ie. "transfer/channel-2/transfer/channel-122/transfer/channel-1"
      if (matches == null) {
        return
      }

      // the first match is the most recent channel the asset was transferred through
      if (`${channelInfo.port}/${channelInfo.channel}` === matches[0]) {
        return
      }
    }

    throw new Error('Invalid transfer')
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], networkFeeOption, tokenId } = edgeSpendInfo
    const memo: string | undefined = memos[0]?.value

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { nativeAmount, publicAddress } = edgeSpendInfo.spendTargets[0]
    if (nativeAmount == null) throw new NoAmountSpecifiedError()
    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')

    // Encode a send message.
    const denom =
      tokenId != null
        ? this.allTokensMap[tokenId].networkLocation?.contractAddress
        : this.networkInfo.nativeDenom
    if (denom == null) {
      throw new Error('Unknown denom')
    }

    let msg: EncodeObject
    if (
      // check if it's an ibc transfer
      this.networkInfo.bech32AddressPrefix !== fromBech32(publicAddress).prefix
    ) {
      const channelInfo = getIbcChannelAndPort(
        this.tools.chainData.chainName,
        publicAddress
      )
      await this.validateTransfer(publicAddress, tokenId, channelInfo)

      const { channel, port } = channelInfo
      msg = this.tools.methods.ibcTransfer({
        channel,
        port,
        memo,
        amount: coin(nativeAmount, denom),
        fromAddress: this.walletInfo.keys.bech32Address,
        toAddress: publicAddress
      })
    } else {
      msg = this.tools.methods.transfer({
        amount: [coin(nativeAmount, denom)],
        fromAddress: this.walletInfo.keys.bech32Address,
        toAddress: publicAddress
      })
    }

    let gasFeeCoin: Coin
    let gasLimit: string
    let networkFee: string
    const feeCacheKey = `${publicAddress}${String(networkFeeOption)}`
    const feeCacheFees = this.feeCache.get(feeCacheKey)
    if (nativeAmount === '0') {
      gasFeeCoin = coin('0', this.networkInfo.nativeDenom)
      gasLimit = '0'
      networkFee = '0'
    } else if (feeCacheFees == null) {
      const fees = await this.calculateFee({
        messages: [msg],
        memo,
        networkFeeOption
      })
      gasFeeCoin = fees.gasFeeCoin
      gasLimit = fees.gasLimit
      networkFee = fees.networkFee
      this.feeCache.set(feeCacheKey, fees)
    } else {
      gasFeeCoin = feeCacheFees.gasFeeCoin
      gasLimit = feeCacheFees.gasLimit
      networkFee = feeCacheFees.networkFee
    }

    const unsignedTxHex = this.createUnsignedTxHex([msg], memo)

    const otherParams: CosmosTxOtherParams = {
      gasFeeCoin,
      gasLimit,
      unsignedTxHex
    }

    const amounts = this.makeEdgeTransactionAmounts(
      nativeAmount,
      networkFee,
      tokenId
    )
    this.checkBalances(amounts, tokenId)

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: amounts.nativeAmount,
      networkFee: amounts.networkFee,
      networkFees: [],
      otherParams,
      ourReceiveAddresses: [],
      parentNetworkFee: amounts.parentNetworkFee,
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signMessage(
    message: string,
    privateKeys: JsonObject,
    opts?: JsonObject
  ): Promise<string> {
    const keys = asCosmosPrivateKeys(this.currencyInfo.pluginId)(privateKeys)
    const signer = await this.tools.createSigner(keys.mnemonic)

    if (opts?.otherParams != null) {
      switch (opts.otherParams.method) {
        case 'cosmos_getAccounts': {
          asCosmosWcGetAccountsRpcPayload(opts.otherParams)
          const accounts = await signer.getAccounts()
          const result = accounts.map(account => {
            return {
              ...account,
              pubkey: base64.stringify(account.pubkey)
            }
          })
          return JSON.stringify(result)
        }
        case 'cosmos_signDirect': {
          const payload = asCosmosWcSignDirectRpcPayload(opts.otherParams)
          const { signDoc } = payload.params
          const signDirectDoc = SignDoc.fromPartial({
            accountNumber: longify(signDoc.accountNumber),
            authInfoBytes: safeParse(signDoc.authInfoBytes),
            bodyBytes: safeParse(signDoc.bodyBytes),
            chainId: signDoc.chainId
          })
          const signResponse = await signer.signDirect(
            this.walletInfo.keys.bech32Address,
            signDirectDoc
          )
          const result = {
            signature: signResponse.signature,
            signed: payload.params.signDoc
          }
          return JSON.stringify(result)
        }
        case 'cosmos_signAmino': {
          const payload = asCosmosWcSignAminoRpcPayload(opts.otherParams)
          const { signDoc } = payload.params

          const aminoDoc = makeSignDoc(
            signDoc.msgs,
            signDoc.fee,
            signDoc.chain_id,
            signDoc.memo,
            signDoc.account_number,
            signDoc.sequence
          )
          checkAndValidateADR36AminoSignDoc(aminoDoc)

          const { bech32AddressPrefix, bip39Path } = this.networkInfo
          const path = stringToPath(bip39Path)
          const aminoSigner = await Secp256k1HdWallet.fromMnemonic(
            signer.mnemonic,
            { prefix: bech32AddressPrefix, hdPaths: [path] }
          )
          const signResponse = await aminoSigner.signAmino(
            this.walletInfo.keys.bech32Address,
            aminoDoc
          )
          const result = {
            signature: signResponse.signature,
            signed: signDoc
          }
          return JSON.stringify(result)
        }
        default: {
          throw new Error(`Invalid method: ${opts.method}`)
        }
      }
    }

    const bytes = base16.parse(message)
    const signDoc = SignDoc.decode(bytes)

    const signResponse = await signer.signDirect(
      this.walletInfo.keys.bech32Address,
      signDoc
    )
    const decodedSignature = decodeSignature(signResponse.signature)
    const signedTxRaw = TxRaw.fromPartial({
      authInfoBytes: signDoc.authInfoBytes,
      bodyBytes: signDoc.bodyBytes,
      signatures: [decodedSignature.signature]
    })
    const signedTxBytes = TxRaw.encode(signedTxRaw).finish()
    const signedTxHex = base16.stringify(signedTxBytes)
    return signedTxHex
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const { gasFeeCoin, gasLimit, unsignedTxHex } = asCosmosTxOtherParams(
      edgeTransaction.otherParams
    )
    const keys = asCosmosPrivateKeys(this.currencyInfo.pluginId)(privateKeys)

    // Detect potential Rango JSON payload (DEX flow)
    const rangoData = asMaybe(asRangoProviderTxDataFromJson)(unsignedTxHex)
    if (rangoData != null) {
      // Build messages from Rango protoMsgs or msgs
      let messages: EncodeObject[] = []
      if (rangoData.protoMsgs != null && rangoData.protoMsgs.length > 0) {
        messages = rangoData.protoMsgs.map((m: any) => {
          const valueBytes = coerceToBytes(m.value)
          if (valueBytes == null)
            throw new Error('Rango txData: message value is not bytes')
          return { typeUrl: String(m.type_url), value: valueBytes }
        })
      } else if (rangoData.msgs != null && rangoData.msgs.length > 0) {
        const aminoTypes = new AminoTypes({
          ...createBankAminoConverters(),
          ...createIbcAminoConverters()
        })
        messages = rangoData.msgs.map((aminoMsg: any) =>
          aminoTypes.fromAmino(aminoMsg)
        )
      } else {
        throw new Error('Rango txData has no messages')
      }

      const body = TxBody.fromPartial({
        messages: messages as any,
        memo: rangoData.memo
      })
      const bodyBytesDirect = TxBody.encode(body).finish()

      const senderPubkeyBytes = base16.parse(this.walletInfo.keys.publicKey)
      const senderPubkey = encodeSecp256k1Pubkey(senderPubkeyBytes)
      const authInfoBytesDirect = makeAuthInfoBytes(
        [{ pubkey: encodePubkey(senderPubkey), sequence: this.getSequence() }],
        [gasFeeCoin],
        parseInt(gasLimit),
        undefined,
        undefined,
        1
      )

      const signDoc = SignDoc.fromPartial({
        accountNumber: longify(this.accountNumber),
        authInfoBytes: authInfoBytesDirect,
        bodyBytes: bodyBytesDirect,
        chainId: this.chainId
      })
      const signer = await this.tools.createSigner(keys.mnemonic)
      const signResponse = await signer.signDirect(
        this.walletInfo.keys.bech32Address,
        signDoc
      )
      const decodedSignature = decodeSignature(signResponse.signature)
      const signedTxRaw = TxRaw.fromPartial({
        authInfoBytes: signDoc.authInfoBytes,
        bodyBytes: signDoc.bodyBytes,
        signatures: [decodedSignature.signature]
      })
      const signedTxBytes = TxRaw.encode(signedTxRaw).finish()
      const signedTxHex = base16.stringify(signedTxBytes)
      edgeTransaction.signedTx = signedTxHex
      return edgeTransaction
    } else {
      // Hex-encoded unsigned transaction path (non-DEX flows)
      const txRawBytes = base16.parse(unsignedTxHex)
      const decoded = TxRaw.decode(txRawBytes)
      const bodyBytes = decoded.bodyBytes

      const senderPubkeyBytes = base16.parse(this.walletInfo.keys.publicKey)
      const senderPubkey = encodeSecp256k1Pubkey(senderPubkeyBytes)
      const authInfoBytes = makeAuthInfoBytes(
        [{ pubkey: encodePubkey(senderPubkey), sequence: this.getSequence() }],
        [gasFeeCoin],
        parseInt(gasLimit),
        undefined,
        undefined,
        1
      )

      const signDoc = SignDoc.fromPartial({
        accountNumber: longify(this.accountNumber),
        authInfoBytes,
        bodyBytes,
        chainId: this.chainId
      })
      const signer = await this.tools.createSigner(keys.mnemonic)
      const signResponse = await signer.signDirect(
        this.walletInfo.keys.bech32Address,
        signDoc
      )
      const decodedSignature = decodeSignature(signResponse.signature)
      const signedTxRaw = TxRaw.fromPartial({
        authInfoBytes,
        bodyBytes,
        signatures: [decodedSignature.signature]
      })
      const signedTxBytes = TxRaw.encode(signedTxRaw).finish()
      const signedTxHex = base16.stringify(signedTxBytes)
      edgeTransaction.signedTx = signedTxHex
      return edgeTransaction
    }
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    try {
      const signedTxBytes = base16.parse(edgeTransaction.signedTx)
      const { stargateClient } = this.getClients()
      const txid = await stargateClient.broadcastTxSync(signedTxBytes)
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)

      edgeTransaction.txid = txid
      edgeTransaction.date = Date.now() / 1000

      // add to unconfirmed cache
      this.addToUnconfirmedCache(txid)

      return edgeTransaction
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }
  }

  async getFreshAddress(_options: any): Promise<EdgeFreshAddress> {
    const { bech32Address } = this.walletInfo.keys

    return {
      publicAddress: bech32Address
    }
  }
}
