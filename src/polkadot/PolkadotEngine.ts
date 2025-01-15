import '@polkadot/api-augment/polkadot'

import { ApiPromise, Keyring } from '@polkadot/api'
import { Option } from '@polkadot/types/codec'
import { PalletAssetsAssetAccount } from '@polkadot/types/lookup'
import { abs, add, div, gt, lte, mul, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeTokenId,
  EdgeTokenMap,
  EdgeTransaction,
  EdgeTxAmount,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { asMaybeContractLocation } from '../common/tokenHelpers'
import {
  cleanTxLogs,
  decimalToHex,
  getDenomination,
  getFetchCors,
  getOtherParams,
  makeMutex
} from '../common/utils'
import { PolkadotTools } from './PolkadotTools'
import {
  asLiberlandMeritsResponse,
  asLiberlandTransfersResponse,
  asPolkadotWalletOtherData,
  asPolkapolkadotPrivateKeys,
  asSafePolkadotWalletInfo,
  asSubscanResponse,
  asTransactions,
  asTransfer,
  LiberlandTransfer,
  PolkadotNetworkInfo,
  PolkadotWalletOtherData,
  SafePolkadotWalletInfo,
  SubscanResponse,
  SubscanTx
} from './polkadotTypes'

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

const queryTxMutex = makeMutex()

export class PolkadotEngine extends CurrencyEngine<
  PolkadotTools,
  SafePolkadotWalletInfo
> {
  fetchCors: EdgeFetchFunction
  networkInfo: PolkadotNetworkInfo
  otherData!: PolkadotWalletOtherData
  api!: ApiPromise
  keypair!: Keyring
  nonce: number

  constructor(
    env: PluginEnvironment<PolkadotNetworkInfo>,
    tools: PolkadotTools,
    walletInfo: SafePolkadotWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.fetchCors = getFetchCors(env.io)
    this.networkInfo = env.networkInfo
    this.nonce = 0
  }

  setOtherData(raw: any): void {
    this.otherData = asPolkadotWalletOtherData(raw)
  }

  getRecipientBalance = async (recipient: string): Promise<string> => {
    try {
      const account = await this.api.query.system.account(recipient)
      return account.data.free.toString()
    } catch (e: any) {
      // API returns valid response for empty accounts. For other errors just assume the recipient's account is sufficient.
      return this.minimumAddressBalance
    }
  }

  async fetchLiberlandScan(
    endpoint: string,
    operationName: string,
    query: string,
    variables: JsonObject
  ): Promise<any> {
    const body = {
      operationName,
      variables,
      query
    }

    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }

    const response = await this.fetchCors(endpoint, options)
    if (!response.ok) {
      throw new Error(`Liberland API failed with status ${response.status}`)
    }
    const out = await response.json()
    return out
  }

  async fetchSubscan(
    endpoint: string,
    body: JsonObject
  ): Promise<SubscanResponse> {
    if (this.networkInfo.subscanBaseUrl == null) {
      throw new Error('Missing subscan url')
    }
    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
    const response = await this.fetchCors(
      this.networkInfo.subscanBaseUrl + endpoint,
      options
    )
    if (!response.ok || response.status === 429) {
      throw new Error(`Subscan ${endpoint} failed with ${response.status}`)
    }
    const out = await response.json()
    return asSubscanResponse(out)
  }

  async queryBalance(): Promise<void> {
    const accountBalanceRes = await this.api.query.system.account(
      this.walletInfo.keys.publicKey
    )
    this.nonce = accountBalanceRes.nonce.toNumber()
    this.updateBalance(
      this.currencyInfo.currencyCode,
      accountBalanceRes.data.free.toString()
    )

    for (const tokenId of this.enabledTokenIds) {
      const token = this.allTokensMap[tokenId]
      if (token == null) continue
      const networkLocation = asMaybeContractLocation(token.networkLocation)
      if (networkLocation == null) continue

      const tokenBalanceRes = await this.api.query.assets.account<
        Option<PalletAssetsAssetAccount>
      >(networkLocation.contractAddress, this.walletInfo.keys.publicKey)

      let tokenBalance = '0'
      if (tokenBalanceRes.isSome) {
        tokenBalance = tokenBalanceRes.unwrap().balance.toString()
      }
      this.updateBalance(token.currencyCode, tokenBalance)
    }
  }

  async queryBlockheight(): Promise<void> {
    try {
      const response = await this.api.rpc.chain.getBlock()
      const height = response.block.header.number.toNumber()
      if (height > this.walletLocalData.blockHeight) {
        this.walletLocalData.blockHeight = height
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e: any) {
      this.warn('queryBlockheight failed with error: ', e)
    }
  }

  processPolkadotTransaction(tx: SubscanTx): void {
    const {
      from,
      to,
      success,
      hash,
      block_num: blockHeight,
      block_timestamp: date,
      module,
      amount: transferAmount, // large denomination
      fee // small denomination
    } = tx

    // Skip irrelevant transactions
    if (module !== 'balances') return

    // Fix amount for unsuccessful transactions
    const amount = success ? transferAmount : '0'

    const denom = getDenomination(
      this.currencyInfo.currencyCode,
      this.currencyInfo,
      this.allTokensMap
    )
    if (denom == null) return

    const ourReceiveAddresses = []

    let nativeAmount = mul(amount, denom.multiplier)
    if (from === this.walletInfo.keys.publicKey) {
      nativeAmount = `-${add(nativeAmount, fee)}`
    } else {
      ourReceiveAddresses.push(to)
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight,
      currencyCode: this.currencyInfo.currencyCode,
      date,
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      nativeAmount,
      networkFee: fee,
      networkFees: [],
      ourReceiveAddresses,
      signedTx: '',
      tokenId: null,
      txid: hash,
      walletId: this.walletId
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  async queryLiberlandTransactions(): Promise<void> {
    let hasNextPage = true
    let endCursor = null
    let processedCount = 0

    const endpoint = this.networkInfo.liberlandScanUrl
    if (endpoint == null) {
      this.warn('`liberlandBaseUrl` not defined')
      return
    }

    const userId = this.walletInfo.keys.publicKey

    // LLD Transfers
    while (hasNextPage) {
      const transfersOperationName = 'Transfers'
      const transfersQuery = `query Transfers($userId: String, $cursor: Cursor) {
        transfers(
          filter: {
            or: [
              { fromId: { equalTo: $userId } },
              { toId: { equalTo: $userId } }
            ]
          },
          after: $cursor,
          first: 50,
          orderBy: BLOCK_NUMBER_DESC
        ) {
          nodes {
            id
            fromId
            toId
            value
            eventIndex
            block {
              number
              timestamp
              extrinsics {
                nodes {
                  hash
                  id
                  blockId
                  signerId
                  events {
                    nodes {
                      id
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }`

      try {
        const transfersResponse = await this.fetchLiberlandScan(
          endpoint,
          transfersOperationName,
          transfersQuery,
          {
            userId,
            cursor: endCursor
          }
        )
        const cleanTransfersResponse =
          asLiberlandTransfersResponse(transfersResponse)

        const transfers = cleanTransfersResponse.data.transfers.nodes
        hasNextPage = cleanTransfersResponse.data.transfers.pageInfo.hasNextPage
        endCursor = cleanTransfersResponse.data.transfers.pageInfo.endCursor

        for (const tx of transfers) {
          const edgeTransaction = processLiberlandTransaction(
            {
              walletId: this.walletId,
              walletInfo: this.walletInfo,
              currencyInfo: this.currencyInfo,
              allTokensMap: this.allTokensMap,
              tokenId: null
            },
            tx
          )
          if (edgeTransaction != null) {
            if (
              this.otherData.newestTxid[this.currencyInfo.currencyCode] ===
              edgeTransaction.txid
            ) {
              hasNextPage = false
              break
            }

            this.otherData.newestTxid[this.currencyInfo.currencyCode] =
              edgeTransaction.txid
            this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
          }
        }

        // Update progress
        const totalCount = cleanTransfersResponse.data.transfers.totalCount
        processedCount += transfers.length

        this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
          totalCount === 0 ? 1 : processedCount / totalCount
        this.updateOnAddressesChecked()
      } catch (e: any) {
        this.warn(`Error fetching Liberland transactions: ${e.message}`)
        throw e
      }
    }

    this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] = 1
    this.updateOnAddressesChecked()

    // LLM Transfers. Endpoint only handles specifically the LLM token
    hasNextPage = true
    endCursor = null
    const tokenId = '1'
    const currencyCode = this.allTokensMap[tokenId].currencyCode

    while (hasNextPage) {
      const meritsOperationName = 'Merits'
      const meritsQuery = `query Merits($userId: String, $cursor: Cursor) {  
        merits(
        filter: {or: [{fromId: {equalTo: $userId}}, {toId: {equalTo: $userId}}]}
        after: $cursor
        first: 50
        orderBy: BLOCK_NUMBER_DESC
        ) {
          nodes {
            id
            fromId
            toId
            value
            eventIndex
            blockId
            block {
              number
              timestamp
              extrinsics {
                nodes {
                  hash
                  id
                  blockId
                  signerId
                  events {
                    nodes {
                      id
                    }
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
          totalCount
        }
      }`

      try {
        const meritsResponses = await this.fetchLiberlandScan(
          endpoint,
          meritsOperationName,
          meritsQuery,
          {
            userId,
            cursor: endCursor
          }
        )
        const cleanMeritsResponse = asLiberlandMeritsResponse(meritsResponses)

        const totalCount = cleanMeritsResponse.data.merits.totalCount
        const meritTransfers = cleanMeritsResponse.data.merits.nodes
        hasNextPage = cleanMeritsResponse.data.merits.pageInfo.hasNextPage
        endCursor = cleanMeritsResponse.data.merits.pageInfo.endCursor

        for (const tx of meritTransfers) {
          const edgeTransaction = processLiberlandTransaction(
            {
              walletId: this.walletId,
              walletInfo: this.walletInfo,
              currencyInfo: this.currencyInfo,
              allTokensMap: this.allTokensMap,
              tokenId
            },
            tx
          )
          if (edgeTransaction != null) {
            if (
              this.otherData.newestTxid[currencyCode] === edgeTransaction.txid
            ) {
              hasNextPage = false
              break
            }

            this.otherData.newestTxid[currencyCode] = edgeTransaction.txid
            this.addTransaction(currencyCode, edgeTransaction)
          }
        }

        // Update progress
        processedCount += meritTransfers.length

        this.tokenCheckTransactionsStatus[currencyCode] =
          totalCount === 0 ? 1 : processedCount / totalCount
        this.updateOnAddressesChecked()
      } catch (e: any) {
        this.warn(`Error fetching Liberland transactions: ${e.message}`)
        throw e
      }
    }

    this.tokenCheckTransactionsStatus[currencyCode] = 1
    this.updateOnAddressesChecked()

    if (this.transactionEvents.length > 0) {
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onTransactions(this.transactionEvents)
      this.transactionEvents = []
    }
  }

  async queryTransactions(): Promise<void> {
    /*
    HACK: We cannot query transactions if a currency doesn't have a subscanBaseUrl
    */
    if (this.networkInfo.subscanBaseUrl == null) {
      for (const currencyCode of this.enabledTokens) {
        this.tokenCheckTransactionsStatus[currencyCode] = 1
      }
      this.updateOnAddressesChecked()
      return
    }
    return await queryTxMutex(async () => await this.queryTransactionsInner())
  }

  async queryTransactionsInner(): Promise<void> {
    // Skip pages we don't need
    let page = Math.floor(
      this.otherData.txCount / this.networkInfo.subscanQueryLimit
    )

    while (true) {
      const payload = {
        row: this.networkInfo.subscanQueryLimit,
        page,
        address: this.walletInfo.keys.publicKey
      }

      let count = 0
      let transfers = []
      try {
        const response = await this.fetchSubscan('/v2/scan/transfers', payload)
        const cleanResponse = asTransactions(response.data)
        count = cleanResponse.count
        transfers = cleanResponse.transfers
      } catch (e: any) {
        if (
          e instanceof Error &&
          e.message.includes('Subscan /scan/transfers failed with 429')
        ) {
          this.log(e.message)
          continue
        } else {
          throw e
        }
      }

      // count is the total number of transactions ever for an account
      // If we've already seen all the transfers we don't need to bother processing or page through older ones
      if (count === this.otherData.txCount) break

      // Process txs (newest first)
      transfers.forEach(tx => {
        try {
          this.processPolkadotTransaction(asTransfer(tx))
        } catch (e: any) {
          const hash = tx != null && typeof tx.hash === 'string' ? tx.hash : ''
          this.warn(`Ignoring invalid transfer ${hash}`)
        }
      })

      // If we haven't reached the end, Update local txCount and progress and then query the next page
      this.otherData.txCount =
        page * this.networkInfo.subscanQueryLimit + transfers.length

      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        Math.min(1, count === 0 ? 1 : this.otherData.txCount / count)
      this.updateOnAddressesChecked()

      if (count === this.otherData.txCount) break

      page++
    }

    this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] = 1
    this.updateOnAddressesChecked()

    if (this.transactionEvents.length > 0) {
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onTransactions(this.transactionEvents)
      this.transactionEvents = []
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    await this.tools.connectApi(this.walletId)
    this.api = this.tools.polkadotApi
    this.minimumAddressBalance =
      this.api.consts.balances.existentialDeposit.toString()
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS).catch(() => {})
    if (this.networkInfo.liberlandScanUrl != null) {
      this.addToLoop(
        'queryLiberlandTransactions',
        TRANSACTION_POLL_MILLISECONDS
      ).catch(() => {})
    }
    if (this.networkInfo.subscanBaseUrl != null)
      this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS).catch(
        () => {}
      )
    await super.startEngine()
  }

  async killEngine(): Promise<void> {
    await super.killEngine()
    await this.tools.disconnectApi(this.walletId)
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    if (
      spendInfo.spendTargets.length === 0 ||
      spendInfo.spendTargets[0].publicAddress == null
    )
      throw new Error('Missing public address')

    const { tokenId } = spendInfo

    const balance = this.getBalance({
      tokenId
    })

    if (tokenId != null) {
      const tempSpendTarget = [
        {
          publicAddress: spendInfo.spendTargets[0].publicAddress,
          nativeAmount: balance
        }
      ]
      const maxSpendInfo = { ...spendInfo, spendTargets: tempSpendTarget }
      await this.makeSpend(maxSpendInfo)
      return balance
    }

    const spendableBalance = sub(
      balance,
      this.api.consts.balances.existentialDeposit.toString()
    )

    const tempSpendTarget = [
      {
        publicAddress: spendInfo.spendTargets[0].publicAddress,
        nativeAmount: '0'
      }
    ]
    const maxSpendInfo = { ...spendInfo, spendTargets: tempSpendTarget }
    const tx = await this.makeSpend(maxSpendInfo)
    const fee = tx.networkFee

    const getMax = (min: string, max: string): string => {
      const diff = sub(max, min)
      if (lte(diff, '1')) {
        return min
      }
      const mid = add(min, div(diff, '2'))

      // Get length fee for mid amount
      const hex = decimalToHex(mid).replace('0x', '')
      const paddedHex = hex.length % 2 === 1 ? `0${hex}` : hex
      const lengthFee = mul(
        div(paddedHex.length.toString(), '2'),
        this.networkInfo.lengthFeePerByte
      )

      const totalAmount = add(add(lengthFee, fee), mid)

      if (gt(totalAmount, spendableBalance)) {
        return getMax(min, mid)
      } else {
        return getMax(mid, max)
      }
    }

    return getMax('0', add(spendableBalance, '1'))
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { nativeAmount, publicAddress } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    const balance = this.getBalance({
      tokenId
    })

    let totalTxAmount
    let nativeNetworkFee
    let parentNetworkFee
    const networkFees: EdgeTxAmount[] = []

    if (edgeSpendInfo.tokenId == null) {
      const spendableBalance = sub(
        balance,
        this.api.consts.balances.existentialDeposit.toString()
      )

      if (gt(nativeAmount, spendableBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }

      const transfer = await this.api.tx.balances.transferKeepAlive(
        publicAddress,
        nativeAmount
      )

      const paymentInfo = await transfer.paymentInfo(
        this.walletInfo.keys.publicKey
      )

      // The fee returned from partial fee is always off by some length fee, because reasons
      nativeNetworkFee = sub(
        paymentInfo.partialFee.toString(),
        mul(
          this.networkInfo.lengthFeePerByte,
          this.networkInfo.partialFeeOffsetMultiplier
        )
      )
      networkFees.push({
        nativeAmount: nativeNetworkFee,
        tokenId: null
      })

      totalTxAmount = add(nativeAmount, nativeNetworkFee)

      if (gt(totalTxAmount, spendableBalance)) {
        throw new InsufficientFundsError({ tokenId })
      }
    } else {
      if (gt(nativeAmount, balance)) {
        throw new InsufficientFundsError({ tokenId })
      }
      totalTxAmount = nativeAmount
      const transfer = await this.api.tx.assets.transfer(
        parseInt(edgeSpendInfo.tokenId),
        publicAddress,
        nativeAmount
      )

      const paymentInfo = await transfer.paymentInfo(
        this.walletInfo.keys.publicKey
      )

      // The fee returned from partial fee is always off by some length fee, because reasons
      parentNetworkFee = sub(
        paymentInfo.partialFee.toString(),
        mul(
          this.networkInfo.lengthFeePerByte,
          this.networkInfo.partialFeeOffsetMultiplier
        )
      )
      nativeNetworkFee = '0'
      networkFees.push({
        nativeAmount: parentNetworkFee,
        tokenId: null
      })

      const feeBalance = this.getBalance({
        tokenId: null
      })
      const spendableFeeBalance = sub(
        feeBalance,
        this.api.consts.balances.existentialDeposit.toString()
      )
      if (gt(parentNetworkFee, spendableFeeBalance)) {
        throw new InsufficientFundsError({
          networkFee: parentNetworkFee,
          tokenId: null
        })
      }
    }

    const otherParams: JsonObject = {
      publicAddress
    }

    // **********************************
    // Create the unsigned EdgeTransaction
    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode,
      date: 0,
      isSend: true,
      memos,
      nativeAmount: mul(totalTxAmount, '-1'),
      networkFee: nativeNetworkFee,
      networkFees,
      parentNetworkFee,
      otherParams,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId,
      txid: '',
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const polkadotPrivateKeys = asPolkapolkadotPrivateKeys(
      this.currencyInfo.pluginId
    )(privateKeys)
    const { publicAddress } = getOtherParams(edgeTransaction)
    if (publicAddress == null)
      throw new Error('Missing publicAddress from makeSpend')

    const edgeToken = this.allTokens.find(
      token => token.currencyCode === edgeTransaction.currencyCode
    )

    let transfer
    if (edgeToken == null) {
      const nativeAmount = abs(
        add(edgeTransaction.nativeAmount, edgeTransaction.networkFee)
      )
      await this.checkRecipientMinimumBalance(
        this.getRecipientBalance,
        nativeAmount,
        publicAddress
      )
      transfer = await this.api.tx.balances.transferKeepAlive(
        publicAddress,
        nativeAmount
      )
    } else if (edgeToken.contractAddress != null) {
      const nativeAmount = abs(edgeTransaction.nativeAmount)
      transfer = await this.api.tx.assets.transfer(
        parseInt(edgeToken.contractAddress),
        publicAddress,
        nativeAmount
      )
    } else {
      throw new Error('Unrecognized asset')
    }

    const signer = this.api.createType('SignerPayload', {
      method: transfer,
      nonce: this.nonce,
      genesisHash: this.api.genesisHash,
      blockHash: this.api.genesisHash,
      runtimeVersion: this.api.runtimeVersion,
      version: this.api.extrinsicVersion
    })

    const extrinsicPayload = this.api.createType(
      'ExtrinsicPayload',
      signer.toPayload(),
      { version: this.api.extrinsicVersion }
    )

    if (this.keypair == null) {
      this.keypair = new Keyring({ ss58Format: this.networkInfo.ss58Format })
      if (polkadotPrivateKeys.mnemonic != null) {
        this.keypair.addFromUri(polkadotPrivateKeys.mnemonic)
      } else {
        const uint8Array = base16.parse(polkadotPrivateKeys.privateKey)
        this.keypair.addFromSeed(uint8Array)
      }
    }

    const signedPayload = extrinsicPayload.sign(
      this.keypair.getPair(this.walletInfo.keys.publicKey)
    )

    transfer.addSignature(
      this.walletInfo.keys.publicKey,
      signedPayload.signature,
      signer.toPayload()
    )

    edgeTransaction.signedTx = transfer.toHex()
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    try {
      const txid = await this.api.rpc.author.submitExtrinsic(
        edgeTransaction.signedTx
      )

      edgeTransaction.txid = txid.toHex()
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }

    return edgeTransaction
  }

  // This ensures that local wallets originally created with incorrect ss58 encoding can still get the correct address
  async getFreshAddress(): Promise<EdgeFreshAddress> {
    const keyring = new Keyring()
    const { publicKey } = this.walletInfo.keys
    const decodedAddress = keyring.decodeAddress(publicKey)
    const encodedAddress = keyring.encodeAddress(
      decodedAddress,
      this.networkInfo.ss58Format
    )
    return {
      publicAddress: encodedAddress
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<PolkadotNetworkInfo>,
  tools: PolkadotTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafePolkadotWalletInfo(walletInfo)
  const engine = new PolkadotEngine(env, tools, safeWalletInfo, opts)

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}

export interface LiberlandTxProcessingContext {
  walletId: string
  walletInfo: SafePolkadotWalletInfo
  currencyInfo: EdgeCurrencyInfo
  allTokensMap: EdgeTokenMap
  tokenId: EdgeTokenId
}

// Not quite collision-proof but good enough for now
const getHash = (tx: LiberlandTransfer): string => {
  const id = tx.id
  for (const node of tx.block.extrinsics.nodes) {
    for (const event of node.events.nodes) {
      if (event.id === id) {
        return node.hash
      }
    }
  }
  throw new Error('No matching hash found')
}

export function processLiberlandTransaction(
  context: LiberlandTxProcessingContext,
  tx: LiberlandTransfer
): EdgeTransaction | undefined {
  const { fromId, value, block, id: extrinsicId } = tx
  const { tokenId } = context

  const blockHeight = parseInt(block.number)
  const date = new Date(block.timestamp + 'Z').getTime() / 1000 // Convert timestamp to epoch seconds

  const ourReceiveAddresses = []

  let nativeAmount = value
  const denom =
    tokenId == null
      ? getDenomination(
          context.currencyInfo.currencyCode,
          context.currencyInfo,
          context.allTokensMap
        )
      : context.allTokensMap[tokenId].denominations[0]

  if (denom == null) return

  if (fromId === context.walletInfo.keys.publicKey) {
    nativeAmount = `-${nativeAmount}`
  } else {
    ourReceiveAddresses.push(context.walletInfo.keys.publicKey)
  }

  const { currencyCode } =
    tokenId == null ? context.currencyInfo : context.allTokensMap[tokenId]

  const edgeTransaction: EdgeTransaction = {
    blockHeight,
    confirmations: 'confirmed',
    currencyCode,
    date,
    isSend: nativeAmount.startsWith('-'),
    memos: [],
    nativeAmount,
    networkFee: '0', // Fee data not provided by current `liberlandScanUrl`
    networkFees: [],
    ourReceiveAddresses,
    signedTx: '',
    tokenId,
    txid: getHash(tx),
    walletId: context.walletId,
    otherParams: {
      // HACK: Liberland explorer can't search by hashed txid, so use the extrinsicId
      explorerPath:
        tokenId == null ? `transfer/${extrinsicId}` : `merit/${extrinsicId}`
    }
  }
  return edgeTransaction
}
