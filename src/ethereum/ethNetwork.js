import { bns } from 'biggystring'
import type { EdgeTransaction } from 'edge-core-js/src/types/types'

import { snooze, validateObject } from '../common/utils'
import { EthereumEngine } from './ethEngine'
import { currencyInfo } from './ethInfo'
import {
  EtherscanGetAccountBalance,
  EtherscanGetAccountNonce,
  EtherscanGetBlockHeight,
  EtherscanGetTokenTransactions,
  EtherscanGetTransactions
} from './ethSchema'

const BLOCKHEIGHT_POLL_MILLISECONDS = 20000
const NONCE_POLL_MILLISECONDS = 20000
const BAL_POLL_MILLISECONDS = 20000
const TXS_POLL_MILLISECONDS = 20000

const ADDRESS_QUERY_LOOKBACK_BLOCKS = 4 * 60 * 24 * 7 // ~ one week
const NUM_TRANSACTIONS_TO_QUERY = 50
const PRIMARY_CURRENCY = currencyInfo.currencyCode

type EthereumNeeds = {
  blockHeightLastChecked: number,
  nonceLastChecked: number,
  ethBalLastChecked: number,
  ethTxsLastChecked: number,
  tokenBalLastChecked: { [currencyCode: string]: number },
  tokenTxsLastChecked: { [currencyCode: string]: number }
}

type EdgeTransactionsBlockHeightTuple = {
  blockHeight: number,
  edgeTransactions: Array<EdgeTransaction>
}

type EthereumNetworkUpdate = {
  blockHeight?: number,
  nonce?: number,
  ethBal?: string,
  ethTxs?: EdgeTransactionsBlockHeightTuple,
  tokenBal?: { [currencyCode: string]: string },
  tokenTxs?: { [currencyCode: string]: EdgeTransactionsBlockHeightTuple }
}

export class EthereumNetwork {
  ethNeeds: EthereumNeeds
  constructor(ethEngine: EthereumEngine) {
    this.ethEngine = ethEngine
    this.ethNeeds = {
      blockHeightLastChecked: 0,
      nonceLastChecked: 0,
      ethBalLastChecked: 0,
      ethTxsLastChecked: 0,
      tokenBalLastChecked: {},
      tokenTxsLastChecked: {}
    }

    this.checkBlockHeight = this.checkBlockHeight.bind(this)
    this.checkNonce = this.checkNonce.bind(this)
    this.checkEthBal = this.checkEthBal.bind(this)
    this.checkTxs = this.checkTxs.bind(this)
    this.checkTokenBal = this.checkTokenBal.bind(this)
    this.checkAndUpdate = this.checkAndUpdate.bind(this)
    this.needsLoop = this.needsLoop.bind(this)
    this.processEthereumNetworkUpdate = this.processEthereumNetworkUpdate.bind(
      this
    )
  }

  async checkBlockHeight(): Promise<EthereumNetworkUpdate> {
    try {
      const jsonObj = await this.ethEngine.multicastServers('eth_blockNumber')
      const valid = validateObject(jsonObj, EtherscanGetBlockHeight)
      if (valid) {
        const blockHeight = parseInt(jsonObj.result, 16)
        return { blockHeight }
      }
    } catch (err) {
      this.ethEngine.log('Error fetching height: ' + err)
    }
  }

  async checkNonce(): Promise<EthereumNetworkUpdate> {
    try {
      const address = this.ethEngine.walletLocalData.publicKey
      const jsonObj = await this.ethEngine.multicastServers(
        'eth_getTransactionCount',
        address
      )
      const valid = validateObject(jsonObj, EtherscanGetAccountNonce)
      if (valid) {
        const nonce = bns.add('0', jsonObj.result)
        return { nonce }
      }
    } catch (err) {
      this.ethEngine.log('Error fetching height: ' + err)
    }
  }

  async checkEthBal(): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    try {
      const jsonObj = await this.ethEngine.multicastServers(
        'eth_getBalance',
        address
      )
      const valid = validateObject(jsonObj, EtherscanGetAccountBalance)
      if (valid) {
        const balance = jsonObj.result
        return { ethBal: balance }
      }
    } catch (e) {
      this.ethEngine.log(`Error checking token balance: ETH`)
    }
  }

  async checkTxs(
    startBlock: number,
    currencyCode: string
  ): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    let page = 1
    let contractAddress = ''
    let schema

    if (currencyCode !== PRIMARY_CURRENCY) {
      const tokenInfo = this.ethEngine.getTokenInfo(currencyCode)
      if (tokenInfo && typeof tokenInfo.contractAddress === 'string') {
        contractAddress = tokenInfo.contractAddress
        schema = EtherscanGetTokenTransactions
      } else {
        return false
      }
    } else {
      schema = EtherscanGetTransactions
    }

    const allTransactions = []
    try {
      while (1) {
        const offset = NUM_TRANSACTIONS_TO_QUERY
        const jsonObj = await this.ethEngine.multicastServers(
          'getTransactions',
          {
            currencyCode,
            address,
            startBlock,
            page,
            offset,
            contractAddress
          }
        )
        const valid = validateObject(jsonObj, schema)
        if (valid) {
          const transactions = jsonObj.result
          for (let i = 0; i < transactions.length; i++) {
            const tx = this.ethEngine.processEtherscanTransaction(
              transactions[i],
              currencyCode
            )
            allTransactions.push(tx)
          }
          if (transactions.length < NUM_TRANSACTIONS_TO_QUERY) {
            break
          }
          page++
        } else {
          break
        }
      }
    } catch (e) {
      this.ethEngine.log(
        `Error checkTransactionsFetch ETH: ${this.ethEngine.walletLocalData.publicKey}`,
        e
      )
    }

    const edgeTransactionsBlockHeightTuple: EdgeTransactionsBlockHeightTuple = {
      blockHeight: startBlock,
      edgeTransactions: allTransactions
    }
    if (currencyCode !== PRIMARY_CURRENCY) {
      return { tokenTxs: { [currencyCode]: edgeTransactionsBlockHeightTuple } }
    } else {
      return { ethTxs: edgeTransactionsBlockHeightTuple }
    }
  }

  async checkTokenBal(tk: string): Promise<EthereumNetworkUpdate> {
    const address = this.ethEngine.walletLocalData.publicKey
    const tokenInfo = this.ethEngine.getTokenInfo(tk)
    const contractAddress = tokenInfo.contractAddress
    let jsonObj = {}
    let valid = false

    try {
      jsonObj = await this.ethEngine.multicastServers(
        'getTokenBalance',
        address,
        contractAddress
      )
      valid = validateObject(jsonObj, EtherscanGetAccountBalance)
      if (valid) {
        const balance = jsonObj.result
        return { tokenBal: { [tk]: balance } }
      }
    } catch (e) {
      this.ethEngine.log(`Error checking token balance: ${tk}`)
    }
  }

  async checkAndUpdate(
    lastChecked: number,
    pollMillisec: number,
    checkFunc: () => EthereumNetworkUpdate
  ) {
    const now = Date.now()
    if (now - lastChecked > pollMillisec) {
      const ethUpdate = await checkFunc()
      this.processEthereumNetworkUpdate(now, ethUpdate)
    }
  }

  async needsLoop(): Promise<void> {
    // Init token times
    for (const tk of this.ethEngine.walletLocalData.enabledTokens) {
      this.ethNeeds.tokenBalLastChecked[tk] = 0
      this.ethNeeds.tokenTxsLastChecked[tk] = 0
    }
    while (this.ethEngine.engineOn) {
      let startBlock: number = 0

      if (
        this.ethEngine.walletLocalData.lastAddressQueryHeight >
        ADDRESS_QUERY_LOOKBACK_BLOCKS
      ) {
        // Only query for transactions as far back as ADDRESS_QUERY_LOOKBACK_BLOCKS from the last time we queried transactions
        startBlock =
          this.ethEngine.walletLocalData.lastAddressQueryHeight -
          ADDRESS_QUERY_LOOKBACK_BLOCKS
      }

      await this.checkAndUpdate(
        this.ethNeeds.blockHeightLastChecked,
        BLOCKHEIGHT_POLL_MILLISECONDS,
        this.checkBlockHeight
      )

      await this.checkAndUpdate(
        this.ethNeeds.nonceLastChecked,
        NONCE_POLL_MILLISECONDS,
        this.checkNonce
      )

      await this.checkAndUpdate(
        this.ethNeeds.ethBalLastChecked,
        BAL_POLL_MILLISECONDS,
        this.checkEthBal
      )

      await this.checkAndUpdate(
        this.ethNeeds.ethTxsLastChecked,
        TXS_POLL_MILLISECONDS,
        async () => this.checkTxs(startBlock, 'ETH')
      )

      for (const tk of this.ethEngine.walletLocalData.enabledTokens) {
        if (tk !== 'ETH') {
          await this.checkAndUpdate(
            this.ethNeeds.tokenBalLastChecked[tk],
            BAL_POLL_MILLISECONDS,
            async () => this.checkTokenBal(tk)
          )

          await this.checkAndUpdate(
            this.ethNeeds.tokenTxsLastChecked[tk],
            TXS_POLL_MILLISECONDS,
            async () => this.checkTxs(startBlock, tk)
          )
        }
      }

      await snooze(1000)
    }
  }

  processEthereumNetworkUpdate(
    now: number,
    ethereumNetworkUpdate: EthereumNetworkUpdate
  ) {
    const preUpdateBlockHeight = this.ethEngine.walletLocalData.blockHeight
    if (ethereumNetworkUpdate.blockHeight) {
      const blockHeight = ethereumNetworkUpdate.blockHeight
      this.ethEngine.log(`Got block height ${blockHeight}`)
      if (this.ethEngine.walletLocalData.blockHeight !== blockHeight) {
        this.ethNeeds.blockHeightLastChecked = now
        this.ethEngine.checkDroppedTransactionsThrottled()
        this.ethEngine.walletLocalData.blockHeight = blockHeight // Convert to decimal
        this.ethEngine.walletLocalDataDirty = true
        this.ethEngine.currencyEngineCallbacks.onBlockHeightChanged(
          this.ethEngine.walletLocalData.blockHeight
        )
      }
    }

    if (ethereumNetworkUpdate.nonce) {
      this.ethNeeds.nonceLastChecked = now
      this.ethEngine.walletLocalData.otherData.nextNonce =
        ethereumNetworkUpdate.nonce
      this.ethEngine.walletLocalDataDirty = true
    }

    if (ethereumNetworkUpdate.ethBal) {
      this.ethNeeds.ethBalLastChecked = now
      this.ethEngine.updateBalance('ETH', ethereumNetworkUpdate.ethBal)
    }

    if (ethereumNetworkUpdate.ethTxs) {
      this.ethNeeds.ethTxsLastChecked = now
      this.ethEngine.tokenCheckTransactionsStatus.ETH = 1
      for (const tuple: EdgeTransactionsBlockHeightTuple of ethereumNetworkUpdate.ethTxs) {
        if (tuple.edgeTransactions) {
          this.ethEngine.addTransaction('ETH', tuple.edgeTransactions)
        }
      }
      this.ethEngine.updateOnAddressesChecked()
    }

    if (ethereumNetworkUpdate.tokenBal) {
      for (const tk of Object.keys(ethereumNetworkUpdate.tokenBal)) {
        this.ethNeeds.tokenBalLastChecked[tk] = now
        this.ethEngine.updateBalance(tk, ethereumNetworkUpdate.tokenBal[tk])
      }
    }

    if (ethereumNetworkUpdate.tokenTxs) {
      for (const tk of Object.keys(ethereumNetworkUpdate.tokenTxs)) {
        this.ethNeeds.tokenTxsLastChecked[tk] = now
        this.ethEngine.tokenCheckTransactionsStatus[tk] = 1
        for (const tuple: EdgeTransactionsBlockHeightTuple of ethereumNetworkUpdate
          .tokenTxs[tk]) {
          if (tuple.edgeTransactions) {
            this.ethEngine.addTransaction(tk, tuple.edgeTransactions)
          }
        }
      }
      this.ethEngine.updateOnAddressesChecked()
    }

    let successCount = 0
    for (const currencyCode of this.ethEngine.walletLocalData.enabledTokens) {
      if (currencyCode !== PRIMARY_CURRENCY) {
        if (this.ethNeeds.ethTxsLastChecked < TXS_POLL_MILLISECONDS) {
          successCount++
        }
      } else {
        if (
          this.ethNeeds.tokenTxsLastChecked[currencyCode] <
          TXS_POLL_MILLISECONDS
        ) {
          successCount++
        }
      }
    }
    if (successCount === this.ethEngine.walletLocalData.enabledTokens.length) {
      this.ethEngine.walletLocalData.lastAddressQueryHeight = preUpdateBlockHeight
    }
    if (this.ethEngine.transactionsChangedArray.length > 0) {
      this.ethEngine.currencyEngineCallbacks.onTransactionsChanged(
        this.ethEngine.transactionsChangedArray
      )
      this.ethEngine.transactionsChangedArray = []
    }
  }
}
