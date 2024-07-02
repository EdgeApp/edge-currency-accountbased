import {
  API,
  APIError,
  Asset,
  PackedTransaction,
  PrivateKey,
  SignedTransaction,
  Transaction
} from '@greymass/eosio'
import { PowerUpState, Resources, SampleUsage } from '@greymass/eosio-resources'
import { div, eq, gt, mul, toFixed } from 'biggystring'
import { asEither, asMaybe } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeEnginePrivateKeyOptions,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import parse from 'url-parse'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  asyncWaterfall,
  cleanTxLogs,
  getDenomination,
  getFetchCors,
  getOtherParams,
  pickRandom
} from '../common/utils'
import {
  asDfuseGetKeyAccountsResponse,
  asDfuseGetTransactionsErrorResponse,
  asDfuseGetTransactionsResponse,
  asEosTransactionSuperNodeSchema,
  asGetAccountActivationQuote,
  asHyperionGetTransactionResponse,
  asHyperionTransaction,
  dfuseGetTransactionsQueryString,
  EosOtherParams,
  EosTransfer,
  HyperionGetTransactionResponse,
  HyperionTransaction,
  powerupAbi,
  transferAbi
} from './eosSchema'
import { checkAddress, EosTools, getClient } from './EosTools'
import {
  AccountResources,
  asEosPrivateKeys,
  asEosWalletOtherData,
  asSafeEosWalletInfo,
  EosNetworkInfo,
  EosPrivateKeys,
  EosTransaction,
  EosWalletOtherData,
  ReferenceBlock,
  SafeEosWalletInfo
} from './eosTypes'

const ADDRESS_POLL_MILLISECONDS = 999999
const BLOCKCHAIN_POLL_MILLISECONDS = 999999
const TRANSACTION_POLL_MILLISECONDS = 999999
const CHECK_TXS_HYPERION = true
const CHECK_TXS_FULL_NODES = true

type EosFunction =
  | 'getAccount'
  | 'getCurrencyBalance'
  | 'getIncomingTransactions'
  | 'getInfo'
  | 'getKeyAccounts'
  | 'getOutgoingTransactions'
  | 'getPowerUpState'
  | 'getResourceUsage'
  | 'transact'

const bogusAccounts: { readonly [name: string]: true } = {
  ramdeathtest: true,
  krpj4avazggi: true,
  fobleos13125: true
}

export class EosEngine extends CurrencyEngine<EosTools, SafeEosWalletInfo> {
  activatedAccountsCache: { [publicAddress: string]: boolean }
  otherData!: EosWalletOtherData
  otherMethods: Object
  networkInfo: EosNetworkInfo
  fetchCors: EdgeFetchFunction
  referenceBlock: ReferenceBlock
  accountResources: AccountResources
  accountNameChecked: boolean
  getResourcesMutex: boolean

  constructor(
    env: PluginEnvironment<EosNetworkInfo>,
    tools: EosTools,
    walletInfo: SafeEosWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    const { networkInfo } = env
    this.fetchCors = getFetchCors(env.io)
    this.networkInfo = networkInfo
    this.activatedAccountsCache = {}
    const { currencyCode, denominations } = this.currencyInfo
    this.referenceBlock = {
      ref_block_num: 0,
      ref_block_prefix: 0
    }
    this.accountResources = {
      cpu: 0,
      net: 0
    }
    this.accountNameChecked = false
    this.getResourcesMutex = false
    this.allTokens.push({
      ...denominations[0],
      currencyCode,
      currencyName: currencyCode,
      contractAddress: 'eosio.token',
      denominations
    })
    this.otherMethods = {
      getAccountActivationQuote: async (params: {
        requestedAccountName: string
        currencyCode: string
        ownerPublicKey: string
        activePublicKey: string
        requestedAccountCurrencyCode: string
      }): Promise<Object> => {
        const {
          requestedAccountName,
          currencyCode,
          ownerPublicKey,
          activePublicKey,
          requestedAccountCurrencyCode
        } = params
        if (currencyCode == null || requestedAccountName == null) {
          throw new Error('ErrorInvalidParams')
        }
        if (ownerPublicKey == null && activePublicKey == null) {
          throw new Error('ErrorInvalidParams')
        }
        if (!checkAddress(requestedAccountName)) {
          const e = new Error('ErrorInvalidAccountName')
          e.name = 'ErrorInvalidAccountName'
          throw e
        }

        const options = {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requestedAccountName,
            currencyCode,
            ownerPublicKey,
            activePublicKey,
            requestedAccountCurrencyCode // chain ie TLOS or EOS
          })
        }

        try {
          const out = await asyncWaterfall(
            this.networkInfo.eosActivationServers.map(server => async () => {
              const uri = `${server}/api/v1/activateAccount`
              const response = await this.fetchCors(uri, options)
              return await response.json()
            }),
            15000
          )
          return asGetAccountActivationQuote(out)
        } catch (e: any) {
          this.error(`getAccountActivationQuoteError: `, e)
          throw new Error(`getAccountActivationQuoteError`)
        }
      }
    }
  }

  setOtherData(raw: unknown): void {
    this.otherData = asEosWalletOtherData(raw)
  }

  // Poll on the blockheight
  async checkBlockchainInnerLoop(): Promise<void> {
    try {
      const result: API.v1.GetInfoResponse = await this.multicastServers(
        'getInfo'
      )
      const blockHeight = result.head_block_num.toNumber()
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }

      const header = result.getTransactionHeader()
      this.referenceBlock = {
        ref_block_num: header.ref_block_num.toNumber(),
        ref_block_prefix: header.ref_block_prefix.toNumber()
      }
    } catch (e: any) {
      this.error(`Error fetching height: `, e)
    }
  }

  processIncomingTransaction(action: HyperionTransaction): number {
    const clean = asMaybe(asEosTransactionSuperNodeSchema)(action)
    if (clean == null) {
      this.error('Invalid supernode tx')
      return 0
    }

    const { act, trx_id: trxId, block_num: blockNum } = clean
    const blockTime = clean['@timestamp']

    const { from, to, memo, symbol } = act.data
    const exchangeAmount = act.data.amount.toString()
    const currencyCode = symbol
    const contractAddress = this.allTokens.find(
      token => token.currencyCode === currencyCode
    )?.contractAddress
    if (contractAddress == null) {
      return 0
    }
    const tokenId =
      currencyCode === this.currencyInfo.currencyCode
        ? null
        : contractAddress?.toLowerCase()
    const ourReceiveAddresses = []
    const denom = getDenomination(
      currencyCode,
      this.currencyInfo,
      this.allTokensMap
    )
    if (denom == null) {
      this.log(
        `processIncomingTransaction Received unsupported currencyCode: ${currencyCode}`
      )
      return 0
    }
    let nativeAmount = mul(exchangeAmount, denom.multiplier)
    let name = ''
    if (to === this.otherData.accountName) {
      name = from
      ourReceiveAddresses.push(to)
      if (from === this.otherData.accountName) {
        // This is a spend to self. Make amount 0
        nativeAmount = '0'
      }
    } else {
      name = to
      nativeAmount = `-${nativeAmount}`
    }

    const edgeTransaction: EdgeTransaction = {
      blockHeight: blockNum > 0 ? blockNum : 0,
      currencyCode,
      date: Date.parse(blockTime) / 1000,
      isSend: nativeAmount.startsWith('-'),
      memos: [],
      metadata: {
        name,
        notes: memo
      },
      nativeAmount,
      networkFee: '0',
      otherParams: {},
      ourReceiveAddresses,
      parentNetworkFee: '0',
      signedTx: '',
      tokenId,
      txid: trxId,
      walletId: this.walletId
    }

    this.addTransaction(currencyCode, edgeTransaction)
    return edgeTransaction.blockHeight
  }

  processOutgoingTransaction(action: EosTransaction): number {
    const ourReceiveAddresses = []
    // Hyperion nodes return a UTC timestamp without the Z suffix. We need to add it to parse it accurately.
    const timestamp = !action['@timestamp'].includes('Z')
      ? action['@timestamp'] + 'Z'
      : action['@timestamp']
    const date = Date.parse(timestamp) / 1000
    const blockHeight = action.block_num > 0 ? action.block_num : 0
    if (action.block_num == null) {
      this.error(
        `Invalid ${this.currencyInfo.currencyCode} transaction data. No tx block_num`
      )
      return 0
    }
    const txid = action.trx_id

    if (action.act == null) {
      this.error(
        `Invalid ${this.currencyInfo.currencyCode} transaction data. No action.act`
      )
      return 0
    }
    const name = action.act.name
    if (name === 'transfer') {
      if (action.act.data == null) {
        this.error(
          `Invalid ${this.currencyInfo.currencyCode} transaction data. No action.act.data`
        )
        return 0
      }
      const { from, to, memo, amount, symbol } = action.act.data
      const exchangeAmount = amount.toString()
      const currencyCode = symbol
      const contractAddress = this.allTokens.find(
        token => token.currencyCode === currencyCode
      )?.contractAddress
      if (contractAddress == null) {
        return 0
      }
      const tokenId =
        currencyCode === this.currencyInfo.currencyCode
          ? null
          : contractAddress?.toLowerCase()

      const denom = getDenomination(
        currencyCode,
        this.currencyInfo,
        this.allTokensMap
      )
      // if invalid currencyCode then don't count as valid transaction
      if (denom == null) {
        this.error(
          `processOutgoingTransaction Received unsupported currencyCode: ${currencyCode}`
        )
        return 0
      }
      let nativeAmount = mul(exchangeAmount, denom.multiplier)
      // if sending to one's self
      if (to === this.otherData.accountName) {
        ourReceiveAddresses.push(to)
        if (from === this.otherData.accountName) {
          // This is a spend to self. Make amount 0
          nativeAmount = '0'
        }
      } else {
        nativeAmount = `-${nativeAmount}`
      }

      const edgeTransaction: EdgeTransaction = {
        blockHeight,
        currencyCode,
        date,
        isSend: nativeAmount.startsWith('-'),
        memos: [],
        metadata: {
          notes: memo
        },
        nativeAmount,
        networkFee: '0',
        otherParams: { fromAddress: from, toAddress: to },
        ourReceiveAddresses,
        parentNetworkFee: '0',
        signedTx: '',
        tokenId,
        txid,
        walletId: this.walletId
      }

      this.addTransaction(currencyCode, edgeTransaction)
    }
    return blockHeight
  }

  async checkOutgoingTransactions(
    acct: string,
    currencyCode: string
  ): Promise<void> {
    if (!CHECK_TXS_FULL_NODES) throw new Error('Dont use full node API')
    const limit = 10
    let skip = 0
    let finish = false

    let newHighestTxHeight =
      this.otherData.lastQueryActionSeq[currencyCode] ?? 0

    while (!finish) {
      const params = {
        direction: 'outgoing',
        acct,
        currencyCode,
        skip,
        limit,
        low: newHighestTxHeight + 1
      }
      const actionsObject = await this.multicastServers(
        'getOutgoingTransactions',
        params
      )
      let actions = []
      // if the actions array is not empty, then set the actions variable
      if (actionsObject.actions != null && actionsObject.actions.length > 0) {
        actions = actionsObject.actions
      } else {
        break
      }
      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]
        const blockNum = this.processOutgoingTransaction(action)
        // if the block height for the transaction is greater than the previously highest block height
        if (blockNum > newHighestTxHeight) {
          newHighestTxHeight = blockNum
        } else if (blockNum === newHighestTxHeight && i === 0 && skip === 0) {
          // If on the first query, we get blockHeights equal to the previously cached heights
          // then stop query as we assume we're just getting back previously queried data
          finish = true
          break
        }
      }
      // if there are no actions or it's less than the limit (we're at the end)
      if (actions == null || actions.length < limit) {
        break
      }
      skip += 10
    }
    // if there have been new valid actions then increase the last sequence number
    if (
      newHighestTxHeight >
      (this.otherData.lastQueryActionSeq[currencyCode] ?? 0)
    ) {
      this.otherData.lastQueryActionSeq[currencyCode] = newHighestTxHeight
      this.walletLocalDataDirty = true
    }
  }

  // similar to checkOutgoingTransactions, possible to refactor
  async checkIncomingTransactions(
    acct: string,
    currencyCode: string
  ): Promise<void> {
    if (!CHECK_TXS_HYPERION) throw new Error('Dont use Hyperion API')

    let newHighestTxHeight = this.otherData.highestTxHeight[currencyCode] ?? 0

    const limit = 10
    let skip = 0
    let finish = false

    while (!finish) {
      this.log(
        'looping through checkIncomingTransactions, newHighestTxHeight: ',
        newHighestTxHeight
      )
      // Use hyperion API with a block producer. "transfers" essentially mean transactions
      // may want to move to get_actions at the request of block producer
      const params = {
        direction: 'incoming',
        acct,
        currencyCode,
        skip,
        limit,
        low: newHighestTxHeight + 1
      }
      const actionsObject: HyperionGetTransactionResponse =
        await this.multicastServers('getIncomingTransactions', params)
      let actions = []
      // sort transactions by block height (blockNum) since they can be out of order
      actionsObject.actions.sort((a, b) => b.block_num - a.block_num)

      // if there are no actions
      if (actionsObject.actions.length > 0) {
        actions = actionsObject.actions
      } else {
        break
      }

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]
        const blockNum = this.processIncomingTransaction(action)
        // if the block height for the transaction is greater than the previously highest block height
        // then set new highest block height
        if (blockNum > newHighestTxHeight) {
          newHighestTxHeight = blockNum
        } else if (blockNum === newHighestTxHeight && i === 0 && skip === 0) {
          // If on the first query, we get blockHeights equal to the previously cached heights
          // then stop query as we assume we're just getting back previously queried data
          finish = true
          break
        }
      }
      if (actions.length === 0 || actions.length < limit) {
        break
      }
      skip += 10
    }
    if (
      newHighestTxHeight > (this.otherData.highestTxHeight[currencyCode] ?? 0)
    ) {
      this.otherData.highestTxHeight[currencyCode] = newHighestTxHeight
      this.walletLocalDataDirty = true
    }
  }

  async checkTransactionsInnerLoop(): Promise<void> {
    if (!this.accountNameChecked) {
      return
    }
    const acct = this.otherData.accountName

    for (const token of this.enabledTokens) {
      try {
        await this.checkIncomingTransactions(acct, token)
        await this.checkOutgoingTransactions(acct, token)
      } catch (e: any) {
        // Unactivated accounts can continue to update status
        if (acct !== '') {
          this.error(
            `checkTransactionsInnerLoop fetches failed with error: `,
            e
          )
          return
        }
      }

      this.tokenCheckTransactionsStatus[token] = 1
      this.updateOnAddressesChecked()
      if (this.transactionsChangedArray.length > 0) {
        this.currencyEngineCallbacks.onTransactionsChanged(
          this.transactionsChangedArray
        )
        this.transactionsChangedArray = []
      }
    }
  }

  async multicastServers(func: EosFunction, ...params: any): Promise<any> {
    const { currencyCode } = this.currencyInfo
    let out = { result: '', server: 'no server' }
    switch (func) {
      case 'getAccount': {
        out = await asyncWaterfall(
          this.networkInfo.eosNodes.map(server => async () => {
            const client = getClient(this.fetchCors, server)
            const result = await client.v1.chain.get_account(
              this.otherData.accountName
            )

            return { server, result }
          })
        )
        break
      }
      case 'getIncomingTransactions':
      case 'getOutgoingTransactions': {
        const { direction, acct, currencyCode, skip, limit, low } = params[0]
        const hyperionFuncs = this.networkInfo.eosHyperionNodes.map(
          server => async () => {
            const url =
              server +
              `/v2/history/get_actions?transfer.${
                direction === 'outgoing' ? 'from' : 'to'
              }=${acct}&transfer.symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`
            const response = await this.fetchCors(url)
            const parsedUrl = parse(url, {}, true)
            if (!response.ok) {
              this.error(`multicast in / out tx server error: ${server}`)
              throw new Error(
                `The server returned error code ${response.status} for ${parsedUrl.hostname}`
              )
            }
            const result = asHyperionGetTransactionResponse(
              await response.json()
            )
            return { server, result }
          }
        )
        const dfuseFuncs = this.networkInfo.eosDfuseServers.map(
          server => async () => {
            if (this.currencyInfo.currencyCode !== 'EOS')
              throw new Error('dfuse only supports EOS')
            const response = await this.fetchCors(`${server}/graphql`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                query: dfuseGetTransactionsQueryString,
                variables: {
                  query: `${
                    direction === 'outgoing' ? 'auth' : 'receiver'
                  }:${acct} action:transfer`,
                  limit,
                  low
                }
              })
            })
            const responseJson = asEither(
              asDfuseGetTransactionsResponse,
              asDfuseGetTransactionsErrorResponse
            )(await response.json())
            if ('errors' in responseJson) {
              this.warn(
                `dfuse ${server} get transactions failed: ${JSON.stringify(
                  responseJson.errors[0]
                )}`
              )
              throw new Error(responseJson.errors[0].message)
            }
            // Convert txs to Hyperion
            const actions =
              responseJson.data.searchTransactionsBackward.results.map(tx =>
                asHyperionTransaction({
                  trx_id: tx.trace.id,
                  '@timestamp': tx.trace.block.timestamp,
                  block_num: tx.trace.block.num,
                  act: {
                    data: {
                      from: tx.trace.matchingActions[0].json.from,
                      to: tx.trace.matchingActions[0].json.to,
                      // quantity: "0.0001 EOS"
                      amount: Number(
                        tx.trace.matchingActions[0].json.quantity.split(' ')[0]
                      ),
                      symbol:
                        tx.trace.matchingActions[0].json.quantity.split(' ')[1],
                      memo: tx.trace.matchingActions[0].json.memo
                    }
                  }
                })
              )
            return { server, result: { actions } }
          }
        )
        out = await asyncWaterfall([...hyperionFuncs, ...dfuseFuncs])
        break
      }

      case 'getKeyAccounts': {
        const publicKey = params[0]
        const hyperionFuncs = this.networkInfo.eosHyperionNodes.map(
          server => async () => {
            const client = getClient(this.fetchCors, server)
            const accounts = await client.v1.history.get_key_accounts(publicKey)
            // TODO: v1 history node endpoint has been deprecated. New Greymass Robo API (in development) will provide history v1 compatibility.

            if (accounts.account_names.length === 0) {
              throw new Error(
                `${server} could not find account with public key: ${publicKey}`
              )
            }

            return { server, result: accounts.account_names[0].toString() }
          }
        )
        // dfuse API is EOS only
        const dfuseFuncs = this.networkInfo.eosDfuseServers.map(
          server => async () => {
            if (this.currencyInfo.currencyCode !== 'EOS')
              throw new Error('dfuse only supports EOS')
            const response = await this.fetchCors(
              `${server}/v0/state/key_accounts?public_key=${publicKey}`
            )
            if (!response.ok) {
              throw new Error(
                `${server} get_account failed with ${response.status}`
              )
            }
            const responseJson = asDfuseGetKeyAccountsResponse(
              await response.json()
            )
            if (responseJson.account_names.length === 0)
              throw new Error('dfuse returned empty array')
            return {
              server,
              result: responseJson.account_names[0]
            }
          }
        )
        out = await asyncWaterfall([...hyperionFuncs, ...dfuseFuncs])
        break
      }

      case 'getCurrencyBalance': {
        const contractAddress = params[0]
        out = await asyncWaterfall(
          this.networkInfo.eosNodes.map(server => async () => {
            const client = getClient(this.fetchCors, server)
            const result = await client.v1.chain.get_currency_balance(
              contractAddress,
              this.otherData.accountName
            )

            return { server, result }
          })
        )
        break
      }
      case 'getInfo': {
        const { eosNodes } = this.networkInfo
        const randomNodes = pickRandom(eosNodes, 3)
        out = await asyncWaterfall(
          randomNodes.map(server => async () => {
            const client = getClient(this.fetchCors, server)
            const result = await client.v1.chain.get_info()

            return { server, result }
          })
        )
        break
      }
      case 'getPowerUpState': {
        out = await asyncWaterfall(
          this.networkInfo.eosNodes.map(server => async () => {
            const client = getClient(this.fetchCors, server)
            const resources = new Resources({ api: client })
            const result = await resources.v1.powerup.get_state()

            return { server, result }
          })
        )
        break
      }
      case 'getResourceUsage': {
        out = await asyncWaterfall(
          this.networkInfo.eosNodes.map(server => async () => {
            const client = getClient(this.fetchCors, server)
            const resources = new Resources({ api: client })
            const result = await resources.getSampledUsage()

            return { server, result }
          })
        )
        break
      }
      case 'transact': {
        const { eosNodes } = this.networkInfo
        const randomNodes = pickRandom(eosNodes, 30)
        out = await asyncWaterfall(
          randomNodes.map(server => async () => {
            const tx: PackedTransaction = params[0]
            const client = getClient(this.fetchCors, server)
            const result = await client.v1.chain.send_transaction(tx)

            return { server, result }
          })
        )

        break
      }
    }

    this.log(`${currencyCode} multicastServers ${func} ${out.server} won`)
    return out.result
  }

  // Check all account balance and other relevant info
  async checkAccountInnerLoop(): Promise<void> {
    const publicKey = this.walletLocalData.publicKey
    try {
      if (bogusAccounts[this.otherData.accountName ?? '']) {
        this.otherData.accountName = ''
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onAddressChanged()
      }
      // Check if the publicKey has an account accountName
      if (this.otherData.accountName === '') {
        const accountName: string | undefined = await this.multicastServers(
          'getKeyAccounts',
          publicKey
        )
        if (accountName != null && bogusAccounts[accountName] == null) {
          this.otherData.accountName = accountName
          this.accountNameChecked = true
          this.walletLocalDataDirty = true
          this.currencyEngineCallbacks.onAddressChanged()
        }
      }
    } catch (e: any) {
      if (/get_account failed with 400/.test(e?.message)) {
        // dfuse servers will return 400 for new unused accounts and can be ignored
        this.accountNameChecked = true
      } else {
        this.error(`getKeyAccounts error: `, e)
      }
    }

    try {
      // If account name still doesn't exist, set new wallet default values and return
      if (this.otherData.accountName === '') {
        for (const token of this.allTokens) {
          this.updateBalance(token.currencyCode, '0')
        }
        return
      }

      // Check balance on account
      for (const token of this.allTokens) {
        if (this.enabledTokens.includes(token.currencyCode)) {
          const results: Asset[] = await this.multicastServers(
            'getCurrencyBalance',
            token.contractAddress
          )
          const nativeAmount = results[0]?.units?.toString() ?? '0'
          this.updateBalance(token.currencyCode, nativeAmount)
        }
      }

      // Check available resources on account
      const accountStats: API.v1.AccountObject = await this.multicastServers(
        'getAccount'
      )

      const { cpu_limit: cpuLimit, net_limit: netLimit } = accountStats
      this.accountResources = {
        cpu: cpuLimit.available.toNumber(),
        net: netLimit.available.toNumber()
      }
    } catch (e: any) {
      this.error(`Error fetching account: `, e)
    }
  }

  async getResources(privateKeys: EosPrivateKeys): Promise<void> {
    if (this.getResourcesMutex) return
    const { cpu, net } = this.accountResources
    if (cpu > 500 && net > 500) {
      // Can afford a typical transaction
      return
    }

    // This service allows 2 topups per day
    if (
      this.otherData.lastFreePowerUp >
      Date.now() - 1000 * 60 * 60 * 12 /* 12 hours */
    ) {
      const server = pickRandom(this.networkInfo.powerUpServers, 1)
      try {
        const response = await this.fetchCors(
          `${server}/${this.otherData.accountName}`
        )
        if (!response.ok) {
          throw new Error(`getResources error ${response.status}`)
        }

        this.otherData.lastFreePowerUp = Date.now()
        this.walletLocalDataDirty = true
        this.log.warn('getResources freePowerUp SUCCESS')
        return
      } catch (e) {
        this.log.warn('getResources lastFreePowerUp error', e)
      }
    }

    // Pay for resources
    try {
      const powerUpState: PowerUpState = await this.multicastServers(
        'getPowerUpState'
      )
      const usage: SampleUsage = await this.multicastServers('getResourceUsage')
      const cpuFraction = powerUpState.cpu.frac(usage, 1000)
      const netFraction = powerUpState.net.frac(usage, 1000)

      const transferActions = [
        {
          account: 'eosio',
          name: 'powerup',
          authorization: [
            {
              actor: this.otherData.accountName,
              permission: 'active'
            }
          ],
          data: {
            payer: this.otherData.accountName,
            receiver: this.otherData.accountName,
            days: 1,
            cpu_frac: cpuFraction,
            net_frac: netFraction,
            max_payment: '0.0003 EOS'
          }
        }
      ]
      const edgeTransaction: EdgeTransaction = {
        blockHeight: 0,
        currencyCode: this.currencyInfo.currencyCode,
        date: 0,
        isSend: true,
        memos: [],
        nativeAmount: '-3',
        networkFee: '0',
        otherParams: {
          actions: transferActions,
          signatures: []
        },
        ourReceiveAddresses: [],
        signedTx: '',
        tokenId: null,
        txid: '',
        walletId: this.walletId
      }
      const signedTx = await this.signTx(edgeTransaction, privateKeys)
      this.getResourcesMutex = true
      await this.broadcastTx(signedTx, { privateKeys })
      this.log.warn('getResources purchase SUCCESS')
    } catch (e) {
      this.log.warn('getResources purchase FAILURE\n', e)
    } finally {
      this.getResourcesMutex = false
    }
  }

  async clearBlockchainCache(): Promise<void> {
    this.activatedAccountsCache = {}
    await super.clearBlockchainCache()
    this.otherData.lastQueryActionSeq = {}
    this.otherData.highestTxHeight = {}
    this.otherData.accountName = ''
    this.accountNameChecked = false
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // This routine is called once a wallet needs to start querying the network
  async startEngine(): Promise<void> {
    this.engineOn = true
    this.accountNameChecked = this.otherData.accountName !== ''
    this.addToLoop(
      'checkBlockchainInnerLoop',
      BLOCKCHAIN_POLL_MILLISECONDS
    ).catch(() => {})
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop(
      'checkTransactionsInnerLoop',
      TRANSACTION_POLL_MILLISECONDS
    ).catch(() => {})
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getFreshAddress(): Promise<
    EdgeFreshAddress & { publicKey?: string; ownerPublicKey?: string }
  > {
    if (this.otherData.accountName != null) {
      return { publicAddress: this.otherData.accountName }
    } else {
      // Account is not yet active. Return the publicKeys so the user can activate the account
      return {
        publicAddress: '',
        publicKey: this.walletInfo.keys.publicKey,
        ownerPublicKey: this.walletInfo.keys.ownerPublicKey
      }
    }
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode, nativeBalance, denom } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    const tokenInfo = this.getTokenInfo(currencyCode)
    if (tokenInfo == null) throw new Error('Unable to find token info')
    const { contractAddress = 'eosio.token' } = tokenInfo
    const nativeDenomination = getDenomination(
      currencyCode,
      this.currencyInfo,
      this.allTokensMap
    )
    if (nativeDenomination == null) {
      throw new Error(`Error: no native denomination found for ${currencyCode}`)
    }
    const nativePrecision = nativeDenomination.multiplier.length - 1
    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { publicAddress } = edgeSpendInfo.spendTargets[0]
    let { nativeAmount } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    // Check if destination address is activated
    let mustCreateAccount = false
    const activated = this.activatedAccountsCache[publicAddress]
    if (activated !== undefined && !activated) {
      mustCreateAccount = true
    } else if (activated === undefined) {
      try {
        await this.tools.getAccSystemStats(publicAddress)
        this.activatedAccountsCache[publicAddress] = true
      } catch (e: any) {
        if (
          e instanceof APIError &&
          e.details[0].message.includes('unknown key')
        ) {
          this.activatedAccountsCache[publicAddress] = false
          mustCreateAccount = true
        } else {
          this.error(`makeSpend eosPlugin.getAccSystemStats Error `, e)
          throw e
        }
      }
    }
    if (mustCreateAccount) {
      throw new Error('ErrorAccountNotActivated')
    }

    if (eq(nativeAmount, '0')) {
      throw new NoAmountSpecifiedError()
    }
    const exchangeAmount = div(nativeAmount, denom.multiplier, nativePrecision)
    const networkFee = '0'
    if (gt(nativeAmount, nativeBalance)) {
      throw new InsufficientFundsError({ tokenId })
    }

    const quantity =
      toFixed(exchangeAmount, nativePrecision) + ` ${currencyCode}`
    const memo = memos[0]?.type === 'text' ? memos[0].value : undefined

    const transferActions: EosTransfer[] = [
      {
        account: contractAddress,
        name: 'transfer',
        authorization: [
          {
            actor: this.otherData.accountName,
            permission: 'active'
          }
        ],
        data: {
          from: this.otherData.accountName,
          to: publicAddress,
          quantity,
          memo
        }
      }
    ]

    nativeAmount = `-${nativeAmount}`

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0, // blockHeight
      currencyCode, // currencyCode
      date: 0, // date
      isSend: nativeAmount.startsWith('-'),
      memos,
      nativeAmount, // nativeAmount
      networkFee, // networkFee
      otherParams: {
        actions: transferActions,
        signatures: []
      },
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      tokenId,
      txid: '', // txid
      walletId: this.walletId
    }
    this.warn(
      `${this.currencyInfo.currencyCode} tx prepared: ${nativeAmount} ${this.walletLocalData.publicKey} -> ${publicAddress}`
    )
    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const eosPrivateKeys = asEosPrivateKeys(privateKeys)
    const otherParams = getOtherParams<EosOtherParams>(edgeTransaction)

    const abi =
      otherParams.actions[0].name === 'transfer' ? transferAbi : powerupAbi

    const transaction = Transaction.from(
      {
        ...this.referenceBlock,
        expiration: new Date(new Date().getTime() + 30000),
        actions: otherParams.actions
      },
      abi
    )
    const txDigest = transaction.signingDigest(this.networkInfo.chainId)
    const privateKey = PrivateKey.from(eosPrivateKeys.eosKey)
    const signature = privateKey.signDigest(txDigest)
    const signedTransaction = SignedTransaction.from({
      ...transaction,
      signatures: [signature]
    })
    otherParams.signatures.push(signature.toString())
    const packed = PackedTransaction.fromSigned(signedTransaction)
    const signedHex = packed.packed_trx.hexString

    edgeTransaction.signedTx = signedHex
    edgeTransaction.otherParams = otherParams
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction,
    opts?: EdgeEnginePrivateKeyOptions
  ): Promise<EdgeTransaction> {
    const eosPrivateKeys = asEosPrivateKeys(opts?.privateKeys)
    await this.getResources(eosPrivateKeys)

    const otherParams = getOtherParams<EosOtherParams>(edgeTransaction)
    const { signatures } = otherParams

    const packedTx = PackedTransaction.from({
      signatures,
      packed_trx: edgeTransaction.signedTx
    })

    try {
      const response: API.v1.SendTransactionResponse =
        await this.multicastServers('transact', packedTx)

      edgeTransaction.date = Date.now() / 1000
      edgeTransaction.txid = response.transaction_id
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
      return edgeTransaction
    } catch (e: any) {
      this.error('\nCaught exception: ', e)
      if (e instanceof APIError) this.error(JSON.stringify(e.error, null, 2))
      let err = e
      if (err.error != null) {
        this.error(`err.error= ${err.error}`)
        this.error(`err.error.name= ${err.error.name}`)
      }
      try {
        err = JSON.parse(e)
      } catch (e2) {
        throw e
      }
      if (err.error?.name === 'tx_net_usage_exceeded') {
        err = new Error('Insufficient NET available to send EOS transaction')
        err.name = 'ErrorEosInsufficientNet'
      } else if (err.error?.name === 'tx_cpu_usage_exceeded') {
        err = new Error('Insufficient CPU available to send EOS transaction')
        err.name = 'ErrorEosInsufficientCpu'
      } else if (err.error?.name === 'ram_usage_exceeded') {
        err = new Error('Insufficient RAM available to send EOS transaction')
        err.name = 'ErrorEosInsufficientRam'
      }
      throw err
    }
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<EosNetworkInfo>,
  tools: EosTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const safeWalletInfo = asSafeEosWalletInfo(walletInfo)
  const engine = new EosEngine(env, tools, safeWalletInfo, opts)
  await engine.loadEngine()

  return engine
}
