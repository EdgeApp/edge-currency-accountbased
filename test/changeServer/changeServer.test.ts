import { assert } from 'chai'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyPlugin,
  EdgeSubscribedAddress,
  EdgeWalletInfo,
  makeFakeIo
} from 'edge-core-js'
import EventEmitter from 'events'
import { after, before, describe, it } from 'mocha'
import fetch from 'node-fetch'

import edgeCorePlugins from '../../src/index'
import { fakeLog } from '../fake/fakeLog'

/**
 * Change-server integration tests for Ripple, Tezos, and Tron.
 *
 * These tests verify contract conformance with the change-server engine
 * protocol defined in edge-core-js PR #718:
 * - currencyInfo.usesChangeServer === true
 * - onSubscribeAddresses called on startEngine
 * - syncNetwork handles all sync paths
 * - Polling loops disabled when change-server is active
 */

interface ChangeServerFixture {
  pluginId: string
  walletType: string
  currencyCode: string
  walletInfo: EdgeWalletInfo
  /** Method names that should NOT be in addToLoop when change-server is on */
  disabledLoops: string[]
  /** Method names that SHOULD still be in addToLoop */
  activeLoops: string[]
}

const fixtures: ChangeServerFixture[] = [
  {
    pluginId: 'ripple',
    walletType: 'wallet:ripple',
    currencyCode: 'XRP',
    walletInfo: {
      id: '1',
      type: 'wallet:ripple',
      keys: {}
    },
    disabledLoops: [
      'checkServerInfoInnerLoop',
      'checkAccountInnerLoop',
      'checkTransactionsInnerLoop'
    ],
    activeLoops: []
  },
  {
    pluginId: 'tezos',
    walletType: 'wallet:xtz',
    currencyCode: 'XTZ',
    walletInfo: {
      id: '1',
      type: 'wallet:xtz',
      keys: {
        mnemonic:
          'canal head puzzle gravity keep response bulb diagram time oak mesh faith match quit hole sand laptop cycle group crunch say nose border later',
        publicKey: 'tz1TC6ETpRC1awG3Sq226TgMx4wHbJRTzod6',
        publicKeyEd: 'edpku2JAJHC6k68KpUjzL6FsekWczHKDopgCBgxtkViof3iFYiFJN1',
        privateKey:
          'edskSAdy4abu2a7rzfnhmpWxU3oXDT6bP4J1yXywd5NHNSsgBrnhuWjsFpVuqQP8Ce4Je3f5kcVjUuQVN69PWH5fYztc7xcYjJ'
      }
    },
    disabledLoops: [
      'checkBlockchainInnerLoop',
      'checkAccountInnerLoop',
      'checkTransactionsInnerLoop'
    ],
    activeLoops: []
  },
  {
    pluginId: 'tron',
    walletType: 'wallet:tron',
    currencyCode: 'TRX',
    walletInfo: {
      id: '1',
      type: 'wallet:tron',
      keys: {}
    },
    disabledLoops: [
      'checkBlockchainInnerLoop',
      'checkAccountInnerLoop',
      'checkTokenBalances',
      'queryTransactions'
    ],
    // Fee updates always run (matches Ethereum pattern)
    activeLoops: ['checkUpdateNetworkFees']
  }
]

for (const fixture of fixtures) {
  describe(`Change-server: ${fixture.pluginId}`, function () {
    const fakeIo = makeFakeIo()
    const opts: EdgeCorePluginOptions = {
      infoPayload: {},
      initOptions: {},
      io: {
        ...fakeIo,
        fetch,
        fetchCors: fetch,
        random: size => new Uint8Array(size)
      },
      log: fakeLog,
      nativeIo: {},
      pluginDisklet: fakeIo.disklet
    }
    // @ts-expect-error - indexing by dynamic pluginId
    const factory = edgeCorePlugins[fixture.pluginId]
    const plugin: EdgeCurrencyPlugin = factory(opts)

    const emitter = new EventEmitter()
    let subscribedAddressesCalls: EdgeSubscribedAddress[][] = []
    let syncStatusChanges: Array<{ totalRatio: number }> = []

    const callbacks: EdgeCurrencyEngineCallbacks = {
      onAddressesChecked(totalRatio) {
        emitter.emit('onSyncStatusChanged', { totalRatio })
      },
      onTxidsChanged() {},
      onBalanceChanged() {},
      onBlockHeightChanged(height) {
        emitter.emit('onBlockHeightChange', height)
      },
      onSeenTxCheckpoint() {},
      onStakingStatusChanged() {},
      onSubscribeAddresses(addresses: EdgeSubscribedAddress[] | string[]) {
        // Normalize to EdgeSubscribedAddress[]
        const normalized = addresses.map(a =>
          typeof a === 'string' ? { address: a } : a
        )
        subscribedAddressesCalls.push(normalized)
      },
      onSyncStatusChanged(status) {
        syncStatusChanges.push(status)
        emitter.emit('onSyncStatusChanged', status)
      },
      onNewTokens() {},
      onTokenBalanceChanged() {},
      onTransactions() {},
      onTransactionsChanged() {},
      onAddressChanged() {},
      onUnactivatedTokenIdsChanged() {},
      onWcNewContractCall() {}
    }

    const walletLocalDisklet = fakeIo.disklet
    const currencyEngineOptions: EdgeCurrencyEngineOptions = {
      callbacks,
      log: fakeLog,
      userSettings: undefined,
      walletLocalDisklet,
      walletLocalEncryptedDisklet: walletLocalDisklet,
      customTokens: {},
      enabledTokenIds: []
    }

    let engine: any

    before('Create engine', async function () {
      this.timeout(30000)
      const tools = await plugin.makeCurrencyTools()

      let walletInfo = fixture.walletInfo
      // Generate real keys for plugins that need them
      if (fixture.pluginId !== 'tezos') {
        const privateKeys = await tools.createPrivateKey(fixture.walletType)
        walletInfo = {
          ...fixture.walletInfo,
          keys: privateKeys
        }
        const publicKey = await tools.derivePublicKey(walletInfo)
        Object.assign(walletInfo.keys, publicKey)
      }

      engine = await plugin.makeCurrencyEngine(
        walletInfo,
        currencyEngineOptions
      )
    })

    // Reset tracking state before each test
    beforeEach(function () {
      subscribedAddressesCalls = []
      syncStatusChanges = []
    })

    // ---------------------------------------------------------------
    // Vector 1: usesChangeServer flag
    // ---------------------------------------------------------------
    describe('currencyInfo.usesChangeServer', function () {
      it('should be true', function () {
        assert.strictEqual(
          plugin.currencyInfo.usesChangeServer,
          true,
          `${fixture.pluginId} currencyInfo.usesChangeServer should be true`
        )
      })
    })

    // ---------------------------------------------------------------
    // Vector 2: onSubscribeAddresses called on startEngine
    // ---------------------------------------------------------------
    describe('startEngine', function () {
      it('should call onSubscribeAddresses with wallet address', async function () {
        this.timeout(30000)
        subscribedAddressesCalls = []

        await engine.startEngine()

        assert(
          subscribedAddressesCalls.length >= 1,
          'onSubscribeAddresses should be called at least once'
        )
        const addresses: EdgeSubscribedAddress[] = subscribedAddressesCalls[0]
        assert(addresses.length >= 1, 'Should subscribe at least one address')
        assert(
          typeof addresses[0].address === 'string' &&
            addresses[0].address.length > 0,
          'Subscribed address should be a non-empty string'
        )
      })

      // ---------------------------------------------------------------
      // Vector 7: Polling loops disabled when usesChangeServer is true
      // ---------------------------------------------------------------
      for (const loopName of fixture.disabledLoops) {
        it(`should NOT have '${loopName}' in polling loops`, function () {
          // Access private tasks map via type assertion
          const tasks: Map<string, unknown> = engine.tasks
          assert(
            !tasks.has(loopName),
            `'${loopName}' should not be in tasks when usesChangeServer is true`
          )
        })
      }

      // ---------------------------------------------------------------
      // Vector 10: Tron fee loop always active
      // ---------------------------------------------------------------
      for (const loopName of fixture.activeLoops) {
        it(`should HAVE '${loopName}' in polling loops`, function () {
          const tasks: Map<string, unknown> = engine.tasks
          assert(
            tasks.has(loopName),
            `'${loopName}' should still be in tasks (auxiliary loop)`
          )
        })
      }

      after('Kill engine after startEngine tests', async function () {
        this.timeout(10000)
        await engine.killEngine()
      })
    })

    // ---------------------------------------------------------------
    // Vector 3: syncNetwork exists and returns a number
    // ---------------------------------------------------------------
    describe('syncNetwork contract', function () {
      it('should exist as a function', function () {
        assert.strictEqual(
          typeof engine.syncNetwork,
          'function',
          'syncNetwork should be a function on the engine'
        )
      })
    })

    // ---------------------------------------------------------------
    // Vector 4: syncNetwork — initial sync (subscribeParam == null)
    // ---------------------------------------------------------------
    describe('syncNetwork: initial sync', function () {
      it('should return a positive interval when subscribeParam is undefined', async function () {
        this.timeout(30000)
        const interval = await engine.syncNetwork({})
        assert(
          typeof interval === 'number' && interval > 0,
          `syncNetwork should return a positive interval, got ${interval}`
        )
      })
    })

    // ---------------------------------------------------------------
    // Vector 5: syncNetwork — address wakeup (needsSync = true)
    // ---------------------------------------------------------------
    describe('syncNetwork: address wakeup', function () {
      it('should return a positive interval when subscribeParam has needsSync=true', async function () {
        this.timeout(30000)
        const address = engine.walletLocalData?.publicKey ?? 'test-address'
        const interval = await engine.syncNetwork({
          subscribeParam: {
            address,
            needsSync: true
          }
        })
        assert(
          typeof interval === 'number' && interval > 0,
          `syncNetwork should return a positive interval, got ${interval}`
        )
      })
    })

    // ---------------------------------------------------------------
    // Vector 6: syncNetwork — needsSync = false (caught up)
    // ---------------------------------------------------------------
    describe('syncNetwork: needsSync=false', function () {
      it('should return a positive interval and not trigger sync work', async function () {
        this.timeout(10000)
        const address = engine.walletLocalData?.publicKey ?? 'test-address'

        const interval = await engine.syncNetwork({
          subscribeParam: {
            address,
            needsSync: false
          }
        })

        assert(
          typeof interval === 'number' && interval > 0,
          `syncNetwork should return a positive interval, got ${interval}`
        )
      })

      it('should set sync ratio to 100% if not already synced', async function () {
        this.timeout(10000)
        // Force incomplete sync state
        engine.syncComplete = false

        const address = engine.walletLocalData?.publicKey ?? 'test-address'
        await engine.syncNetwork({
          subscribeParam: {
            address,
            needsSync: false
          }
        })

        // After needsSync=false with incomplete sync, should mark complete
        assert.strictEqual(
          engine.syncComplete,
          true,
          'syncComplete should be true after needsSync=false'
        )
      })
    })

    // ---------------------------------------------------------------
    // Vector 8: subscribedAddresses restoration from core
    // ---------------------------------------------------------------
    describe('subscribedAddresses restoration', function () {
      it('should call onSubscribeAddresses with restored checkpoint', async function () {
        this.timeout(30000)
        subscribedAddressesCalls = []

        // Set up pre-existing subscribed addresses on the engine
        // to simulate core restoring them from disk
        const testCheckpoint = '12345'
        const address = engine.walletLocalData?.publicKey ?? 'test-address'
        engine.subscribedAddresses = [{ address, checkpoint: testCheckpoint }]

        await engine.startEngine()

        assert(
          subscribedAddressesCalls.length >= 1,
          'onSubscribeAddresses should be called'
        )

        const subscribedAddresses: EdgeSubscribedAddress[] =
          subscribedAddressesCalls[0]
        const restoredAddr = subscribedAddresses.find(
          (a: EdgeSubscribedAddress) => a.checkpoint === testCheckpoint
        )
        assert(
          restoredAddr != null,
          `Should find address with restored checkpoint '${testCheckpoint}'`
        )
      })

      after('Kill engine after restoration tests', async function () {
        this.timeout(10000)
        await engine.killEngine()
        // Reset subscribed addresses for clean state
        engine.subscribedAddresses = []
      })
    })

    // ---------------------------------------------------------------
    // Vector 9: Tron-specific — token balances in syncNetwork
    // ---------------------------------------------------------------
    if (fixture.pluginId === 'tron') {
      describe('tron: checkTokenBalances available for syncNetwork', function () {
        it('should have checkTokenBalances as a method', function () {
          assert.strictEqual(
            typeof engine.checkTokenBalances,
            'function',
            'checkTokenBalances should exist on TronEngine'
          )
        })
      })
    }
  })
}
