import { expect } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeTransaction,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'
import type { Transaction } from 'react-native-zcash'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { TRANSACTION_STORE_FILE, TXID_MAP_FILE } from '../../src/common/types'
import { ZcashEngine } from '../../src/zcash/ZcashEngine'
import { ZcashTools } from '../../src/zcash/ZcashTools'
import {
  SafeZcashWalletInfo,
  ZcashNetworkInfo
} from '../../src/zcash/zcashTypes'
import { fakeLog } from '../fake/fakeLog'

const currencyInfo = {
  currencyCode: 'TAZ',
  pluginId: 'zcashtestnet',
  requiredConfirmations: 10,
  walletType: 'wallet:zcashtestnet',
  denominations: [{ name: 'TAZ', multiplier: '100000000' }]
} as unknown as EdgeCurrencyInfo

const callbacks: EdgeCurrencyEngineCallbacks = {
  onAddressChanged() {},
  onAddressesChecked() {},
  onBalanceChanged() {},
  onBlockHeightChanged() {},
  onNewTokens() {},
  onSeenTxCheckpoint() {},
  onStakingStatusChanged() {},
  onSubscribeAddresses() {},
  onSyncStatusChanged() {},
  onTokenBalanceChanged() {},
  onTransactions() {},
  onTransactionsChanged() {},
  onTxidsChanged() {},
  onUnactivatedTokenIdsChanged() {},
  onWcNewContractCall() {}
}

/** A send the sdk never mined, as it replays one on launch: */
function makeUnminedSend(txid: string, isExpired: boolean): Transaction {
  return {
    rawTransactionId: txid,
    blockTimeInSeconds: 0,
    minedHeight: 0,
    value: '10000000',
    fee: '15000',
    toAddress: 'tmFakeTransparentAddressForThisUnitTestOnly',
    isShielding: false,
    isExpired,
    memos: []
  }
}

/** The same send as an earlier launch stored it on disk: */
function makeStoredSend(txid: string, date: number): EdgeTransaction {
  return {
    blockHeight: 0,
    confirmations: 'failed',
    currencyCode: 'TAZ',
    date,
    isSend: true,
    memos: [],
    nativeAmount: '-10015000',
    networkFee: '15000',
    networkFees: [],
    otherParams: {},
    ourReceiveAddresses: [],
    signedTx: '',
    tokenId: null,
    txid,
    walletId: 'wallet-1'
  }
}

async function makeEngine(storedTxs?: EdgeTransaction[]): Promise<ZcashEngine> {
  const fakeIo = makeFakeIo()
  if (storedTxs != null) {
    await fakeIo.disklet.setText(
      TRANSACTION_STORE_FILE,
      JSON.stringify({ '': storedTxs })
    )
    const txidMap: Record<string, number> = {}
    storedTxs.forEach((tx, i) => {
      txidMap[tx.txid] = i
    })
    await fakeIo.disklet.setText(TXID_MAP_FILE, JSON.stringify({ '': txidMap }))
  }

  const opts: EdgeCurrencyEngineOptions = {
    callbacks,
    customTokens: {},
    enabledTokenIds: [],
    log: fakeLog,
    seenTxCheckpoint: '0',
    userSettings: {},
    walletLocalDisklet: fakeIo.disklet,
    walletLocalEncryptedDisklet: fakeIo.disklet,
    walletSettings: {}
  }
  const env = {
    builtinTokens: {},
    currencyInfo,
    io: fakeIo,
    log: fakeLog,
    networkInfo: { defaultNetworkFee: '10000' }
  } as unknown as PluginEnvironment<ZcashNetworkInfo>
  const walletInfo: SafeZcashWalletInfo = {
    id: 'wallet-1',
    type: 'wallet:zcashtestnet',
    keys: { publicKey: 'uviewtestfakeviewingkey', birthdayHeight: 4529000 }
  }

  const engine = new ZcashEngine(
    env,
    {} as unknown as ZcashTools,
    walletInfo,
    opts,
    async () => {
      throw new Error('No synchronizer in unit tests')
    }
  )
  await engine.loadEngine()
  return engine
}

describe('ZcashEngine transaction dates', function () {
  it('dates a new unmined send now', async function () {
    const engine = await makeEngine()
    const before = Date.now() / 1000
    engine.processTransaction(makeUnminedSend('aa'.repeat(32), false))

    const [tx] = await engine.getTransactions({ tokenId: null })
    expect(tx.date).at.least(before)
  })

  it('keeps the stored date when the sdk replays an expired send', async function () {
    const txid = 'bb'.repeat(32)
    const storedDate = 1761200000
    const engine = await makeEngine([makeStoredSend(txid, storedDate)])
    await engine.getTransactions({ tokenId: null })

    engine.processTransaction(makeUnminedSend(txid, true))

    const [tx] = await engine.getTransactions({ tokenId: null })
    expect(tx.confirmations).equals('failed')
    expect(tx.date).equals(storedDate)
  })
})
