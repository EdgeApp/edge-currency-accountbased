import * as Cardano from '@emurgo/cardano-serialization-lib-nodejs'
import { add, mul, sub } from 'biggystring'
import { asJSON, asString, asTuple } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
  EdgeFetchOptions,
  EdgeFreshAddress,
  EdgeSpendInfo,
  EdgeTokenId,
  EdgeTransaction,
  EdgeWalletInfo,
  InsufficientFundsError,
  JsonObject,
  NoAmountSpecifiedError
} from 'edge-core-js/types'
import { base16 } from 'rfc4648'

import { CurrencyEngine } from '../common/CurrencyEngine'
import { PluginEnvironment } from '../common/innerPlugin'
import { getRandomDelayMs } from '../common/network'
import { formatAggregateError, promiseAny } from '../common/promiseUtils'
import { trial } from '../common/trial'
import { cleanTxLogs, getFetchCors } from '../common/utils'
import { asStakingTxBody } from './asStakingTx'
import { CardanoTools } from './CardanoTools'
import {
  asCardanoInitOptions,
  asCardanoPrivateKeys,
  asCardanoTxOtherParams,
  asCardanoWalletOtherData,
  asKoiosAddressTransactions,
  asKoiosBalance,
  asKoiosBlockheight,
  asKoiosNetworkParameters,
  asKoiosTransactionsRes,
  asSafeCardanoWalletInfo,
  CardanoInitOptions,
  CardanoNetworkInfo,
  CardanoTxOtherParams,
  CardanoWalletOtherData,
  KoiosNetworkTx,
  KoiosUtxo,
  SafeCardanoWalletInfo
} from './cardanoTypes'

const ACCOUNT_POLL_MILLISECONDS = getRandomDelayMs(20000)
const BLOCKCHAIN_POLL_MILLISECONDS = getRandomDelayMs(20000)
const TRANSACTION_POLL_MILLISECONDS = getRandomDelayMs(20000)

export class CardanoEngine extends CurrencyEngine<
  CardanoTools,
  SafeCardanoWalletInfo
> {
  fetchCors: EdgeFetchFunction
  networkInfo: CardanoNetworkInfo
  otherData!: CardanoWalletOtherData
  initOptions: CardanoInitOptions
  epochNumber: number
  slot: number
  // All tx output seen:
  seenVouts: Set<string> = new Set()
  // Only unspent:
  utxos: KoiosUtxo[] = []

  constructor(
    env: PluginEnvironment<CardanoNetworkInfo>,
    tools: CardanoTools,
    walletInfo: SafeCardanoWalletInfo,
    initOptions: JsonObject,
    opts: EdgeCurrencyEngineOptions
  ) {
    super(env, tools, walletInfo, opts)
    this.fetchCors = getFetchCors(env.io)
    this.initOptions = asCardanoInitOptions(initOptions)
    this.networkInfo = env.networkInfo
    this.epochNumber = -1
    this.slot = -1
  }

  setOtherData(_raw: any): void {
    this.otherData = asCardanoWalletOtherData(_raw)
  }

  async fetchKoios(
    method: string,
    opts: EdgeFetchOptions = {},
    authenticated: boolean = false
  ): Promise<unknown> {
    const res = await this.fetchCors(
      `${this.networkInfo.koiosServer}/api/v1/${method}`,
      {
        ...opts,
        headers: {
          ...opts.headers,
          ...(authenticated
            ? { Authorization: `Bearer ${this.initOptions.koiosApiKey}` }
            : {})
        }
      }
    )
    if (res.status === 429 && !authenticated) {
      return await this.fetchKoios(method, opts, true)
    }
    if (!res.ok) {
      const message = await res.text()
      throw new Error(`Koios error: ${message}`)
    }
    return await res.json()
  }

  async fetchPostKoios(method: string, body: JsonObject): Promise<unknown> {
    const opts = {
      method: 'POST',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify(body)
    }
    const json = await this.fetchKoios(method, opts)
    return json
  }

  async multiBroadcast(signedTx: Uint8Array): Promise<string> {
    const opts = {
      method: 'POST',
      headers: {
        'content-type': 'application/cbor'
      },
      body: signedTx
    }
    const broadcast = async (
      name: string,
      url: string,
      headers: JsonObject
    ): Promise<string> => {
      const res = await this.fetchCors(url, {
        ...opts,
        headers: { ...opts.headers, ...headers }
      })
      const response = await res.text()
      if (!res.ok) {
        throw new Error(`${name} error: ${response}`)
      }
      this.log.warn(`${name} broadcast success`)
      return response
    }

    const koios = async (): Promise<string> => {
      if (this.initOptions.koiosApiKey == null) {
        throw new Error('Missing koiosApiKey')
      }
      const headers = {
        Authorization: `Bearer ${this.initOptions.koiosApiKey}`
      }
      return asJSON(asString)(
        await broadcast(
          'Koios',
          `${this.networkInfo.koiosServer}/api/v1/submittx`,
          headers
        )
      )
    }
    const blockfrost = async (): Promise<string> => {
      if (this.initOptions.blockfrostProjectId == null) {
        throw new Error('Missing blockfrostProjectId')
      }
      const headers = {
        project_id: `${this.initOptions.blockfrostProjectId}`
      }
      return asJSON(asString)(
        await broadcast(
          'Blockfrost',
          `${this.networkInfo.blockfrostServer}/api/v0/tx/submit`,
          headers
        )
      )
    }
    const maestro = async (): Promise<string> => {
      if (this.initOptions.maestroApiKey == null) {
        throw new Error('Missing maestroApiKey')
      }
      const headers = {
        'api-key': `${this.initOptions.maestroApiKey}`
      }
      return await broadcast(
        'Maestro',
        `${this.networkInfo.maestroServer}/v1/txmanager`,
        headers
      )
    }

    return await formatAggregateError(
      promiseAny([blockfrost(), koios(), maestro()]),
      'Broadcast failed:'
    )
  }

  async queryBlockheight(): Promise<void> {
    try {
      const raw = await this.fetchKoios('tip')
      const clean = asKoiosBlockheight(raw)[0]
      const {
        abs_slot: absSlot,
        block_no: blockHeight,
        epoch_no: epochNumber
      } = clean

      if (blockHeight > this.walletLocalData.blockHeight) {
        this.walletLocalData.blockHeight = blockHeight
        this.walletLocalDataDirty = true
        this.currencyEngineCallbacks.onBlockHeightChanged(
          this.walletLocalData.blockHeight
        )
      }
      this.epochNumber = epochNumber
      this.slot = absSlot

      if (this.tools.epochParams?.epoch_no !== this.epochNumber) {
        const rawNetworkParams = await this.fetchKoios(
          `epoch_params?_epoch_no=${this.epochNumber}`
        )
        const cleanNetworkParams = asTuple(asKoiosNetworkParameters)(
          rawNetworkParams
        )
        this.tools.epochParams = cleanNetworkParams[0]
      }
    } catch (e) {
      this.log.warn('queryBlockheight error: ', e)
    }
  }

  async queryBalance(): Promise<void> {
    try {
      const raw = await this.fetchPostKoios('address_info', {
        _addresses: [this.walletInfo.keys.bech32Address]
      })
      const clean = asKoiosBalance(raw)

      // Merge unseen utxos into wallet state:
      const networkUtxos = clean[0]?.utxo_set ?? []
      for (const utxo of networkUtxos) {
        this.addUnseenUtxo(utxo)
      }

      // Network balance may be out of date, so we'll calculate it from utxos:
      this.updateBalanceFromUtxos(this.currencyInfo.currencyCode)
    } catch (e) {
      this.log.warn('queryBalance error: ', e)
    }
  }

  async queryTransactions(): Promise<void> {
    let latestQueryTransactionsBlockHeight =
      this.otherData.latestQueryTransactionsBlockHeight
    let latestQueryTransactionsTxid = this.otherData.latestQueryTransactionsTxid
    const infoNeededTxids: string[] = []
    while (true) {
      // Will return up to 1000 results
      const rawTxidList = await this.fetchPostKoios('address_txs', {
        _addresses: [this.walletInfo.keys.bech32Address],
        _after_block_height: latestQueryTransactionsBlockHeight // return value includes block height
      })
      const cleanTxidList = asKoiosAddressTransactions(rawTxidList)

      const newestTxInList = cleanTxidList[0]
      if (
        newestTxInList == null ||
        newestTxInList.tx_hash === latestQueryTransactionsTxid
      ) {
        break
      }

      const txids = cleanTxidList
        .filter(tx => tx.block_height >= latestQueryTransactionsBlockHeight)
        .reverse()
        .map(tx => {
          latestQueryTransactionsBlockHeight = tx.block_height
          latestQueryTransactionsTxid = tx.tx_hash
          return tx.tx_hash
        })
      infoNeededTxids.push(...txids)
      if (txids.length === 0) {
        break
      }
    }

    const progressTotal = infoNeededTxids.length
    let progressCurrent = 0
    const countPerPage = 25
    while (infoNeededTxids.length > 0) {
      const rawTxInfos = await this.fetchPostKoios(`tx_info`, {
        _inputs: true,
        _tx_hashes: infoNeededTxids.splice(0, countPerPage)
      })
      const txs = asKoiosTransactionsRes(rawTxInfos)

      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i]
        const edgeTx = processCardanoTransaction({
          currencyCode: this.currencyInfo.currencyCode,
          address: this.walletInfo.keys.bech32Address,
          tokenId: null,
          tx,
          walletId: this.walletId
        })
        this.addTransaction(this.currencyInfo.currencyCode, edgeTx)
        this.otherData.latestQueryTransactionsBlockHeight = tx.block_height
        this.otherData.latestQueryTransactionsTxid = tx.tx_hash
        progressCurrent++
      }

      this.walletLocalDataDirty = true
      this.tokenCheckTransactionsStatus.set(
        null,
        progressCurrent / progressTotal
      )
      this.updateOnAddressesChecked()
    }

    this.tokenCheckTransactionsStatus.set(null, 1)
    this.updateOnAddressesChecked()
    this.sendTransactionEvents()
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS)
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS)
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS)
    await super.startEngine()
  }

  async resyncBlockchain(): Promise<void> {
    await this.killEngine()
    await this.clearBlockchainCache()
    await this.startEngine()
  }

  composeTransaction(
    outputAddress: string,
    outputAmount: string
  ): Cardano.TransactionBody {
    if (this.tools.epochParams == null) {
      throw new Error('No network params')
    }

    const {
      min_fee_a: minFeeA,
      min_fee_b: minFeeB,
      max_tx_size: maxTxSize,
      key_deposit: keyDeposit,
      pool_deposit: poolDeposit,
      max_val_size: maxValSize,
      coins_per_utxo_size: coinsPerUtxoSize
    } = this.tools.epochParams

    const txBuilderConfig = Cardano.TransactionBuilderConfigBuilder.new()
      .fee_algo(
        Cardano.LinearFee.new(
          Cardano.BigNum.from_str(minFeeA.toString()),
          Cardano.BigNum.from_str(minFeeB.toString())
        )
      )
      .coins_per_utxo_byte(Cardano.BigNum.from_str(coinsPerUtxoSize))
      .max_value_size(maxValSize)
      .max_tx_size(maxTxSize)
      .pool_deposit(Cardano.BigNum.from_str(poolDeposit))
      .key_deposit(Cardano.BigNum.from_str(keyDeposit))
      .build()
    const txBuilder = Cardano.TransactionBuilder.new(txBuilderConfig)

    const outputAddr = Cardano.Address.from_bech32(outputAddress)
    const changeAddr = Cardano.Address.from_bech32(
      this.walletInfo.keys.bech32Address
    )

    txBuilder.set_ttl_bignum(
      Cardano.BigNum.from_str(this.slot.toString()).checked_add(
        Cardano.BigNum.from_str('7200')
      )
    )

    // Add output to the tx
    txBuilder.add_output(
      Cardano.TransactionOutput.new(
        outputAddr,
        Cardano.Value.new(Cardano.BigNum.from_str(outputAmount))
      )
    )

    // Filter out multi asset utxo to keep this simple
    const lovelaceUtxos = this.utxos.filter(
      u => u.value !== '0' && u.asset_list.length === 0
    )

    // Create TransactionUnspentOutputs from utxos fetched
    const unspentOutputs = Cardano.TransactionUnspentOutputs.new()
    for (const utxo of lovelaceUtxos) {
      const inputValue = Cardano.Value.new(Cardano.BigNum.from_str(utxo.value))
      const input = Cardano.TransactionInput.new(
        Cardano.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
        utxo.tx_index
      )
      const output = Cardano.TransactionOutput.new(changeAddr, inputValue)
      unspentOutputs.add(Cardano.TransactionUnspentOutput.new(input, output))
    }
    try {
      txBuilder.add_inputs_from(
        unspentOutputs,
        Cardano.CoinSelectionStrategyCIP2.LargestFirst
      )
    } catch (error) {
      if (String(error).includes('UTxO Balance Insufficient')) {
        throw new InsufficientFundsError({ tokenId: null })
      }
      throw error
    }

    // Adds a change output if there are more ADA in utxo than we need for the transaction,
    // these coins will be returned to change address
    txBuilder.add_change_if_needed(changeAddr)

    // Build transaction
    const txBody = txBuilder.build()

    switch (this.networkInfo.networkId) {
      case 1:
        txBody.set_network_id(Cardano.NetworkId.mainnet())
        break
      case 0:
        txBody.set_network_id(Cardano.NetworkId.testnet())
        break
      default:
        throw new Error('Unknown networkId')
    }

    return txBody
  }

  async makeSpend(edgeSpendInfoIn: EdgeSpendInfo): Promise<EdgeTransaction> {
    const { edgeSpendInfo, currencyCode } = this.makeSpendCheck(edgeSpendInfoIn)
    const { memos = [], tokenId } = edgeSpendInfo

    const spendTarget = edgeSpendInfo.spendTargets[0]
    const { publicAddress } = spendTarget
    let { nativeAmount } = spendTarget

    if (publicAddress == null) {
      throw new Error('makeSpend Missing publicAddress')
    }
    if (nativeAmount == null) throw new NoAmountSpecifiedError()

    let nativeNetworkFee = '0'
    const otherParams: CardanoTxOtherParams = {
      unsignedTx: ''
    }

    if (nativeAmount != null && nativeAmount !== '0') {
      try {
        const txBody = this.composeTransaction(publicAddress, nativeAmount)
        nativeNetworkFee = txBody.fee().to_str()
        otherParams.unsignedTx = txBody.to_hex()
        otherParams.isSpendable = true
      } catch (e) {
        this.log.warn('composeTransaction error: ', e)
        if (e instanceof Error) throw e
        else throw new Error(String(e))
      }
    }

    const totalTxAmount = add(nativeAmount, nativeNetworkFee)
    nativeAmount = mul(totalTxAmount, '-1')

    // **********************************
    // Create the unsigned EdgeTransaction

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0, // blockHeight
      currencyCode, // currencyCode
      date: 0, // date
      isSend: nativeAmount.startsWith('-'),
      memos,
      nativeAmount, // nativeAmount
      networkFee: nativeNetworkFee, // networkFee, supposedly fixed
      networkFees: [],
      otherParams, // otherParams
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      tokenId,
      txid: '', // txid
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async saveTx(edgeTransaction: EdgeTransaction): Promise<void> {
    await super.saveTx(edgeTransaction)

    const tx = Cardano.FixedTransaction.from_hex(edgeTransaction.signedTx)
    const txHash = tx.transaction_hash().to_hex()
    const txBody = tx.body().to_js_value()

    // Remove any spent utxos:
    this.removeUtxosByVouts(
      txBody.inputs.map(input => `${input.transaction_id}_${input.index}`)
    )

    // Add new utxos that our own:
    const ownAddress = this.walletInfo.keys.bech32Address
    txBody.outputs.forEach((output, index) => {
      if (output.address === ownAddress) {
        // Skip over multiasset outputs (we don't support spending from them):
        if (output.amount.multiasset != null) return

        this.addUnseenUtxo({
          asset_list: [],
          tx_hash: txHash,
          tx_index: index,
          value: output.amount.coin
        })
      }
    })

    // Update balance incase the UTXO set changed:
    this.updateBalanceFromUtxos(this.currencyInfo.currencyCode)
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const { unsignedTx, isStakeTx = false } = asCardanoTxOtherParams(
      edgeTransaction.otherParams
    )

    const keys = asCardanoPrivateKeys(this.currencyInfo.pluginId)(privateKeys)
    const { accountKey } = await this.tools.derivePrivateKeys(keys)

    const paymentKey = accountKey.derive(0).derive(0)

    const tx = trial(
      () =>
        Cardano.FixedTransaction.new_from_body_bytes(base16.parse(unsignedTx)),
      () => Cardano.FixedTransaction.from_hex(unsignedTx)
    )
    const txHash = tx.transaction_hash()
    const witnesses = Cardano.TransactionWitnessSet.new()
    const vkeyWitnesses = Cardano.Vkeywitnesses.new()

    const vkeyWitness = Cardano.make_vkey_witness(
      txHash,
      paymentKey.to_raw_key()
    )
    vkeyWitnesses.add(vkeyWitness)

    if (isStakeTx) {
      const stakeKey = accountKey.derive(2).derive(0)
      const vkeyWitnessStaking = Cardano.make_vkey_witness(
        txHash,
        stakeKey.to_raw_key()
      )
      vkeyWitnesses.add(vkeyWitnessStaking)
    }

    witnesses.set_vkeys(vkeyWitnesses)
    tx.set_witness_set(witnesses.to_bytes())

    edgeTransaction.signedTx = tx.to_hex()
    return edgeTransaction
  }

  async broadcastTx(
    edgeTransaction: EdgeTransaction
  ): Promise<EdgeTransaction> {
    if (edgeTransaction.signedTx == null) throw new Error('Missing signedTx')

    try {
      const txid = await this.multiBroadcast(
        base16.parse(edgeTransaction.signedTx)
      )
      edgeTransaction.txid = txid
      edgeTransaction.date = Date.now() / 1000
      this.warn(`SUCCESS broadcastTx\n${cleanTxLogs(edgeTransaction)}`)
    } catch (e: any) {
      this.warn('FAILURE broadcastTx failed: ', e)
      throw e
    }

    return edgeTransaction
  }

  async getFreshAddress(_options: any): Promise<EdgeFreshAddress> {
    const { bech32Address } = asSafeCardanoWalletInfo(this.walletInfo).keys

    return {
      publicAddress: bech32Address
    }
  }

  /**
   * This is a helper function to add utxos to the wallet state that we haven't
   * seen before. This avoids duplication and merges utxos into the wallet
   * state. Also, we don't want to add utxos that we've already seen because the
   * wallet may know that they're spent when the network doesn't.
   *
   * @param utxo the utxo to add
   */
  private addUnseenUtxo(utxo: KoiosUtxo): void {
    const vout = `${utxo.tx_hash}_${utxo.tx_index}`
    if (!this.seenVouts.has(vout)) {
      this.seenVouts.add(vout)
      this.utxos.push(utxo)
    }
  }

  private removeUtxosByVouts(vouts: string[] | Set<string>): void {
    const voutsSet = new Set(vouts)
    this.utxos = this.utxos.filter(
      utxo => !voutsSet.has(`${utxo.tx_hash}_${utxo.tx_index}`)
    )
  }

  private updateBalanceFromUtxos(currencyCode: string): void {
    const balance = this.utxos.reduce((acc, utxo) => add(acc, utxo.value), '0')
    this.updateBalance(currencyCode, balance)
  }

  getStakeAddress = async (): Promise<string> => {
    const { bech32Address } = asSafeCardanoWalletInfo(this.walletInfo).keys

    const paymentAddress = Cardano.Address.from_bech32(bech32Address)

    // Get the stake credential
    const baseAddr = Cardano.BaseAddress.from_address(paymentAddress)

    if (baseAddr == null) {
      throw new Error("This address doesn't have staking rights")
    }

    const stakeCredential = baseAddr.stake_cred()

    // Create a stake address from the credential
    const stakeAddress = Cardano.RewardAddress.new(
      paymentAddress.network_id(),
      stakeCredential
    )

    // Convert to bech32
    const bech32StakeAddress = stakeAddress.to_address().to_bech32()

    return bech32StakeAddress
  }

  decodeStakingTx = async (encodedTx: string): Promise<EdgeTransaction> => {
    const { bech32Address } = asSafeCardanoWalletInfo(this.walletInfo).keys

    const tx = Cardano.FixedTransaction.from_hex(encodedTx)
    const txHash = tx.transaction_hash()

    const txBody = tx.body().to_js_value()

    // Validate the transaction is a staking transaction:
    const validatedTxBody = asStakingTxBody(bech32Address)(txBody)

    // We'll consider the transaction a deposit (stake) if no rewards are withdrawn
    const isDeposit = validatedTxBody.withdrawals == null

    // Determine if the transaction is spendable by comparing the wallet's utxos
    // with the transaction's inputs:
    const isSpendable = validatedTxBody.inputs.every(input =>
      this.utxos.some(utxo => utxo.tx_hash === input.transaction_id)
    )

    const otherParams: CardanoTxOtherParams = {
      isStakeTx: true,
      isSpendable,
      unsignedTx: tx.to_hex()
    }

    const nativeNetworkFee = txBody.fee

    // Staking locks 2 ADA.
    const nativeAmount = isDeposit
      ? '-2000000'
      : // Because of Edge's policy not to show network fees in a receive tx
        sub('2000000', nativeNetworkFee)

    const edgeTransaction: EdgeTransaction = {
      blockHeight: 0,
      currencyCode: this.currencyInfo.currencyCode,
      date: 0,
      isSend: isDeposit,
      memos: [],
      nativeAmount,
      networkFee: nativeNetworkFee,
      networkFees: [],
      otherParams,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: txHash.to_hex(),
      walletId: this.walletId,
      assetAction: {
        assetActionType: isDeposit ? 'stake' : 'unstake'
      },
      savedAction: {
        actionType: 'stake',
        pluginId: this.currencyInfo.pluginId,
        stakeAssets: [
          {
            pluginId: this.currencyInfo.pluginId,
            tokenId: null
          }
        ]
      }
    }

    return edgeTransaction
  }

  otherMethods = {
    decodeStakingTx: this.decodeStakingTx,
    getStakeAddress: this.getStakeAddress
  }
}

export async function makeCurrencyEngine(
  env: PluginEnvironment<CardanoNetworkInfo>,
  tools: CardanoTools,
  walletInfo: EdgeWalletInfo,
  opts: EdgeCurrencyEngineOptions
): Promise<EdgeCurrencyEngine> {
  const { initOptions } = env

  const safeWalletInfo = asSafeCardanoWalletInfo(walletInfo)
  const engine = new CardanoEngine(
    env,
    tools,
    safeWalletInfo,
    initOptions,
    opts
  )

  // Do any async initialization necessary for the engine
  await engine.loadEngine()

  return engine
}

export const processCardanoTransaction = (opts: {
  address: string
  currencyCode: string
  tokenId: EdgeTokenId
  tx: KoiosNetworkTx
  walletId: string
}): EdgeTransaction => {
  const { currencyCode, address, tokenId, tx, walletId } = opts
  const {
    tx_hash: txid,
    block_height: blockHeight,
    tx_timestamp: date,
    fee,
    inputs,
    outputs
  } = tx

  let netNativeAmount: string = '0'
  const ourReceiveAddressesSet = new Set<string>()
  for (const input of inputs) {
    if (input.payment_addr.bech32 === address) {
      netNativeAmount = sub(netNativeAmount, input.value)
    }
  }
  for (const output of outputs) {
    if (output.payment_addr.bech32 === address) {
      netNativeAmount = add(netNativeAmount, output.value)
      ourReceiveAddressesSet.add(address)
    }
  }
  const isSend = netNativeAmount.startsWith('-')

  const edgeTransaction: EdgeTransaction = {
    blockHeight,
    currencyCode,
    date,
    isSend,
    memos: [],
    nativeAmount: netNativeAmount,
    networkFee: isSend ? fee : '0',
    networkFees: [],
    ourReceiveAddresses: [...ourReceiveAddressesSet.values()], // blank if you sent money otherwise array of addresses that are yours in this transaction
    signedTx: '',
    tokenId,
    txid,
    walletId: walletId
  }

  return edgeTransaction
}
