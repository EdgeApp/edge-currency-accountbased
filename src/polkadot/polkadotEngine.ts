import { abs, add, div, gt, lte, mul, sub } from 'biggystring'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'

import { CurrencyEngine } from '../common/engine'
import { PluginEnvironment } from '../common/innerPlugin'
import {
  cleanTxLogs,
  decimalToHex,
  getDenomInfo,
  getOtherParams,
  makeMutex
} from '../common/utils'
import { PolkadotTools } from './polkadotPlugin'
import {
  asSubscanResponse,
  asTransactions,
  asTransfer,
  PolkadotSettings,
  SdkBalance,
  SdkBlockHeight,
  SdkPaymentInfo,
  SubscanResponse,
  SubscanTx
} from './polkadotTypes'
import { ApiPromise, Keyring } from './polkadotUtils'

const ACCOUNT_POLL_MILLISECONDS = 5000
const BLOCKCHAIN_POLL_MILLISECONDS = 20000
const TRANSACTION_POLL_MILLISECONDS = 3000

const queryTxMutex = makeMutex()

export class PolkadotEngine extends CurrencyEngine<PolkadotTools> {
  settings: PolkadotSettings
  api!: ApiPromise
  keypair: Keyring | undefined
  nonce: number

  constructor(
    tools: PolkadotTools,
    walletInfo: EdgeWalletInfo,
    opts: any // EdgeCurrencyEngineOptions,
  ) {
    super(tools, walletInfo, opts)
    this.settings = tools.currencyInfo.defaultSettings.otherSettings
    this.nonce = 0
  }

  async fetchSubscan(
    endpoint: string,
    body: JsonObject
  ): Promise<SubscanResponse> {
    const options = {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
    const response = await this.io.fetch(
      this.settings.subscanBaseUrl + endpoint,
      options
    )
    if (!response.ok || response.status === 429) {
      throw new Error(`Subscan ${endpoint} failed with ${response.status}`)
    }
    const out = await response.json()
    return asSubscanResponse(out)
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async queryBalance() {
    try {
      // @ts-expect-error
      const response: SdkBalance = await this.api.query.system.account(
        this.walletInfo.keys.publicKey
      )
      this.nonce = response.nonce
      this.updateBalance(
        this.currencyInfo.currencyCode,
        response.data.free.toString()
      )
    } catch (e: any) {
      this.warn('queryBalance failed with error: ', e)
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async queryBlockheight() {
    try {
      // @ts-expect-error
      const response: SdkBlockHeight = await this.api.rpc.chain.getBlock()
      const height = response.block.header.number
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  processPolkadotTransaction(tx: SubscanTx) {
    const {
      from,
      to,
      success,
      hash,
      block_num: blockHeight,
      block_timestamp: date,
      module,
      amount, // large denomination
      fee // small denomination
    } = tx

    // Skip unsuccessful and irrelevant transactions
    if (!success || module !== 'balances') return

    const denom = getDenomInfo(
      this.currencyInfo,
      this.currencyInfo.currencyCode
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
      txid: hash,
      date,
      currencyCode: this.currencyInfo.currencyCode,
      blockHeight,
      nativeAmount: nativeAmount,
      networkFee: fee,
      ourReceiveAddresses,
      signedTx: ''
    }
    this.addTransaction(this.currencyInfo.currencyCode, edgeTransaction)
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async queryTransactions() {
    return await queryTxMutex(async () => await this.queryTransactionsInner())
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async queryTransactionsInner() {
    // Skip pages we don't need
    let page = Math.floor(
      this.otherData.txCount / this.settings.subscanQueryLimit
    )

    while (true) {
      const payload = {
        row: this.settings.subscanQueryLimit,
        page,
        address: this.walletInfo.keys.publicKey
      }

      let count = 0
      let transfers = []
      try {
        const response = await this.fetchSubscan('/scan/transfers', payload)
        const cleanResponse = asTransactions(response.data)
        count = cleanResponse.count
        transfers = cleanResponse.transfers
      } catch (e: any) {
        if (
          typeof e?.message === 'string' &&
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          e.message.includes('Subscan /scan/transfers failed with 429')
        ) {
          this.log(e.message)
          continue
        } else {
          throw e
        }
      }

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
        page * this.settings.subscanQueryLimit + transfers.length

      this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] =
        count === 0 ? 1 : this.otherData.txCount / count
      this.updateOnAddressesChecked()

      // count is the total number of transactions ever for an account
      // If we've already seen all the transfers we don't need to bother processing or page through older ones
      if (count === this.otherData.txCount) break

      page++
    }

    if (this.transactionsChangedArray.length > 0) {
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  initOtherData() {
    if (this.otherData.txCount == null) {
      this.otherData.txCount = 0
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async startEngine() {
    this.engineOn = true
    await this.tools.connectApi(this.walletId)
    // @ts-expect-error
    this.api = this.tools.polkadotApi
    this.initOtherData()
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    super.startEngine()
  }

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  async killEngine() {
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

    const balance = this.getBalance({
      currencyCode: spendInfo.currencyCode
    })
    const spendableBalance = sub(balance, this.settings.existentialDeposit)

    const tempSpendTarget = [
      {
        publicAddress: spendInfo.spendTargets[0].publicAddress,
        nativeAmount: '0'
      }
    ]
    const maxSpendInfo = { ...spendInfo, spendTargets: tempSpendTarget }
    const tx = await this.makeSpend(maxSpendInfo)
    const fee = tx.networkFee

    // @ts-expect-error
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    const getMax = (min, max) => {
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
        this.settings.lengthFeePerByte
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

    if (edgeSpendInfo.spendTargets.length !== 1) {
      throw new Error('Error: only one output allowed')
    }
    const { nativeAmount, publicAddress } = edgeSpendInfo.spendTargets[0]

    if (publicAddress == null)
      throw new Error('makeSpend Missing publicAddress')
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    const balance = this.getBalance({
      currencyCode: this.currencyInfo.currencyCode
    })
    const spendableBalance = sub(balance, this.settings.existentialDeposit)

    if (gt(nativeAmount, spendableBalance)) {
      throw new InsufficientFundsError()
    }

    const transfer = await this.api.tx.balances.transferKeepAlive(
      publicAddress,
      nativeAmount
    )

    // @ts-expect-error
    const paymentInfo: SdkPaymentInfo = await transfer.paymentInfo(
      this.walletInfo.keys.publicKey
    )

    // The fee returned from partial fee is always off by the length fee, because reasons
    const nativeNetworkFee = sub(
      paymentInfo.partialFee.toString(),
      this.settings.lengthFeePerByte
    )

    const totalTxAmount = add(nativeAmount, nativeNetworkFee)
    if (gt(totalTxAmount, spendableBalance)) {
      throw new InsufficientFundsError()
    }

    const otherParams: JsonObject = {
      publicAddress
    }

    // **********************************
    // Create the unsigned EdgeTransaction
    const edgeTransaction: EdgeTransaction = {
      txid: '',
      date: 0,
      currencyCode,
      blockHeight: 0,
      nativeAmount: mul(totalTxAmount, '-1'),
      networkFee: nativeNetworkFee,
      ourReceiveAddresses: [],
      signedTx: '',
      otherParams
    }

    return edgeTransaction
  }

  async signTx(edgeTransaction: EdgeTransaction): Promise<EdgeTransaction> {
    const { publicAddress } = getOtherParams(edgeTransaction)
    if (publicAddress == null)
      throw new Error('Missing publicAddress from makeSpend')

    const nativeAmount = abs(
      add(edgeTransaction.nativeAmount, edgeTransaction.networkFee)
    )

    // The SDK doesn't support serializable transactions so we need to recreate it
    const transfer = await this.api.tx.balances.transferKeepAlive(
      publicAddress,
      nativeAmount
    )

    if (this.keypair == null) {
      const keyring = new Keyring({ ss58Format: 0 })
      // @ts-expect-error
      this.keypair = keyring.addFromUri(
        this.walletInfo.keys[`${this.currencyInfo.pluginId}Mnemonic`]
      )
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

    // @ts-expect-error
    const signedPayload = extrinsicPayload.sign(this.keypair)

    transfer.addSignature(
      // @ts-expect-error
      this.keypair.address,
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

  // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
  getDisplayPrivateSeed() {
    if (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/prefer-optional-chain
      this.walletInfo.keys &&
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      this.walletInfo.keys[`${this.currencyInfo.pluginId}Mnemonic`]
    ) {
      return this.walletInfo.keys[`${this.currencyInfo.pluginId}Mnemonic`]
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
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<{}>,
  tools: PolkadotTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const engine = new PolkadotEngine(tools, walletInfo, opts)

  // Do any async initialization necessary for the engine
  await engine.loadEngine(tools, walletInfo, opts)

  // This is just to make sure otherData is Flow checked
  engine.otherData = engine.walletLocalData.otherData

  return engine
}
