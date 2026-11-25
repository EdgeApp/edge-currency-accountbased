import { assert } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { MoneroEngine } from '../../src/monero/MoneroEngine'
import { currencyInfo } from '../../src/monero/moneroInfo'
import { MoneroTools } from '../../src/monero/MoneroTools'
import {
  EDGE_MONERO_LWS_SERVER,
  MoneroNetworkInfo,
  SafeMoneroWalletInfo
} from '../../src/monero/moneroTypes'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'

const MNEMONIC = 'fake mnemonic words'
const SIGNATURE = 'SigV2fake'

// Includes a zero byte, which a string would not carry to native code:
const BYTES = Uint8Array.from([0x00, 0x7f, 0xff])

const PRIVATE_KEYS = {
  dataKey: 'data-key',
  moneroKey: MNEMONIC,
  moneroSpendKeyPrivate: 'spend-private',
  moneroSpendKeyPublic: 'spend-public'
}

interface SignCall {
  mnemonic: string
  bytes: Uint8Array
}

async function makeEngine(calls: SignCall[]): Promise<MoneroEngine> {
  const fakeIo = makeFakeIo()

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

  const opts: EdgeCurrencyEngineOptions = {
    callbacks,
    customTokens: {},
    enabledTokenIds: [],
    log: fakeLog,
    userSettings: {},
    walletLocalDisklet: fakeIo.disklet,
    walletLocalEncryptedDisklet: fakeIo.disklet,
    walletSettings: {}
  }

  const env = {
    currencyInfo,
    initOptions: { edgeApiKey: '' },
    io: fakeIo,
    log: fakeLog,
    networkInfo: {
      edgeLwsServer: EDGE_MONERO_LWS_SERVER,
      networkType: 'MAINNET'
    }
  } as unknown as PluginEnvironment<MoneroNetworkInfo>

  const tools = {
    cppBridge: {
      async signBytes(mnemonic: string, bytes: Uint8Array): Promise<string> {
        calls.push({ mnemonic, bytes })
        return SIGNATURE
      }
    },
    moneroIo: { on: () => () => {} }
  } as unknown as MoneroTools

  const walletInfo: SafeMoneroWalletInfo = {
    id: 'wallet-1',
    type: 'wallet:monero',
    keys: {
      publicKey: '4-fake-address',
      moneroAddress: '4-fake-address',
      moneroViewKeyPrivate: 'view-private',
      moneroViewKeyPublic: 'view-public',
      moneroSpendKeyPublic: 'spend-public'
    }
  }

  const engine = new MoneroEngine(
    env,
    tools,
    walletInfo,
    { edgeApiKey: '' },
    opts
  )
  await engine.loadEngine()
  return engine
}

describe('MoneroEngine signBytes', function () {
  it("passes the wallet's mnemonic and the bytes to the native signer", async function () {
    const calls: SignCall[] = []
    const engine = await makeEngine(calls)

    const signature = await engine.signBytes(BYTES, PRIVATE_KEYS, {})

    assert.equal(signature, SIGNATURE)
    assert.deepEqual(calls, [{ mnemonic: MNEMONIC, bytes: BYTES }])
  })

  it("signs when publicAddress is the wallet's primary address", async function () {
    const calls: SignCall[] = []
    const engine = await makeEngine(calls)

    const signature = await engine.signBytes(BYTES, PRIVATE_KEYS, {
      otherParams: { publicAddress: '4-fake-address' }
    })

    assert.equal(signature, SIGNATURE)
    assert.deepEqual(calls, [{ mnemonic: MNEMONIC, bytes: BYTES }])
  })

  it("rejects a publicAddress that is not the wallet's primary address", async function () {
    const calls: SignCall[] = []
    const engine = await makeEngine(calls)

    await expectRejection(
      engine.signBytes(BYTES, PRIVATE_KEYS, {
        otherParams: { publicAddress: '8-fake-subaddress' }
      }),
      'Error: Monero can only sign messages for the wallet primary address'
    )
    assert.deepEqual(calls, [])
  })

  it('rejects keys that are not Monero private keys', async function () {
    const calls: SignCall[] = []
    const engine = await makeEngine(calls)

    await expectRejection(engine.signBytes(BYTES, {}, {}))
    assert.deepEqual(calls, [])
  })
})
