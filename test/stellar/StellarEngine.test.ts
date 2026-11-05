import { assert } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'

import { StellarEngine } from '../../src/stellar/StellarEngine'
import { stellar } from '../../src/stellar/stellarInfo'
import { asStellarWalletOtherData } from '../../src/stellar/stellarTypes'
import { fakeLog } from '../fake/fakeLog'

// A fixed test key (the raw seed is 32 bytes of 0x07), plus an address to pay:
const SECRET = 'SADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQP54X'
const ADDRESS = 'GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57'
const RECIPIENT = 'GAJZR5RMNUNEK7CRXJVEWXZ5XUXWT7FJGILCDDOITF7EC26RPWJ4UVOE'

// Sequence numbers are int64 values, well past Number.MAX_SAFE_INTEGER:
const SEQUENCE = '280502140848308224'

type HorizonStub = (func: string, ...params: any[]) => Promise<any>

const horizon: HorizonStub = async func => {
  switch (func) {
    case 'loadAccount':
      return {
        id: ADDRESS,
        sequence: SEQUENCE,
        balances: [
          {
            asset_type: 'native',
            balance: '100.0000000',
            buying_liabilities: '0.0000000',
            selling_liabilities: '0.0000000'
          }
        ]
      }
    case 'submitTransaction':
      return { hash: 'ab'.repeat(32) }
  }
  throw new Error(`Unexpected Horizon call ${func}`)
}

async function makeEngine(stub: HorizonStub): Promise<StellarEngine> {
  const io = makeFakeIo()
  const pluginOptions: EdgeCorePluginOptions = {
    infoPayload: {},
    initOptions: {},
    io,
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: io.disklet
  }
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
  const engineOptions: EdgeCurrencyEngineOptions = {
    callbacks,
    customTokens: {},
    enabledTokenIds: [],
    log: fakeLog,
    seenTxCheckpoint: '0',
    userSettings: {},
    walletLocalDisklet: io.disklet,
    walletLocalEncryptedDisklet: io.disklet,
    walletSettings: {}
  }
  const engine = (await stellar(pluginOptions).makeCurrencyEngine(
    {
      id: 'stellar-test',
      type: 'wallet:stellar',
      keys: { publicKey: ADDRESS }
    },
    engineOptions
  )) as unknown as StellarEngine
  engine.multicastServers = stub
  return engine
}

describe('StellarEngine', function () {
  it('sends again before the next account poll', async function () {
    const engine = await makeEngine(horizon)
    await engine.checkAccountInnerLoop()
    assert.strictEqual(engine.otherData.accountSequence, SEQUENCE)

    // Each broadcast bumps the cached sequence by exactly one:
    for (const expected of ['280502140848308225', '280502140848308226']) {
      const tx = await engine.makeSpend({
        tokenId: null,
        spendTargets: [{ publicAddress: RECIPIENT, nativeAmount: '10000000' }]
      })
      await engine.broadcastTx(await engine.signTx(tx, { stellarKey: SECRET }))
      assert.strictEqual(engine.otherData.accountSequence, expected)
    }
  })

  it('keeps the saved account sequence when it loads', function () {
    const otherData = asStellarWalletOtherData({
      lastPagingToken: '0',
      accountSequence: SEQUENCE
    })
    assert.strictEqual(otherData.accountSequence, SEQUENCE)
  })
})
