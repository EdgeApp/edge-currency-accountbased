import { eq } from 'biggystring'
import { asMaybe } from 'cleaners'
import {
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeLog,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine'
import {
  asyncWaterfall,
  hexToDecimal,
  padHex,
  shuffleArray
} from '../common/utils'
import { TronTools } from './tronPlugin'
import {
  asAccountResources,
  asTRC20Balance,
  asTronBlockHeight,
  asTRXBalance,
  ReferenceBlock,
  TronAccountResources
} from './tronTypes'
import { base58ToHexAddress } from './tronUtils'

const ACCOUNT_POLL_MILLISECONDS = 20000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000
const NETWORKFEES_POLL_MILLISECONDS = 60 * 10 * 1000

type TronFunction =
  | 'trx_blockNumber'
  | 'trx_getAccountResource'
  | 'trx_getBalance'

export class TronEngine extends CurrencyEngine<TronTools> {
  fetchCors: EdgeFetchFunction
  log: EdgeLog
  recentBlock: ReferenceBlock
  accountResources: TronAccountResources

  constructor(
    currencyPlugin: TronTools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions,
    fetchCors: EdgeFetchFunction
  ) {
    super(currencyPlugin, walletInfo, opts)
    this.fetchCors = fetchCors
    this.log = opts.log
    this.recentBlock = {
      hash: '0',
      number: 0,
      timestamp: 0
    }
    this.accountResources = {
      bandwidth: 0,
      energy: 0
    }
  }

  async fetch(
    server: string,
    path: string,
    opts: Object = {}
  ): Promise<{ server: string; result: Object }> {
    const url = server + path
    const response = await this.fetchCors(url, opts)
    if (!response.ok || response.status !== 200) {
      this.log(`The server returned error code ${response.status} for ${url}`)
      throw new Error(
        `The server returned error code ${response.status} for ${url}`
      )
    }
    const result = await response.json()
    if (typeof result !== 'object') {
      const msg = `Invalid return value ${path} in ${server}`
      this.log(msg)
      throw new Error(msg)
    }
    return { server, result }
  }

  async checkBlockchainInnerLoop(): Promise<void> {
    try {
      const res = await this.multicastServers(
        'trx_blockNumber',
        '/wallet/getnowblock'
      )
      const json = asTronBlockHeight(res)

      const blockHeight: number = json.block_header.raw_data.number

      Object.assign(this.recentBlock, {
        hash: json.blockID,
        number: blockHeight,
        timestamp: json.block_header.raw_data.timestamp
      })

      if (this.walletLocalData.blockHeight !== blockHeight) {
        this.checkDroppedTransactionsThrottled()
        this.walletLocalData.blockHeight = blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
    } catch (e: any) {
      this.log.error(`Error fetching height: `, e)
    }
  }

  updateBalance(tk: string, balance: string): void {
    if (typeof this.walletLocalData.totalBalances[tk] === 'undefined') {
      this.walletLocalData.totalBalances[tk] = '0'
    }
    if (!eq(balance, this.walletLocalData.totalBalances[tk])) {
      this.walletLocalData.totalBalances[tk] = balance
      this.log(tk + ': token Address balance: ' + balance)
      this.currencyEngineCallbacks.onBalanceChanged(tk, balance)
    }
    this.tokenCheckBalanceStatus[tk] = 1
    this.updateOnAddressesChecked()
  }

  async checkTokenBalances(): Promise<void> {
    const address = base58ToHexAddress(this.walletLocalData.publicKey)

    for (const currencyCode of this.enabledTokens) {
      const metaToken = this.allTokens.find(
        token => token.currencyCode === currencyCode
      )
      if (metaToken?.contractAddress == null) continue
      const contractAddressHex = base58ToHexAddress(metaToken.contractAddress)
      const body = {
        contract_address: contractAddressHex,
        function_selector: 'balanceOf(address)',
        parameter: padHex(address, 32),
        owner_address: address
      }

      try {
        const res = await this.multicastServers(
          'trx_getBalance',
          '/wallet/triggerconstantcontract',
          body
        )

        const balance = asTRC20Balance(res)

        if (metaToken != null) {
          this.updateBalance(
            metaToken.currencyCode,
            hexToDecimal(balance.constant_result[0])
          )
        }
      } catch (e) {
        this.log.error(`Failed to get balance of ${currencyCode}`, e)
      }
    }
  }

  async checkAccountInnerLoop(): Promise<void> {
    const body = { address: base58ToHexAddress(this.walletLocalData.publicKey) }
    try {
      const res = await this.multicastServers(
        'trx_getBalance',
        '/wallet/getaccount',
        body
      )
      const balances = asMaybe(asTRXBalance)(res)

      if (balances != null) {
        this.updateBalance(
          this.currencyInfo.currencyCode,
          balances.balance.toString()
        )
      } else if (typeof res === 'object' && Object.keys(res).length === 0) {
        // New accounts return an empty {} response
        this.updateBalance(this.currencyInfo.currencyCode, '0')
      }
    } catch (e: any) {
      this.log.error('Error checking TRX address balance: ', e)
    }

    try {
      const res = await this.multicastServers(
        'trx_getAccountResource',
        '/wallet/getaccountresource',
        body
      )
      const resources = asAccountResources(res)

      this.accountResources = {
        bandwidth: resources.freeNetLimit,
        energy: resources.EnergyLimit
      }
    } catch (e: any) {
      this.log.error('Error checking TRX address resources: ', e)
    }
  }

  async queryTransactions(): Promise<void> {
    throw new Error('Must implement queryTransactions')
  }

  async checkUpdateNetworkFees(): Promise<void> {
    throw new Error('Must implement checkUpdateNetworkFees')
  }

  async multicastServers(
    func: TronFunction,
    path: string,
    body: JsonObject = {}
  ): Promise<any> {
    let out = { result: '', server: 'no server' }
    let funcs: Array<() => Promise<any>> = []

    switch (func) {
      case 'trx_blockNumber':
      case 'trx_getAccountResource':
      case 'trx_getBalance':
        funcs =
          this.currencyInfo.defaultSettings.otherSettings.tronNodeServers.map(
            (server: string) => async () => {
              const opts = {
                method: 'POST',
                headers: {
                  Accept: 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
              }
              return await this.fetch(server, path, opts)
            }
          )
        break
    }

    // Randomize array
    funcs = shuffleArray(funcs)
    out = await asyncWaterfall(funcs)
    this.log(`TRX multicastServers ${func} ${out.server} won`)
    return out.result
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.addToLoop(
      'checkBlockchainInnerLoop',
      BLOCKCHAIN_POLL_MILLISECONDS
    ).catch(() => {})
    this.addToLoop('checkAccountInnerLoop', ACCOUNT_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('checkTokenBalances', ACCOUNT_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop(
      'checkUpdateNetworkFees',
      NETWORKFEES_POLL_MILLISECONDS
    ).catch(() => {})
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS).catch(
      () => {}
    )
    super.startEngine().catch(() => {})
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  async getMaxSpendable(spendInfo: EdgeSpendInfo): Promise<string> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    throw new Error('Must implement checkBlockchainInnerLoop')
  }

  getDisplayPrivateSeed(): string {
    return this.walletInfo.keys?.tronMnemonic ?? this.walletInfo.keys?.tronKey
  }

  getDisplayPublicSeed(): string {
    return this.walletInfo.keys?.publicKey ?? ''
  }
}

export { CurrencyEngine }
