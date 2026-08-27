import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeTransactionEvent,
  makeFakeIo
} from 'edge-core-js'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { ZanoEngine } from '../../src/zano/ZanoEngine'
import { currencyInfo } from '../../src/zano/zanoInfo'
import { ZanoTools } from '../../src/zano/ZanoTools'
import { SafeZanoWalletInfo, ZanoNetworkInfo } from '../../src/zano/zanoTypes'
import { fakeLog } from './fakeLog'

export const FAKE_NATIVE_ASSET_ID =
  'd6329b5b1f7c0805b5c345f4957554002a2f557845f64d7645dae0e051a6498a'
export const FAKE_ZANO_ADDRESS = 'ZxTestAddress'

/**
 * Builds a loaded `ZanoEngine` against fake IO, so every engine test shares
 * one copy of the callbacks / engine-options / environment boilerplate and a
 * change to `EdgeCurrencyEngineOptions` breaks a single file. Tests attach
 * their own `nativeId` stubs and tools tails to the returned engine.
 */
export async function makeFakeZanoEngine(
  opts: {
    /** Injected as `env.nativeIo`, e.g. to model a platform's native module. */
    nativeIo?: unknown
    /** Receives every transaction event the engine hands to the core. */
    onTransactions?: (events: EdgeTransactionEvent[]) => void
    tools?: ZanoTools
  } = {}
): Promise<ZanoEngine> {
  const {
    nativeIo,
    onTransactions = () => {},
    tools = {} as unknown as ZanoTools
  } = opts
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
    onTransactions(transactionEvents) {
      onTransactions(transactionEvents)
    },
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
    walletLocalDisklet: fakeIo.disklet,
    walletLocalEncryptedDisklet: fakeIo.disklet,
    walletSettings: {}
  }

  const networkInfo: ZanoNetworkInfo = {
    nativeAssetId: FAKE_NATIVE_ASSET_ID,
    walletRpcAddress: 'http://127.0.0.1:10500'
  }

  const env = {
    currencyInfo,
    io: fakeIo,
    log: fakeLog,
    nativeIo,
    networkInfo
  } as unknown as PluginEnvironment<ZanoNetworkInfo>

  const walletInfo: SafeZanoWalletInfo = {
    id: 'wallet-1',
    type: 'wallet:zano',
    keys: { publicKey: FAKE_ZANO_ADDRESS }
  }

  const engine = new ZanoEngine(env, tools, walletInfo, engineOptions)
  await engine.loadEngine()
  return engine
}
