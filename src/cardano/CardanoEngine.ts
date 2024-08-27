import * as Cardano from '@emurgo/cardano-serialization-lib-nodejs'
import { add, mul, sub } from 'biggystring'
import { asString, asTuple } from 'cleaners'
import {
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeFetchFunction,
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
import { trial } from '../common/trial'
import { cleanTxLogs, getFetchCors, promiseAny } from '../common/utils'
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
  utxos: ReturnType<typeof asKoiosBalance>[number]['utxo_set']

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
    this.utxos = []
  }

  setOtherData(_raw: any): void {
    this.otherData = asCardanoWalletOtherData(_raw)
  }

  async fetchGet(
    method: string,
    authenticated: boolean = false
  ): Promise<unknown> {
    const res = await this.fetchCors(
      `${this.networkInfo.koiosServer}/api/v1/${method}`,
      {
        headers: {
          ...(authenticated
            ? { Authorization: `Bearer ${this.initOptions.koiosApiKey}` }
            : {})
        }
      }
    )
    if (!res.ok) {
      const message = await res.text()
      throw new Error(`Koios error: ${message}`)
    }
    const json = await res.json()
    return json
  }

  async fetchPost(
    method: string,
    body: JsonObject,
    authenticated: boolean = false
  ): Promise<unknown> {
    const opts = {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(authenticated
          ? { Authorization: `Bearer ${this.initOptions.koiosApiKey}` }
          : {})
      },
      body: JSON.stringify(body)
    }
    const res = await this.fetchCors(
      `${this.networkInfo.koiosServer}/api/v1/${method}`,
      opts
    )
    if (!res.ok) {
      const message = await res.text()
      throw new Error(`Koios error: ${message}`)
    }
    const json = await res.json()
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
      if (!res.ok) {
        const message = await res.text()
        throw new Error(`${name} error: ${message}`)
      }
      const txid = asString(await res.text())
      this.log.warn(`${name} broadcast success`)
      return txid
    }

    const koios = async (): Promise<string> => {
      if (this.initOptions.koiosApiKey == null) {
        throw new Error('Missing koiosApiKey')
      }
      const headers = {
        Authorization: `Bearer ${this.initOptions.koiosApiKey}`
      }
      return await broadcast(
        'Koios',
        `${this.networkInfo.koiosServer}/api/v1/submittx`,
        headers
      )
    }
    const blockfrost = async (): Promise<string> => {
      if (this.initOptions.blockfrostProjectId == null) {
        throw new Error('Missing blockfrostProjectId')
      }
      const headers = {
        project_id: `${this.initOptions.blockfrostProjectId}`
      }
      return await broadcast(
        'Blockfrost',
        `${this.networkInfo.blockfrostServer}/api/v0/tx/submit`,
        headers
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

    return await promiseAny([blockfrost(), koios(), maestro()])
  }

  async queryBlockheight(): Promise<void> {
    try {
      const raw = await this.fetchGet('tip')
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
        const rawNetworkParams = await this.fetchGet(
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
      const raw = await this.fetchPost('address_info', {
        _addresses: [this.walletInfo.keys.bech32Address]
      })
      const clean = asKoiosBalance(raw)
      const mainnetBal = clean[0]?.balance ?? '0'

      this.updateBalance(this.currencyInfo.currencyCode, mainnetBal)

      this.utxos =
        clean[0]?.utxo_set.map(utxo => ({
          asset_list: utxo.asset_list,
          tx_hash: utxo.tx_hash,
          tx_index: utxo.tx_index,
          value: utxo.value
        })) ?? []
    } catch (e) {
      this.log.warn('queryBalance error: ', e)
    }
  }

  async queryTransactions(): Promise<void> {
    const countPerPage = 1000 // default
    const latestQueryTransactionsBlockHeight =
      this.otherData.latestQueryTransactionsBlockHeight
    const latestQueryTransactionsTxid =
      this.otherData.latestQueryTransactionsTxid
    while (true) {
      const rawTxidList = await this.fetchPost('address_txs', {
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
        .map(tx => tx.tx_hash)

      if (txids.length === 0) {
        break
      }
      const rawTxInfos = await this.fetchPost(`tx_info`, {
        _tx_hashes: txids
      })
      const txs = asKoiosTransactionsRes(rawTxInfos)

      for (const tx of txs) {
        const edgeTx = processCardanoTransaction({
          currencyCode: this.currencyInfo.currencyCode,
          publicKey: this.walletInfo.keys.bech32Address,
          tokenId: null,
          tx,
          walletId: this.walletId
        })
        this.addTransaction(this.currencyInfo.currencyCode, edgeTx)
        this.otherData.latestQueryTransactionsBlockHeight = tx.block_height
        this.otherData.latestQueryTransactionsTxid = tx.tx_hash
      }
      if (cleanTxidList.length < countPerPage) break
    }

    this.tokenCheckTransactionsStatus[this.currencyInfo.currencyCode] = 1
    this.updateOnAddressesChecked()

    if (this.transactionsChangedArray.length > 0) {
      this.walletLocalDataDirty = true
      this.currencyEngineCallbacks.onTransactionsChanged(
        this.transactionsChangedArray
      )
      this.transactionsChangedArray = []
    }
  }

  // // ****************************************************************************
  // // Public methods
  // // ****************************************************************************

  async startEngine(): Promise<void> {
    this.engineOn = true
    this.addToLoop('queryBlockheight', BLOCKCHAIN_POLL_MILLISECONDS).catch(
      () => {}
    )
    this.addToLoop('queryBalance', ACCOUNT_POLL_MILLISECONDS).catch(() => {})
    this.addToLoop('queryTransactions', TRANSACTION_POLL_MILLISECONDS).catch(
      () => {}
    )
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
      otherParams, // otherParams
      ourReceiveAddresses: [], // ourReceiveAddresses
      signedTx: '', // signedTx
      tokenId,
      txid: '', // txid
      walletId: this.walletId
    }

    return edgeTransaction
  }

  async signTx(
    edgeTransaction: EdgeTransaction,
    privateKeys: JsonObject
  ): Promise<EdgeTransaction> {
    const { unsignedTx, isStakeTx = false } = asCardanoTxOtherParams(
      edgeTransaction.otherParams
    )

    const { mnemonic } = asCardanoPrivateKeys(this.currencyInfo.pluginId)(
      privateKeys
    )
    const { accountKey } = this.tools.derivePrivateKeys(mnemonic)
    const paymentKey = accountKey.derive(0).derive(0)

    const txBody = trial(
      () => Cardano.TransactionBody.from_hex(unsignedTx),
      () => Cardano.Transaction.from_hex(unsignedTx).body()
    )
    const txHash = Cardano.hash_transaction(txBody)
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

    const transaction = Cardano.Transaction.new(
      txBody,
      witnesses,
      undefined // transaction metadata
    )

    edgeTransaction.signedTx = transaction.to_hex()
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
  currencyCode: string
  publicKey: string
  tokenId: EdgeTokenId
  tx: KoiosNetworkTx
  walletId: string
}): EdgeTransaction => {
  const { currencyCode, publicKey, tokenId, tx, walletId } = opts
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
    if (input.payment_addr.bech32 === publicKey) {
      netNativeAmount = sub(netNativeAmount, input.value)
    }
  }
  for (const output of outputs) {
    if (output.payment_addr.bech32 === publicKey) {
      netNativeAmount = add(netNativeAmount, output.value)
      ourReceiveAddressesSet.add(publicKey)
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
    ourReceiveAddresses: [...ourReceiveAddressesSet.values()], // blank if you sent money otherwise array of addresses that are yours in this transaction
    signedTx: '',
    tokenId,
    txid,
    walletId: walletId
  }

  return edgeTransaction
}
