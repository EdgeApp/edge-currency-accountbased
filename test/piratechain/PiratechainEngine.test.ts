import { expect } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeTransaction,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'
import type { TransactionInfo } from 'react-native-pirate-wallet'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { TRANSACTION_STORE_FILE } from '../../src/common/types'
import { PiratechainEngine } from '../../src/piratechain/PiratechainEngine'
import { PiratechainTools } from '../../src/piratechain/PiratechainTools'
import {
  PiratechainNetworkInfo,
  SafePiratechainWalletInfo
} from '../../src/piratechain/piratechainTypes'
import { fakeLog } from '../fake/fakeLog'

/** The shape of an extended viewing key, which is the wallet's publicKey: */
const VIEWING_KEY = 'zxviews1qfakeextendedviewingkeyforthisunittestonly'

const currencyInfo = {
  currencyCode: 'ARRR',
  pluginId: 'piratechain',
  requiredConfirmations: 10,
  walletType: 'wallet:piratechain',
  denominations: [{ name: 'ARRR', multiplier: '100000000' }]
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

function makeIncomingTx(txid: string): TransactionInfo {
  return {
    txid,
    height: 4147000,
    timestamp: 1750000000,
    amount: '18200000',
    fee: '10000',
    memo: 'thanks',
    confirmed: true
  }
}

/** An incoming transaction as an earlier build stored it on disk: */
function makeLeakedTx(txid: string): EdgeTransaction {
  return {
    blockHeight: 4147000,
    currencyCode: 'ARRR',
    date: 1750000000,
    isSend: false,
    memos: [],
    nativeAmount: '18200000',
    networkFee: '10000',
    networkFees: [],
    otherParams: {},
    ourReceiveAddresses: [VIEWING_KEY],
    signedTx: '',
    tokenId: null,
    txid,
    walletId: 'wallet-1'
  }
}

async function makeEngine(
  storedTxs?: EdgeTransaction[]
): Promise<{ engine: PiratechainEngine; readStore: () => Promise<string> }> {
  const fakeIo = makeFakeIo()
  if (storedTxs != null) {
    await fakeIo.disklet.setText(
      TRANSACTION_STORE_FILE,
      JSON.stringify({ '': storedTxs })
    )
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
    networkInfo: {}
  } as unknown as PluginEnvironment<PiratechainNetworkInfo>
  const walletInfo: SafePiratechainWalletInfo = {
    id: 'wallet-1',
    type: 'wallet:piratechain',
    keys: { publicKey: VIEWING_KEY, birthdayHeight: 4000000 }
  }

  const engine = new PiratechainEngine(
    env,
    {} as unknown as PiratechainTools,
    walletInfo,
    opts,
    async () => {
      throw new Error('No synchronizer in unit tests')
    }
  )
  await engine.loadEngine()

  return {
    engine,
    readStore: async () => await fakeIo.disklet.getText(TRANSACTION_STORE_FILE)
  }
}

describe('PiratechainEngine receive addresses', function () {
  it('reports no receive address for an incoming transaction', async function () {
    const { engine } = await makeEngine()
    engine.processTransaction(makeIncomingTx('aa'.repeat(32)))

    const [tx] = await engine.getTransactions({ tokenId: null })
    expect(tx.isSend).equals(false)
    expect(tx.ourReceiveAddresses).deep.equals([])
    expect(JSON.stringify(tx)).not.includes(VIEWING_KEY)
  })

  it('scrubs the viewing key from transactions an earlier build stored', async function () {
    const txid = 'bb'.repeat(32)
    const { engine, readStore } = await makeEngine([makeLeakedTx(txid)])
    expect(await readStore()).includes(VIEWING_KEY)

    const [tx] = await engine.getTransactions({ tokenId: null })
    expect(tx.txid).equals(txid)
    expect(tx.ourReceiveAddresses).deep.equals([])

    // Reprocessing the same confirmed transaction leaves the stored copy
    // alone, so the scrub is what has to reach the disk:
    engine.processTransaction(makeIncomingTx(txid))
    expect(engine.transactionListDirty).equals(true)
    await (engine as any).saveWalletLoop()
    const stored = await readStore()
    expect(stored).includes(txid)
    expect(stored).not.includes(VIEWING_KEY)
  })

  it('leaves an already clean store unchanged', async function () {
    const clean = { ...makeLeakedTx('cc'.repeat(32)), ourReceiveAddresses: [] }
    const { engine } = await makeEngine([clean])

    await engine.getTransactions({ tokenId: null })
    expect(engine.transactionListDirty).equals(false)
  })
})

describe('PiratechainEngine getFreshAddress', function () {
  const CACHED = 'zs1cachedaddressfromanearlierengine'
  const CURRENT = 'zs1currentaddressfromthesynchronizer'

  /** Resolves the engine's synchronizer with one that counts address reads. */
  function countReads(engine: PiratechainEngine): () => number {
    let reads = 0
    ;(engine as any).synchronizerResolver({
      getCurrentAddress: async () => {
        reads++
        return CURRENT
      }
    })
    return () => reads
  }

  it('refreshes a cached address once per engine start', async function () {
    const { engine } = await makeEngine()
    engine.otherData.cachedAddress = CACHED
    const reads = countReads(engine)

    const first = await engine.getFreshAddress()
    expect(first.publicAddress).equals(CACHED)
    await engine.synchronizerPromise
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(reads()).equals(1)

    for (let i = 0; i < 3; ++i) {
      const later = await engine.getFreshAddress()
      expect(later.publicAddress).equals(CURRENT)
    }
    expect(reads()).equals(1)
  })

  it('serves the cache after a first read with no cache', async function () {
    const { engine } = await makeEngine()
    const reads = countReads(engine)

    expect((await engine.getFreshAddress()).publicAddress).equals(CURRENT)
    expect((await engine.getFreshAddress()).publicAddress).equals(CURRENT)
    expect(reads()).equals(1)
  })
})
