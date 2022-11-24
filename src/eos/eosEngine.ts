/* eslint-disable camelcase */

import { div, eq, gt, mul, toFixed } from 'biggystring'
import { asEither } from 'cleaners'
import {
  EdgeCurrencyEngineOptions,
  EdgeCurrencyTools,
  EdgeFetchFunction,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { Api, JsonRpc, RpcError } from 'eosjs'
import { JsSignatureProvider } from 'eosjs/dist/eosjs-jssig'
import { convertLegacyPublicKeys } from 'eosjs/dist/eosjs-numeric'
import EosApi from 'eosjs-api'
import parse from 'url-parse'

import { CurrencyEngine } from '../common/engine'
import {
  asyncWaterfall,
  cleanTxLogs,
  getDenomInfo,
  getOtherParams,
  pickRandom,
  validateObject
} from '../common/utils'
import { checkAddress, EosTools } from './eosPlugin'
import {
  asDfuseGetKeyAccountsResponse,
  asDfuseGetTransactionsErrorResponse,
  asDfuseGetTransactionsResponse,
  asGetAccountActivationQuote,
  asHyperionGetTransactionResponse,
  asHyperionTransaction,
  dfuseGetTransactionsQueryString,
  EosTransactionSuperNodeSchema
} from './eosSchema'
import {
  EosJsConfig,
  EosTransaction,
  EosTransactionSuperNode,
  EosWalletOtherData
} from './eosTypes'

const ADDRESS_POLL_MILLISECONDS = 10000
const BLOCKCHAIN_POLL_MILLISECONDS = 15000
const TRANSACTION_POLL_MILLISECONDS = 10000
// const ADDRESS_QUERY_LOOKBACK_BLOCKS = 0
const CHECK_TXS_HYPERION = true
const CHECK_TXS_FULL_NODES = true

type EosFunction =
  | 'getCurrencyBalance'
  | 'getIncomingTransactions'
  | 'getInfo'
  | 'getKeyAccounts'
  | 'getOutgoingTransactions'
  | 'transact'

const bogusAccounts = {
  ramdeathtest: true,
  krpj4avazggi: true,
  fobleos13125: true
}
class CosignAuthorityProvider {
  rpc: JsonRpc
  constructor(rpc: JsonRpc) {
    this.rpc = rpc
  }

  // @ts-expect-error
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async getRequiredKeys(args) {
    const { transaction } = args
    // Iterate over the actions and authorizations
    // @ts-expect-error
    transaction.actions.forEach((action, ti) => {
      // @ts-expect-error
      action.authorization.forEach((auth, ai) => {
        // If the authorization matches the expected cosigner
        // then remove it from the transaction while checking
        // for what public keys are required
        if (auth.actor === 'greymassfuel' && auth.permission === 'cosign') {
          // @ts-expect-error
          delete transaction.actions[ti].authorization.splice(ai, 1)
        }
      })
    })
    // the rpc below should be an already configured JsonRPC client from eosjs
    return convertLegacyPublicKeys(
      (
        await this.rpc.fetch('/v1/chain/get_required_keys', {
          transaction,
          available_keys: args.availableKeys
        })
      ).required_keys
    )
  }
}
export class EosEngine extends CurrencyEngine<EosTools> {
  activatedAccountsCache: { [publicAddress: string]: boolean }
  // @ts-expect-error
  otherData: EosWalletOtherData
  otherMethods: Object
  eosJsConfig: EosJsConfig
  fetchCors: EdgeFetchFunction

  constructor(
    tools: EosTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchCors: EdgeFetchFunction,
    eosJsConfig: EosJsConfig
  ) {
    super(tools, walletInfo, opts)
    this.fetchCors = fetchCors
    this.eosJsConfig = eosJsConfig
    this.activatedAccountsCache = {}
    const { currencyCode, denominations } = this.currencyInfo
    this.allTokens.push({
      ...denominations[0],
      currencyCode,
      currencyName: currencyCode,
      contractAddress: 'eosio.token',
      denominations
    })
    this.otherMethods = {
      getAccountActivationQuote: async (params: Object): Promise<Object> => {
        const {
          // @ts-expect-error
          requestedAccountName,
          // @ts-expect-error
          currencyCode,
          // @ts-expect-error
          ownerPublicKey,
          // @ts-expect-error
          activePublicKey,
          // @ts-expect-error
          requestedAccountCurrencyCode
        } = params
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!currencyCode || !requestedAccountName) {
          throw new Error('ErrorInvalidParams')
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (!ownerPublicKey && !activePublicKey) {
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
            this.currencyInfo.defaultSettings.otherSettings.eosActivationServers.map(
              // @ts-expect-error
              server => async () => {
                const uri = `${server}/api/v1/activateAccount`
                const response = await fetchCors(uri, options)
                return await response.json()
              }
            ),
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

  async loadEngine(
    plugin: EdgeCurrencyTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ): Promise<void> {
    await super.loadEngine(plugin, walletInfo, opts)
    if (typeof this.walletInfo.keys.ownerPublicKey !== 'string') {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (walletInfo.keys.ownerPublicKey) {
        this.walletInfo.keys.ownerPublicKey = walletInfo.keys.ownerPublicKey
      } else {
        const pubKeys = await plugin.derivePublicKey(this.walletInfo)
        this.walletInfo.keys.ownerPublicKey = pubKeys.ownerPublicKey
      }
    }
  }

  // Poll on the blockheight
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkBlockchainInnerLoop() {
    try {
      const result = await this.multicastServers('getInfo', {})
      const blockHeight = result.head_block_num
      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e: any) {
      this.error(`Error fetching height: `, e)
    }
  }

  processIncomingTransaction(action: EosTransactionSuperNode): number {
    const result = validateObject(action, EosTransactionSuperNodeSchema)
    if (!result) {
      this.error('Invalid supernode tx')
      return 0
    }

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { act, trx_id, block_num } = action
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const block_time = action['@timestamp']

    const { from, to, memo, symbol } = act.data
    const exchangeAmount = act.data.amount.toString()
    const currencyCode = symbol
    const ourReceiveAddresses = []
    const denom = getDenomInfo(this.currencyInfo, currencyCode, this.allTokens)
    if (denom == null) {
      this.error(
        `processIncomingTransaction Received unsupported currencyCode: ${currencyCode}`
      )
      return 0
    }
    let nativeAmount = mul(exchangeAmount, denom.multiplier)
    let name = ''
    // @ts-expect-error
    if (to === this.walletLocalData.otherData.accountName) {
      name = from
      ourReceiveAddresses.push(to)
      // @ts-expect-error
      if (from === this.walletLocalData.otherData.accountName) {
        // This is a spend to self. Make amount 0
        nativeAmount = '0'
      }
    } else {
      name = to
      nativeAmount = `-${nativeAmount}`
    }

    const edgeTransaction: EdgeTransaction = {
      txid: trx_id,
      date: Date.parse(block_time) / 1000,
      currencyCode,
      blockHeight: block_num > 0 ? block_num : 0,
      nativeAmount,
      networkFee: '0',
      parentNetworkFee: '0',
      ourReceiveAddresses,
      signedTx: '',
      otherParams: {},
      metadata: {
        name,
        notes: memo
      }
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
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!action.block_num) {
      this.error(
        `Invalid ${this.currencyInfo.currencyCode} transaction data. No tx block_num`
      )
      return 0
    }
    const txid = action.trx_id

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!action.act) {
      this.error(
        `Invalid ${this.currencyInfo.currencyCode} transaction data. No action.act`
      )
      return 0
    }
    const name = action.act.name
    // this.log('------------------------------------------------')
    // this.log(`Txid: ${txid}`)
    // this.log(`Action type: ${name}`)
    if (name === 'transfer') {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!action.act.data) {
        this.error(
          `Invalid ${this.currencyInfo.currencyCode} transaction data. No action.act.data`
        )
        return 0
      }
      const { from, to, memo, amount, symbol } = action.act.data
      const exchangeAmount = amount.toString()
      const currencyCode = symbol

      const denom = getDenomInfo(
        this.currencyInfo,
        currencyCode,
        this.allTokens
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
      // @ts-expect-error
      if (to === this.walletLocalData.otherData.accountName) {
        ourReceiveAddresses.push(to)
        // @ts-expect-error
        if (from === this.walletLocalData.otherData.accountName) {
          // This is a spend to self. Make amount 0
          nativeAmount = '0'
        }
      } else {
        nativeAmount = `-${nativeAmount}`
      }

      const edgeTransaction: EdgeTransaction = {
        txid,
        date,
        currencyCode,
        blockHeight,
        nativeAmount,
        networkFee: '0',
        parentNetworkFee: '0',
        ourReceiveAddresses,
        signedTx: '',
        metadata: {
          notes: memo
        },
        otherParams: { fromAddress: from, toAddress: to }
      }

      this.addTransaction(currencyCode, edgeTransaction)
      // this.log(`From: ${from}`)
      // this.log(`To: ${to}`)
      // this.log(`Memo: ${memo}`)
      // this.log(`Amount: ${exchangeAmount}`)
      // this.log(`currencyCode: ${currencyCode}`)
    }
    return blockHeight
  }

  async checkOutgoingTransactions(
    acct: string,
    currencyCode: string
  ): Promise<boolean> {
    if (!CHECK_TXS_FULL_NODES) throw new Error('Dont use full node API')
    const limit = 10
    let skip = 0
    let finish = false

    let newHighestTxHeight =
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      this.walletLocalData.otherData.lastQueryActionSeq[currencyCode] || 0

    while (!finish) {
      // query the server / node
      const params = {
        direction: 'outgoing',
        acct,
        currencyCode,
        skip,
        limit,
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        low: newHighestTxHeight + 1
      }
      const actionsObject = await this.multicastServers(
        'getOutgoingTransactions',
        params
      )
      let actions = []
      // if the actions array is not empty, then set the actions variable
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (actionsObject.actions && actionsObject.actions.length > 0) {
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
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!actions.length || actions.length < limit) {
        break
      }
      skip += 10
    }
    // if there have been new valid actions then increase the last sequence number
    if (
      newHighestTxHeight >
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      (this.walletLocalData.otherData.lastQueryActionSeq[currencyCode] || 0)
    ) {
      // @ts-expect-error
      this.walletLocalData.otherData.lastQueryActionSeq[currencyCode] =
        newHighestTxHeight
      this.walletLocalDataDirty = true
    }
    return true
  }

  // similar to checkOutgoingTransactions, possible to refactor
  async checkIncomingTransactions(
    acct: string,
    currencyCode: string
  ): Promise<boolean> {
    if (!CHECK_TXS_HYPERION) throw new Error('Dont use Hyperion API')

    let newHighestTxHeight =
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      this.walletLocalData.otherData.highestTxHeight[currencyCode] || 0

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
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        low: newHighestTxHeight + 1
      }
      const actionsObject = await this.multicastServers(
        'getIncomingTransactions',
        params
      )
      let actions = []
      // sort transactions by block height (blockNum) since they can be out of order
      // @ts-expect-error
      actionsObject.actions.sort((a, b) => b.block_num - a.block_num)

      // if there are no actions
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (actionsObject.actions && actionsObject.actions.length > 0) {
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
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!actions.length || actions.length < limit) {
        break
      }
      skip += 10
    }
    if (
      newHighestTxHeight >
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      (this.walletLocalData.otherData.highestTxHeight[currencyCode] || 0)
    ) {
      // @ts-expect-error
      this.walletLocalData.otherData.highestTxHeight[currencyCode] =
        newHighestTxHeight
      this.walletLocalDataDirty = true
    }
    return true
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkTransactionsInnerLoop() {
    if (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !this.walletLocalData.otherData ||
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !this.walletLocalData.otherData.accountName
    ) {
      return
    }
    // @ts-expect-error
    const acct = this.walletLocalData.otherData.accountName

    for (const token of this.enabledTokens) {
      let incomingResult, outgoingResult
      try {
        incomingResult = await this.checkIncomingTransactions(acct, token)
        outgoingResult = await this.checkOutgoingTransactions(acct, token)
      } catch (e: any) {
        this.error(`checkTransactionsInnerLoop fetches failed with error: `, e)
        return false
      }

      if (incomingResult && outgoingResult) {
        this.tokenCheckTransactionsStatus[token] = 1
        this.updateOnAddressesChecked()
      }
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
      case 'getIncomingTransactions':
      case 'getOutgoingTransactions': {
        const { direction, acct, currencyCode, skip, limit, low } = params[0]
        const hyperionFuncs =
          this.currencyInfo.defaultSettings.otherSettings.eosHyperionNodes.map(
            // @ts-expect-error
            server => async () => {
              const url =
                // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
                server +
                `/v2/history/get_actions?transfer.${
                  direction === 'outgoing' ? 'from' : 'to'
                }=${acct}&transfer.symbol=${currencyCode}&skip=${skip}&limit=${limit}&sort=desc`
              const response = await this.eosJsConfig.fetch(url)
              const parsedUrl = parse(url, {}, true)
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (!response.ok) {
                this.error('multicast in / out tx server error: ', server)
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
        const dfuseFuncs =
          this.currencyInfo.defaultSettings.otherSettings.eosDfuseServers.map(
            // @ts-expect-error
            server => async () => {
              if (this.currencyInfo.currencyCode !== 'EOS')
                throw new Error('dfuse only supports EOS')
              const response = await this.eosJsConfig.fetch(
                `${server}/graphql`,
                {
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
                }
              )
              const responseJson = asEither(
                asDfuseGetTransactionsResponse,
                asDfuseGetTransactionsErrorResponse
              )(await response.json())
              // @ts-expect-error
              if (responseJson.errors != null) {
                this.warn(
                  `dfuse ${server} get transactions failed: ${JSON.stringify(
                    // @ts-expect-error
                    responseJson.errors[0]
                  )}`
                )
                // @ts-expect-error
                throw new Error(responseJson.errors[0].message)
              }
              // Convert txs to Hyperion
              const actions =
                // @ts-expect-error
                responseJson.data.searchTransactionsBackward.results.map(tx =>
                  asHyperionTransaction({
                    trx_id: tx.trace.id,
                    '@timestamp': tx.trace.block.timestamp,
                    block_num: tx.trace.block.num,
                    act: {
                      authorization:
                        tx.trace.matchingActions[0].authorization[0],
                      data: {
                        from: tx.trace.matchingActions[0].json.from,
                        to: tx.trace.matchingActions[0].json.to,
                        // quantity: "0.0001 EOS"
                        amount: Number(
                          tx.trace.matchingActions[0].json.quantity.split(
                            ' '
                          )[0]
                        ),
                        symbol:
                          tx.trace.matchingActions[0].json.quantity.split(
                            ' '
                          )[1],
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
        const body = JSON.stringify({
          public_key: params[0]
        })
        const hyperionFuncs =
          this.currencyInfo.defaultSettings.otherSettings.eosHyperionNodes.map(
            // @ts-expect-error
            server => async () => {
              const authorizersReply = await this.eosJsConfig.fetch(
                `${server}/v1/history/get_key_accounts`,
                {
                  method: 'POST',
                  body,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }
              )
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (!authorizersReply.ok) {
                throw new Error(
                  `${server} get_key_accounts failed with ${JSON.stringify(
                    authorizersReply
                  )}`
                )
              }
              const authorizersData = await authorizersReply.json()
              // verify array order (chronological)?
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (!authorizersData.account_names[0]) {
                // indicates no activation has occurred
                // set flag to indicate whether has hit activation API
                // only do once per login (makeEngine)
                if (
                  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                  this.currencyInfo.defaultSettings.otherSettings
                    .createAccountViaSingleApiEndpoints &&
                  this.currencyInfo.defaultSettings.otherSettings
                    .createAccountViaSingleApiEndpoints.length > 0
                ) {
                  const { publicKey, ownerPublicKey } = this.walletInfo.keys

                  const { createAccountViaSingleApiEndpoints } =
                    this.currencyInfo.defaultSettings.otherSettings
                  const request = await this.fetchCors(
                    createAccountViaSingleApiEndpoints[0],
                    {
                      method: 'POST',
                      body: JSON.stringify({
                        ownerPublicKey,
                        activePublicKey: publicKey
                      }),
                      headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                      }
                    }
                  )
                  const response = await request.json()
                  const { accountName, transactionId } = response
                  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                  if (!accountName) throw new Error(response)
                  this.warn(
                    `Account created with accountName: ${accountName} and transactionId: ${transactionId}`
                  )
                }
                throw new Error(
                  `${server} could not find account with public key: ${params[0]}`
                )
              }
              const accountName = authorizersData.account_names[0]
              const getAccountBody = JSON.stringify({
                account_name: accountName
              })
              const accountReply = await this.eosJsConfig.fetch(
                `${server}/v1/chain/get_account`,
                {
                  method: 'POST',
                  body: getAccountBody
                }
              )
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (!accountReply.ok) {
                throw new Error(
                  `${server} get_account failed with ${authorizersReply}`
                )
              }
              return { server, result: await accountReply.json() }
            }
          )
        // dfuse API is EOS only
        const dfuseFuncs =
          this.currencyInfo.defaultSettings.otherSettings.eosDfuseServers.map(
            // @ts-expect-error
            server => async () => {
              if (this.currencyInfo.currencyCode !== 'EOS')
                throw new Error('dfuse only supports EOS')
              const response = await this.eosJsConfig.fetch(
                `${server}/v0/state/key_accounts?public_key=${params[0]}`
              )
              // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
              if (!response.ok) {
                throw new Error(
                  `${server} get_account failed with ${response.code}`
                )
              }
              const responseJson = asDfuseGetKeyAccountsResponse(
                await response.json()
              )
              if (responseJson.account_names.length === 0)
                throw new Error('dfuse returned empty array')
              return {
                server,
                result: {
                  account_name: responseJson.account_names[0]
                }
              }
            }
          )
        out = await asyncWaterfall([...hyperionFuncs, ...dfuseFuncs])
        break
      }

      case 'getCurrencyBalance':
      case 'getInfo': {
        const { eosNodes } = this.currencyInfo.defaultSettings.otherSettings
        const randomNodes = pickRandom(eosNodes, 3)
        out = await asyncWaterfall(
          randomNodes.map(server => async () => {
            const eosServer = EosApi({
              ...this.eosJsConfig,
              httpEndpoint: server
            })
            const result = await eosServer[func](...params)
            return { server, result }
          })
        )
        break
      }
      case 'transact': {
        const { eosFuelServers, eosNodes } =
          this.currencyInfo.defaultSettings.otherSettings
        const randomNodes =
          eosFuelServers.length > 0
            ? pickRandom(eosFuelServers, 30)
            : pickRandom(eosNodes, 30)
        out = await asyncWaterfall(
          randomNodes.map(server => async () => {
            // @ts-expect-error
            const rpc = new JsonRpc(server, {
              fetch: (...args) => {
                // this.log(`LoggedFetch: ${JSON.stringify(args)}`)
                return this.eosJsConfig.fetch(...args)
              }
            })
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            const keys = params[1].keyProvider ? params[1].keyProvider : []
            params[1] = {
              ...params[1],
              blocksBehind: 3,
              expireSeconds: 30
            }
            const signatureProvider = new JsSignatureProvider(keys)
            const eos = new Api({
              // Pass in new authorityProvider
              authorityProvider: new CosignAuthorityProvider(rpc),
              rpc,
              signatureProvider,
              textDecoder: new TextDecoder(),
              textEncoder: new TextEncoder()
            })
            // @ts-expect-error
            const result = await eos[func](...params)
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
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async checkAccountInnerLoop() {
    const publicKey = this.walletLocalData.publicKey
    try {
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (bogusAccounts[this.walletLocalData.otherData.accountName]) {
        // @ts-expect-error
        this.walletLocalData.otherData.accountName = ''
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onAddressChanged()
      }
      // Check if the publicKey has an account accountName
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!this.walletLocalData.otherData.accountName) {
        const account = await this.multicastServers('getKeyAccounts', publicKey)
        // @ts-expect-error
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (account && !bogusAccounts[account.account_name]) {
          // @ts-expect-error
          this.walletLocalData.otherData.accountName = account.account_name
          this.walletLocalDataDirty = true
          this.currencyEngineCallbacks.onAddressChanged()
        }
      }

      // Check balance on account
      // @ts-expect-error
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (this.walletLocalData.otherData.accountName) {
        for (const token of this.allTokens) {
          if (this.enabledTokens.includes(token.currencyCode)) {
            const results = await this.multicastServers(
              'getCurrencyBalance',
              token.contractAddress,
              // @ts-expect-error
              this.walletLocalData.otherData.accountName
            )
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            if (results && results.length > 0) {
              for (const r of results) {
                if (typeof r === 'string') {
                  const balanceArray = r.split(' ')
                  if (balanceArray.length === 2) {
                    const exchangeAmount = balanceArray[0]
                    const currencyCode = balanceArray[1]
                    let nativeAmount = ''

                    // Convert exchange amount to native amount
                    const denom = getDenomInfo(
                      this.currencyInfo,
                      currencyCode,
                      [...this.customTokens, ...this.allTokens]
                    )
                    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain, @typescript-eslint/strict-boolean-expressions
                    if (denom != null && denom.multiplier) {
                      nativeAmount = mul(exchangeAmount, denom.multiplier)
                    } else {
                      this.log(
                        `Received balance for unsupported currencyCode: ${currencyCode}`
                      )
                    }
                    this.updateBalance(currencyCode, nativeAmount)
                  }
                }
              }
            }
          }
        }
      }
      this.updateOnAddressesChecked()
    } catch (e: any) {
      this.error(`Error fetching account: `, e)
    }
  }

  async clearBlockchainCache(): Promise<void> {
    this.activatedAccountsCache = {}
    await super.clearBlockchainCache()
    // @ts-expect-error
    this.walletLocalData.otherData.lastQueryActionSeq = {}
    // @ts-expect-error
    this.walletLocalData.otherData.highestTxHeight = {}
    // @ts-expect-error
    this.walletLocalData.otherData.accountName = ''
  }

  // ****************************************************************************
  // Public methods
  // ****************************************************************************

  // This routine is called once a wallet needs to start querying the network
  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async startEngine() {
    this.engineOn = true

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('checkBlockchainInnerLoop', BLOCKCHAIN_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('checkAccountInnerLoop', ADDRESS_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('checkTransactionsInnerLoop', TRANSACTION_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getFreshAddress(options: any): Promise<EdgeFreshAddress> {
    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (this.walletLocalData.otherData.accountName) {
      // @ts-expect-error
      return { publicAddress: this.walletLocalData.otherData.accountName }
    } else {
      // Account is not yet active. Return the publicKeys so the user can activate the account
      return {
        publicAddress: '',
        // @ts-expect-error
        publicKey: this.walletInfo.keys.publicKey,
        ownerPublicKey: this.walletInfo.keys.ownerPublicKey
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo) {
    const { edgeSpendInfo, currencyCode, nativeBalance, denom } =
      this.makeSpendCheck(edgeSpendInfoIn)
    const { defaultSettings } = this.currencyInfo
    const tokenInfo = this.getTokenInfo(currencyCode)
    if (tokenInfo == null) throw new Error('Unable to find token info')
    const { contractAddress } = tokenInfo
    const nativeDenomination = getDenomInfo(
      this.currencyInfo,
      currencyCode,
      this.allTokens
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
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (e.code.includes('ErrorUnknownAccount')) {
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
      throw new InsufficientFundsError()
    }

    const quantity =
      toFixed(exchangeAmount, nativePrecision) + ` ${currencyCode}`
    let memo = ''
    if (
      edgeSpendInfo.spendTargets[0].otherParams != null &&
      typeof edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier ===
        'string'
    ) {
      memo = edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier
    }

    const transferActions = [
      {
        account: contractAddress,
        name: 'transfer',
        authorization: [
          {
            // @ts-expect-error
            actor: this.walletLocalData.otherData.accountName,
            permission: 'active'
          }
        ],
        data: {
          // @ts-expect-error
          from: this.walletLocalData.otherData.accountName,
          to: publicAddress,
          quantity,
          memo
        }
      }
    ]
    const { fuelActions = [] } = defaultSettings.otherSettings
    const transactionJson = {
      actions: [...fuelActions, ...transferActions]
    }
    // XXX Greymass doesn't let us hit their servers too often
    // Create an unsigned transaction to catch any errors
    // await this.multicastServers('transact', transactionJson, {
    //   sign: false,
    //   broadcast: false
    // })

    nativeAmount = `-${nativeAmount}`

    // const idInternal = Buffer.from(this.io.random(32)).toString('hex')
    const edgeTransaction: EdgeTransaction = {
      txid: '', // txid
      date: 0, // date
      currencyCode, // currencyCode
      blockHeight: 0, // blockHeight
      nativeAmount, // nativeAmount
      networkFee, // networkFee
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      otherParams: {
        transactionJson
      }
    }
    this.warn(
      `${this.currencyInfo.currencyCode} tx prepared: ${nativeAmount} ${this.walletLocalData.publicKey} -> ${publicAddress}`
    )
    return edgeTransaction
  }

  // async makeSpend (edgeSpendInfo: EdgeSpendInfo) {
  //   // // Validate the spendInfo
  //   const valid = validateObject(edgeSpendInfo, MakeSpendSchema)

  //   if (!valid) {
  //     throw (new Error('Error: invalid EdgeSpendInfo'))
  //   }

  //   // TODO: Validate the number of destination targets supported by this currency.
  //   // ie. Bitcoin can do multiple targets. Ethereum only one
  //   // edgeSpendInfo.spendTargets.length

  //   // TODO: Validate for valid currencyCode which will be in
  //   // edgeSpendInfo.currencyCode if specified by user. Otherwise use native currency

  //   // TODO: Get nativeAmount which is denoted is small currency unit. ie satoshi/wei
  //   // edgeSpendInfo.spendTargets[0].nativeAmount
  //   //
  //   // Throw if this currency cannot spend a 0 amount
  //   // if (eq(nativeAmount, '0')) {
  //   //   throw (new error.NoAmountSpecifiedError())
  //   // }

  //   // TODO: Get current wallet balance and make sure there are sufficient funds including fees
  //   // const nativeBalance = this.walletLocalData.totalBalances[currencyCode]

  //   // TODO: Extract unique identifier for this transaction. This is known as a Payment ID for
  //   // Monero, Destination Tag for Ripple, and Memo ID for Stellar. Use if currency is capable
  //   // edgeSpendInfo.spendTargets[0].otherParams.uniqueIdentifier

  //   // TODO: Create an EdgeTransaction object with the following params filled out:
  //   // currencyCode
  //   // blockHeight = 0
  //   // nativeAmount (which includes fee)
  //   // networkFee (in smallest unit of currency)
  //   // ourReceiveAddresses = []
  //   // signedTx = ''
  //   // otherParams. Object declared in this currency's types.js file (ie. eosTypes.js)
  //   //  which are additional params useful for signing and broadcasting transaction
  //   const edgeTransaction: EdgeTransaction = {
  //     txid: '', // txid
  //     date: 0, // date
  //     currencyCode: '', // currencyCode
  //     blockHeight: 0, // blockHeight
  //     nativeAmount: '', // nativeAmount
  //     networkFee: '', // networkFee
  //     ourReceiveAddresses: [], // ourReceiveAddresses
  //     signedTx: '', // signedTx
  //     otherParams: {}
  //   }

  //   this.log('Payment transaction prepared...')
  //   return edgeTransaction
  // }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    // const otherParams = getOtherParams(edgeTransaction)

    // Do signing
    // Take the private key from this.walletInfo.keys.eosKey and sign the transaction
    // const privateKey = this.walletInfo.keys.eosKey
    // const keyProvider = []
    // if (this.walletInfo.keys.eosKey) {
    //   keyProvider.push(this.walletInfo.keys.eosKey)
    // }
    // if (this.walletInfo.keys.eosOwnerKey) {
    //   keyProvider.push(this.walletInfo.keys.eosOwnerKey)
    // }
    // XXX Greymass doesn't let us hit their servers too often
    // await this.multicastServers('transact', otherParams.transactionJson, {
    //   keyProvider,
    //   sign: true,
    //   broadcast: false
    // })

    // Complete edgeTransaction.txid params if possible at this state
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    const otherParams = getOtherParams(edgeTransaction)
    // Broadcast transaction and add date
    const keyProvider = []
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (this.walletInfo.keys.eosKey) {
      keyProvider.push(this.walletInfo.keys.eosKey)
    }
    // usage of eosOwnerKey must be protected by conditional
    // checking for its existence
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (this.walletInfo.keys.eosOwnerKey) {
      keyProvider.push(this.walletInfo.keys.eosOwnerKey)
    }
    try {
      const signedTx = await this.multicastServers(
        'transact',
        otherParams.transactionJson,
        {
          keyProvider,
          sign: true,
          broadcast: true
        }
      )
      edgeTransaction.date = Date.now() / 1000
      edgeTransaction.txid = signedTx.transaction_id
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
      return edgeTransaction
    } catch (e: any) {
      this.error('\nCaught exception: ', e)
      if (e instanceof RpcError) this.error(JSON.stringify(e.json, null, 2))
      let err = e
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (err.error) {
        this.error(`err.error= ${err.error}`)
        this.error(`err.error.name= ${err.error.name}`)
      }
      try {
        err = JSON.parse(e)
      } catch (e2) {
        throw e
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (err.error && err.error.name === 'tx_net_usage_exceeded') {
        err = new Error('Insufficient NET available to send EOS transaction')
        err.name = 'ErrorEosInsufficientNet'
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      } else if (err.error && err.error.name === 'tx_cpu_usage_exceeded') {
        err = new Error('Insufficient CPU available to send EOS transaction')
        err.name = 'ErrorEosInsufficientCpu'
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      } else if (err.error && err.error.name === 'ram_usage_exceeded') {
        err = new Error('Insufficient RAM available to send EOS transaction')
        err.name = 'ErrorEosInsufficientRam'
      }
      throw err
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPrivateSeed() {
    let out = ''
    // usage of eosOwnerKey must be protected by conditional
    // checking for its existence
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.walletInfo.keys && this.walletInfo.keys.eosOwnerKey) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      out += 'owner key\n' + this.walletInfo.keys.eosOwnerKey + '\n\n'
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.walletInfo.keys && this.walletInfo.keys.eosKey) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      out += 'active key\n' + this.walletInfo.keys.eosKey + '\n\n'
    }
    return out
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPublicSeed() {
    let out = ''
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.walletInfo.keys && this.walletInfo.keys.ownerPublicKey) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      out += 'owner publicKey\n' + this.walletInfo.keys.ownerPublicKey + '\n\n'
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
    if (this.walletInfo.keys && this.walletInfo.keys.publicKey) {
      // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
      out += 'active publicKey\n' + this.walletInfo.keys.publicKey + '\n\n'
    }
    return out
  }
}
