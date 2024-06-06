import { getGasPriceStep } from '@chain-registry/utils'
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
  AuthInfo,
  Fee,
  SignDoc,
  TxBody,
  TxRaw
} from 'cosmjs-types/cosmos/tx/v1beta1/tx'
import { MsgExecuteContract } from 'cosmjs-types/cosmwasm/wasm/v1/tx'
import { MsgTransfer } from 'cosmjs-types/ibc/applications/transfer/v1/tx'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeMemo,
  EdgeSpendInfo,
  EdgeStakingStatus,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16, base64 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { asMaybeContractLocation } from '../common/tokenHelpers'
import { EdgeTokenId, MakeTxParams } from '../common/types'
import { cleanTxLogs } from '../common/utils'
import { CosmosTools } from './CosmosTools'
import {
  asCosmosPrivateKeys,
  asCosmosTxOtherParams,
  asCosmosWalletOtherData,
  asCosmosWcGetAccountsRpcPayload,
  asCosmosWcSignAminoRpcPayload,
  asCosmosWcSignDirectRpcPayload,
  asSafeCosmosWalletInfo,
  asThornodeNetwork,
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
} from './cosmosTypes'
import {
  checkAndValidateADR36AminoSignDoc,
  createCosmosClients,
  getIbcChannelAndPort,
  reduceCoinEventsForAddress,
  rpcWithApiKey,
  safeAddCoins,
  safeParse
} from './cosmosUtils'

const ACCOUNT_POLL_MILLISECONDS = 5000
const TRANSACTION_POLL_MILLISECONDS = 3000
const TWO_WEEKS = 1000 * 60 * 60 * 24 * 14
const TWO_MINUTES = 1000 * 60 * 2
const TXS_PER_PAGE = 50

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

            const msg = this.tools.methods.deposit({
              assets,
              memo,
              signer: this.walletInfo.keys.bech32Address
            })
            const unsignedTxHex = this.createUnsignedTxHex([msg], memo)

            const { gasFeeCoin, gasLimit, networkFee } =
              await this.calculateFee({
                messages: [msg],
                memo
              })
            const otherParams: CosmosTxOtherParams = {
              gasFeeCoin,
              gasLimit,
              unsignedTxHex
            }

            const out: EdgeTransaction = {
              blockHeight: 0, // blockHeight,
              currencyCode: this.currencyInfo.currencyCode,
              date: Date.now() / 1000,
              isSend: true,
              memos: [],
              metadata,
              nativeAmount: `-${networkFee}`,
              networkFee,
              otherParams,
              ourReceiveAddresses: [],
              signedTx: '',
              tokenId: null,
              txid: '',
              walletId: this.walletId
            }
            return out
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
              throw new Error(`Invalid method: ${rawPayload?.method}`)
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
      this.updateBalance(
        this.currencyInfo.currencyCode,
        mainnetBal?.amount ?? '0'
      )

      const detectedTokenIds: string[] = []
      Object.keys(this.allTokensMap).forEach(tokenId => {
        const token = this.allTokensMap[tokenId]
        const tokenBal = balances.find(
          bal => bal.denom === token.networkLocation?.contractAddress
        )
        const balance = tokenBal?.amount ?? '0'
        this.updateBalance(token.currencyCode, balance)

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
        this.updateBalance(this.currencyInfo.currencyCode, '0')
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
    const allCurrencyCodes = [
      this.currencyInfo.currencyCode,
      ...this.enabledTokenIds.map(
        tokenId => this.allTokensMap[tokenId].currencyCode
      )
    ]

    for (const query of txQueryStrings) {
      let startingPage = 1
      let clients = this.getClients()

      if (
        this.networkInfo.archiveNode != null &&
        Date.now() - TWO_WEEKS > this.otherData.archivedTxLastCheckTime
      ) {
        startingPage = this.otherData[query].lastPage
        clients = await createCosmosClients(
          this.fetchCors,
          rpcWithApiKey(this.networkInfo.archiveNode, this.tools.initOptions)
        )
      }

      const { newestTxid, lastPage } = await this.queryTransactionsInner(
        query,
        clients,
        startingPage
      )
      if (
        (newestTxid != null &&
          this.otherData[query]?.newestTxid !== newestTxid) ||
        lastPage !== this.otherData[query]?.lastPage
      ) {
        this.otherData[query] = { newestTxid, lastPage }
        this.walletLocalDataDirty = true
      }
      progress += 0.5
      allCurrencyCodes.forEach(
        code => (this.tokenCheckTransactionsStatus[code] = progress)
      )
      this.updateOnAddressesChecked()
    }
    this.otherData.archivedTxLastCheckTime = Date.now()

    if (this.transactionsChangedArray.length > 0) {
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  async queryTransactionsInner(
    queryString: typeof txQueryStrings[number],
    clients: CosmosClients,
    startingPage: number
  ): Promise<{ newestTxid: string | undefined; lastPage: number }> {
    const txSearchParams = {
      query: `${queryString}='${this.walletInfo.keys.bech32Address}'`,
      per_page: TXS_PER_PAGE, // sdk default 50
      order_by: 'asc'
    }
    let newestTxid: string | undefined
    let page = startingPage
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

          // update unconfirmed cache
          this.removeFromUnconfirmedCache(txidHex)

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
            body: { memo, messages }
          } = decodeTxRaw(txRaw)
          const dynamicNetworkFee = await this.totalDynamicNetworkFee(
            messages,
            block.header.height
          )
          netBalanceChanges.forEach(coin => {
            this.processCosmosTransaction(
              txidHex,
              date,
              signedTx,
              coin,
              memo,
              height,
              dynamicNetworkFee,
              fee
            )
          })

          newestTxid = txidHex
          this.otherData[queryString] = { newestTxid: txidHex, lastPage: page }
          this.walletLocalDataDirty = true
        }

        if (txs.length < TXS_PER_PAGE || totalCount === page * TXS_PER_PAGE) {
          break
        }
      } catch (e) {
        this.log.warn('queryTransactions error:', e)
        throw e
      }

      page++
      this.otherData[queryString] = { newestTxid, lastPage: page }
      this.walletLocalDataDirty = true
    } while (true)

    return { newestTxid, lastPage: page }
  }

  processCosmosTransaction(
    txidHex: string,
    date: number,
    signedTx: string,
    cosmosCoin: CosmosCoin,
    memo: string,
    height: number,
    dynamicNetworkFee: string,
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
      networkFee = add(networkFee, networkFeeCoin.amount)
    }

    const isSend = lt(amount, '0')
    const ourReceiveAddresses: string[] = []

    let nativeAmount = amount
    let parentNetworkFee: string | undefined
    if (isSend) {
      if (isMainnet) {
        networkFee = add(networkFee, dynamicNetworkFee)
        nativeAmount = sub(nativeAmount, networkFee)
      } else {
        networkFee = '0'
        parentNetworkFee =
          dynamicNetworkFee !== '0' ? dynamicNetworkFee : undefined
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
      ourReceiveAddresses,
      parentNetworkFee,
      signedTx,
      tokenId,
      txid: txidHex,
      walletId: this.walletId
    }
    this.addTransaction(currencyCode, edgeTransaction)
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

  private async totalDynamicNetworkFee(
    messages: EncodeObject[],
    blockheight?: number
  ): Promise<string> {
    let networkFee = '0'
    if (this.networkInfo.defaultTransactionFeeUrl == null) {
      return networkFee
    }

    const { url, headers } = rpcWithApiKey(
      this.networkInfo.defaultTransactionFeeUrl,
      this.tools.initOptions
    )
    const heightQueryParam = blockheight == null ? '' : `?height=${blockheight}`
    const res = await this.fetchCors(`${url}${heightQueryParam}`, {
      method: 'GET',
      headers
    })
    const raw = await res.json()
    const clean = asThornodeNetwork(raw)
    for (const msg of messages) {
      switch (msg.typeUrl) {
        case '/types.MsgDeposit':
          networkFee = add(networkFee, clean.native_outbound_fee_rune)
          break
        case '/types.MsgSend':
          networkFee = add(networkFee, clean.native_tx_fee_rune)
      }
    }
    return networkFee
  }

  private async calculateFee(opts: {
    messages: EncodeObject[]
    memo?: string
    networkFeeOption?: EdgeSpendInfo['networkFeeOption']
  }): Promise<CosmosFee> {
    const { messages, memo, networkFeeOption } = opts
    let gasFeeCoin = coin('0', this.networkInfo.nativeDenom)
    let gasLimit = '0'
    let networkFee = '0'
    if (this.networkInfo.defaultTransactionFeeUrl == null) {
      const { queryClient } = this.getClients()
      const { gasInfo } = await queryClient.tx.simulate(
        messages,
        memo,
        encodeSecp256k1Pubkey(base16.parse(this.walletInfo.keys.publicKey)),
        this.getSequence()
      )
      if (gasInfo?.gasUsed == null) {
        throw new Error(`simulate didn't return gasUsed `)
      }
      // The simulate endpoint is imperfect and under-estimates. It's typical to use 1.5x the estimated amount
      gasLimit = ceil(mul(gasInfo?.gasUsed.toString(), '1.5'), 0)

      const { low, average, high } = getGasPriceStep(this.tools.chainData)

      let gasPrice = average
      switch (networkFeeOption) {
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
      gasFeeCoin = coin(gasFee, this.networkInfo.nativeDenom)
      networkFee = gasFeeCoin.amount
    } else {
      // Only Thorchain uses defaultTransactionFeeUrl
      networkFee = await this.totalDynamicNetworkFee(messages)

      // For Thorchain, the exact fee isn't known until the transaction is confirmed.
      // This would most commonly be an issue for max spends but we should overestimate
      // the fee for all spends.
      networkFee = mul(networkFee, '1.01')
    }

    return {
      gasFeeCoin,
      gasLimit,
      networkFee
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    await this.tools.connectClient()
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop('queryBlockheight', ACCOUNT_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS).catch(
      () => {}
    )
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
        this.tools.chainData.chain_name,
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
    const txRawBytes = base16.parse(unsignedTxHex)
    const { bodyBytes } = TxRaw.decode(txRawBytes)

    const senderPubkeyBytes = base16.parse(this.walletInfo.keys.publicKey)
    const senderPubkey = encodeSecp256k1Pubkey(senderPubkeyBytes)
    const authInfoBytes = makeAuthInfoBytes(
      [{ pubkey: encodePubkey(senderPubkey), sequence: this.getSequence() }],
      [gasFeeCoin], // fee, but for thorchain the fee doesn't need to be defined and is automatically pulled from account
      parseInt(gasLimit), // gasLimit
      undefined, // feeGranter
      undefined, // feePayer (defaults to first signer)
      1 // signMode
    )

    const signDoc = SignDoc.fromPartial({
      accountNumber: longify(this.accountNumber),
      authInfoBytes,
      bodyBytes,
      chainId: this.tools.chainData.chain_id
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

export async function makeCurrencyEngine(
  env: PluginEnvironment<CosmosNetworkInfo>,
  tools: CosmosTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeCosmosWalletInfo(walletInfo)
  const engine = new CosmosEngine(env, tools, safeWalletInfo, opts)

  await engine.loadEngine()

  return engine
}
