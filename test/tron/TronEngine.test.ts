import { assert } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeSpendInfo,
  EdgeTokenMap,
  EdgeTransaction,
  JsonObject,
  makeFakeIo
} from 'edge-core-js'
import { describe, it } from 'mocha'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { TronEngine } from '../../src/tron/TronEngine'
import { tron } from '../../src/tron/tronInfo'
import type { TronTools } from '../../src/tron/TronTools'
import {
  asTransaction,
  SafeTronWalletInfo,
  TronNetworkInfo
} from '../../src/tron/tronTypes'
import { expectRejection } from '../expectRejection'
import { fakeLog } from '../fake/fakeLog'
import rangoTronSwaps from './rangoTronSwaps.json'

// The wallet that made the Rango swaps below, in both address formats
const WALLET_ADDRESS = 'THQKiAwHBgZ3M63ZYkJaSvzt3fT4MTGywi'
const WALLET_HEX = '415188e13a382d3562b6023996340cc52b6f6a0c16'
const SUN_SWAP_ROUTER_HEX = '414ab38f7ae7eadad03981b2a7d7883760aa63e564'
const OTHER_OWNER_HEX = '416c4d3cb629599f55e634bcbe08c9ffc560373d77'

const USDT_TOKEN_ID = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
const builtinTokens: EdgeTokenMap = {
  [USDT_TOKEN_ID]: {
    currencyCode: 'USDT',
    displayName: 'Tether',
    denominations: [{ name: 'USDT', multiplier: '1000000' }],
    networkLocation: { contractAddress: USDT_TOKEN_ID }
  }
}

const networkInfo: TronNetworkInfo = {
  tronApiServers: [],
  tronNodeServers: [],
  defaultDerivationPath: "m/44'/195'/0'/0/0",
  defaultFeeLimit: 1000000000,
  defaultFreezeDurationInDays: 3,
  trc20BalCheckerContract: 'TN8RtFXeQZyFHGmH1iiSRm5r4CRz1yWkCf'
}

// The energy the stubbed dry run reports, and what it costs at the engine's
// default energy price of 280 sun.
const ENERGY_USED = 65000
const ENERGY_FEE_SUN = String(ENERGY_USED * 280)

interface TestEngineOpts {
  /** Makes the dry run fail, as it does before an approval is broadcast */
  dryRunFails?: boolean
  trxBalance: string
  usdtBalance?: string
}

async function makeEngine(opts: TestEngineOpts): Promise<TronEngine> {
  const { dryRunFails = false, trxBalance, usdtBalance = '0' } = opts
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

  const engineOpts: EdgeCurrencyEngineOptions = {
    callbacks,
    customTokens: {},
    enabledTokenIds: [USDT_TOKEN_ID],
    log: fakeLog,
    userSettings: {},
    walletLocalDisklet: fakeIo.disklet,
    walletLocalEncryptedDisklet: fakeIo.disklet,
    walletSettings: {}
  }

  const { currencyInfo } = tron({
    infoPayload: {},
    initOptions: {},
    io: fakeIo,
    log: fakeLog,
    nativeIo: {},
    pluginDisklet: fakeIo.disklet
  })

  const env = {
    builtinTokens,
    currencyInfo,
    initOptions: {},
    io: fakeIo,
    log: fakeLog,
    networkInfo
  } as unknown as PluginEnvironment<TronNetworkInfo>

  const walletInfo: SafeTronWalletInfo = {
    id: 'tron-wallet',
    type: 'wallet:tron',
    keys: { publicKey: WALLET_ADDRESS }
  }

  const engine = new TronEngine(
    env,
    {} as unknown as TronTools,
    walletInfo,
    engineOpts
  )
  await engine.loadEngine()

  engine.walletLocalData.totalBalances[''] = trxBalance
  engine.walletLocalData.totalBalances[USDT_TOKEN_ID] = usdtBalance
  Object.assign(engine.recentBlock, {
    hash: '00000000052254c50b5b305a18390bd0',
    number: 86124997,
    timestamp: 1789495650000
  })
  // Staked bandwidth covers every call here, so the fee is the energy alone
  engine.accountResources = { BANDWIDTH: 5000, ENERGY: 0 }

  engine.multicastServers = async (
    func: string,
    path: string,
    body: JsonObject = {}
  ): Promise<unknown> => {
    if (func !== 'trx_estimateEnergy') {
      throw new Error(`Unexpected ${func} ${path}`)
    }
    if (dryRunFails) throw new Error('REVERT opcode executed')
    return { energy_used: ENERGY_USED, transaction: { ret: [{}] } }
  }

  return engine
}

/** A copy of a Rango contract call with some of its values replaced */
function editCall(
  contract: (typeof rangoTronSwaps.trxToUsdt.tx.raw_data.contract)[0],
  value: JsonObject
): JsonObject {
  return {
    ...contract,
    parameter: {
      ...contract.parameter,
      value: { ...contract.parameter.value, ...value }
    }
  }
}

const trxSwap = rangoTronSwaps.trxToUsdt.tx.raw_data
const usdtSwap = rangoTronSwaps.usdtToTrx.tx.raw_data
const usdtApproval = rangoTronSwaps.usdtToTrx.tx.approve_raw_data

function trxSwapSpend(
  contractJson: unknown = trxSwap.contract[0]
): EdgeSpendInfo {
  return {
    tokenId: null,
    spendTargets: [
      {
        nativeAmount: rangoTronSwaps.trxToUsdt.amount,
        publicAddress: 'TGnC7LMji8hBpyvZt1TTEJhVpAZ5HFyJ3r'
      }
    ],
    otherParams: { contractJson, feeLimit: trxSwap.fee_limit }
  }
}

function usdtSwapSpend(
  contractJson: unknown = usdtSwap.contract[0]
): EdgeSpendInfo {
  return {
    tokenId: USDT_TOKEN_ID,
    spendTargets: [
      {
        nativeAmount: rangoTronSwaps.usdtToTrx.amount,
        publicAddress: 'TGnC7LMji8hBpyvZt1TTEJhVpAZ5HFyJ3r'
      }
    ],
    otherParams: { contractJson, feeLimit: usdtSwap.fee_limit }
  }
}

describe('TronEngine contract call spends', function () {
  it('charges a TRX call its call value plus the fee', async function () {
    const engine = await makeEngine({ trxBalance: '100000000' })
    const tx = await engine.makeSpend(trxSwapSpend())

    assert.equal(tx.tokenId, null)
    assert.equal(tx.nativeAmount, '-33200000') // 15 TRX + 18.2 TRX fee
    assert.equal(tx.networkFee, ENERGY_FEE_SUN)
    assert.equal(tx.parentNetworkFee, undefined)
  })

  it('charges a token call its amount, with the fee on the parent', async function () {
    const engine = await makeEngine({
      trxBalance: '100000000',
      usdtBalance: '5000000'
    })
    const tx = await engine.makeSpend(usdtSwapSpend())

    assert.equal(tx.tokenId, USDT_TOKEN_ID)
    assert.equal(tx.nativeAmount, '-5000000')
    assert.equal(tx.networkFee, '0')
    assert.equal(tx.parentNetworkFee, ENERGY_FEE_SUN)
  })

  it('caps a failed dry run at the fee limit', async function () {
    // The default estimate after a failed dry run, 130000 energy, would be
    // 36.4 TRX, above the approval's 14.9646 TRX limit.
    const engine = await makeEngine({
      dryRunFails: true,
      trxBalance: '100000000'
    })
    const tx = await engine.makeSpend({
      tokenId: null,
      spendTargets: [
        {
          nativeAmount: '0',
          publicAddress: USDT_TOKEN_ID
        }
      ],
      otherParams: {
        contractJson: usdtApproval.contract[0],
        feeLimit: usdtApproval.fee_limit
      }
    })

    assert.equal(tx.nativeAmount, '-14964600')
    assert.equal(tx.networkFee, '14964600')
  })

  it('needs TRX for the call value and the fee', async function () {
    const enough = await makeEngine({ trxBalance: '33200000' })
    await enough.makeSpend(trxSwapSpend())

    const short = await makeEngine({ trxBalance: '33199999' })
    const error = await short.makeSpend(trxSwapSpend()).catch(e => e)
    assert.equal(error.name, 'InsufficientFundsError')
    assert.equal(error.networkFee, ENERGY_FEE_SUN)
  })

  it('needs TRX for a token call fee', async function () {
    const enough = await makeEngine({
      trxBalance: ENERGY_FEE_SUN,
      usdtBalance: '5000000'
    })
    await enough.makeSpend(usdtSwapSpend())

    const short = await makeEngine({
      trxBalance: '18199999',
      usdtBalance: '5000000'
    })
    const error = await short.makeSpend(usdtSwapSpend()).catch(e => e)
    assert.equal(error.name, 'InsufficientFundsError')
    assert.equal(error.tokenId, null)
  })

  it('rejects a call another wallet owns', async function () {
    const engine = await makeEngine({ trxBalance: '100000000' })
    await expectRejection(
      engine.makeSpend(
        trxSwapSpend(
          editCall(trxSwap.contract[0], { owner_address: OTHER_OWNER_HEX })
        )
      ),
      'Error: Error: contract call is not owned by this wallet'
    )
  })

  it('rejects a token call that sends TRX', async function () {
    const engine = await makeEngine({
      trxBalance: '100000000',
      usdtBalance: '5000000'
    })
    await expectRejection(
      engine.makeSpend(
        usdtSwapSpend(editCall(usdtSwap.contract[0], { call_value: 1 }))
      ),
      'Error: Error: token contract call may not send TRX'
    )
  })

  it('rejects a call that attaches a TRC10 token', async function () {
    const engine = await makeEngine({ trxBalance: '100000000' })
    await expectRejection(
      engine.makeSpend(
        trxSwapSpend(
          editCall(trxSwap.contract[0], {
            call_token_value: 5000,
            token_id: 1002000
          })
        )
      ),
      'Error: Error: contract call may not attach a TRC10 token'
    )
  })

  it('rejects a call spelled with a function selector', async function () {
    const engine = await makeEngine({ trxBalance: '100000000' })
    await expectRejection(
      engine.makeSpend(
        trxSwapSpend(
          editCall(trxSwap.contract[0], {
            function_selector: 'transfer(address,uint256)'
          })
        )
      ),
      'Error: Error: contract call must describe itself in data, not a function selector'
    )
  })

  it('rejects call data that is not hex', async function () {
    const engine = await makeEngine({ trxBalance: '100000000' })
    for (const data of ['zz', 'abc', '0xcef95229']) {
      await expectRejection(
        engine.makeSpend(trxSwapSpend(editCall(trxSwap.contract[0], { data }))),
        'Error: Error: contract call data must be a hex string'
      )
    }
  })

  it('rejects a fee limit that is not a whole number', async function () {
    const engine = await makeEngine({ trxBalance: '100000000' })
    for (const feeLimit of [-1, 1.5]) {
      await expectRejection(
        engine.makeSpend({
          ...trxSwapSpend(),
          otherParams: { contractJson: trxSwap.contract[0], feeLimit }
        }),
        'Error: Error: contract call fee limit must be a whole number'
      )
    }
  })
})

// Confirmed transactions as TronGrid returns them for the wallet above, trimmed
// to the fields the engine reads and the internal calls that moved TRX.
const confirmedTrxToUsdt = {
  ret: [{ contractRet: 'SUCCESS', fee: 1416400 }],
  txID: '73d275c5f263f370613a27abb92dbf03a788326df414a8a6ee9a2a2660a6fea1',
  blockNumber: 86136942,
  block_timestamp: 1789082850000,
  raw_data: {
    contract: [
      {
        type: 'TriggerSmartContract',
        parameter: {
          value: {
            data: 'cef95229',
            owner_address: WALLET_HEX,
            contract_address: SUN_SWAP_ROUTER_HEX,
            call_value: 14709000
          }
        }
      }
    ]
  },
  internal_transactions: [
    {
      // The router forwarding the TRX it was sent into a pool
      to_address: '41a0a9d57ee9df8308bc29bcf881a569305260a0a5',
      from_address: SUN_SWAP_ROUTER_HEX,
      data: { note: 'call', rejected: false, call_value: { _: 14709000 } }
    }
  ]
}

const confirmedUsdtToTrx = {
  ret: [{ contractRet: 'SUCCESS', fee: 1577400 }],
  txID: 'd44d1e67e5423a1895116f5e0efbd69ca85e7bb1dc3a7f8eba220b060772ef20',
  blockNumber: 86158393,
  block_timestamp: 1789147221000,
  raw_data: {
    contract: [
      {
        type: 'TriggerSmartContract',
        parameter: {
          value: {
            data: 'cef95229',
            owner_address: WALLET_HEX,
            contract_address: SUN_SWAP_ROUTER_HEX
          }
        }
      }
    ]
  },
  internal_transactions: [
    {
      to_address: '41a614f803b6fd780986a42c78ec9c7f77e6ded13c',
      from_address: SUN_SWAP_ROUTER_HEX,
      data: { note: 'call', rejected: false }
    },
    {
      // A pool paying the router
      to_address: SUN_SWAP_ROUTER_HEX,
      from_address: '41891cdb91d149f23b1a45d9c5ca78a88d0cb44c18',
      data: { note: 'call', rejected: false, call_value: { _: 8926370 } }
    },
    {
      // The router paying the wallet
      to_address: WALLET_HEX,
      from_address: SUN_SWAP_ROUTER_HEX,
      data: { note: 'call', rejected: false, call_value: { _: 8926370 } }
    }
  ]
}

const confirmedApproval = {
  ret: [{ contractRet: 'SUCCESS', fee: 9976400 }],
  txID: '1f6f4b0e3a16cd64afb4ee44414c8342c46696c8d9269446c394f5d4bee8aaf1',
  blockNumber: 86158393,
  block_timestamp: 1789147221000,
  raw_data: {
    contract: [
      {
        type: 'TriggerSmartContract',
        parameter: {
          value: {
            data: '095ea7b3',
            owner_address: WALLET_HEX,
            contract_address: '41a614f803b6fd780986a42c78ec9c7f77e6ded13c'
          }
        }
      }
    ]
  },
  internal_transactions: []
}

function storedTx(
  engine: TronEngine,
  txid: string
): EdgeTransaction | undefined {
  return engine.transactionList[''].find(tx => tx.txid === txid)
}

describe('TronEngine confirmed contract calls', function () {
  it('counts the TRX a swap sold plus its fee', async function () {
    const engine = await makeEngine({ trxBalance: '0' })
    engine.processTRXTransaction(asTransaction(confirmedTrxToUsdt))

    const tx = storedTx(engine, confirmedTrxToUsdt.txID)
    assert.equal(tx?.nativeAmount, '-16125400')
    assert.equal(tx?.networkFee, '1416400')
    assert.equal(tx?.isSend, true)
    assert.deepEqual(tx?.ourReceiveAddresses, [])
  })

  it('counts the TRX a swap paid back as a receive', async function () {
    const engine = await makeEngine({ trxBalance: '0' })
    engine.processTRXTransaction(asTransaction(confirmedUsdtToTrx))

    const tx = storedTx(engine, confirmedUsdtToTrx.txID)
    assert.equal(tx?.nativeAmount, '7348970') // 8.92637 TRX - 1.5774 TRX fee
    assert.equal(tx?.networkFee, '1577400')
    assert.equal(tx?.isSend, false)
    assert.deepEqual(tx?.ourReceiveAddresses, [WALLET_ADDRESS])
  })

  it('ignores payouts from a call that was rejected or failed', async function () {
    const engine = await makeEngine({ trxBalance: '0' })
    const [pool, router, payout] = confirmedUsdtToTrx.internal_transactions
    engine.processTRXTransaction(
      asTransaction({
        ...confirmedUsdtToTrx,
        internal_transactions: [
          pool,
          router,
          { ...payout, data: { ...payout.data, rejected: true } }
        ]
      })
    )
    assert.equal(
      storedTx(engine, confirmedUsdtToTrx.txID)?.nativeAmount,
      '-1577400'
    )

    const failed = await makeEngine({ trxBalance: '0' })
    failed.processTRXTransaction(
      asTransaction({
        ...confirmedUsdtToTrx,
        ret: [{ contractRet: 'REVERT', fee: 1577400 }]
      })
    )
    assert.equal(
      storedTx(failed, confirmedUsdtToTrx.txID)?.nativeAmount,
      '-1577400'
    )
  })

  it('keeps a transaction whose internal calls it cannot read', async function () {
    const engine = await makeEngine({ trxBalance: '0' })
    engine.processTRXTransaction(
      asTransaction({
        ...confirmedUsdtToTrx,
        internal_transactions: [
          { unexpected: true },
          ...confirmedUsdtToTrx.internal_transactions
        ]
      })
    )
    assert.equal(
      storedTx(engine, confirmedUsdtToTrx.txID)?.nativeAmount,
      '7348970'
    )
  })

  it('confirms a pending approval that cost nothing', async function () {
    const engine = await makeEngine({ trxBalance: '0' })
    const freeApproval = {
      ...confirmedApproval,
      ret: [{ contractRet: 'SUCCESS', fee: 0 }]
    }

    // Staked resources paying for the call leaves nothing to record
    engine.processTRXTransaction(asTransaction(freeApproval))
    assert.equal(storedTx(engine, freeApproval.txID), undefined)

    // Unless it confirms the approval the wallet sent and saved
    engine.addTransaction(null, {
      blockHeight: 0,
      currencyCode: 'TRX',
      date: 1789147200,
      isSend: true,
      memos: [],
      nativeAmount: '-14964600',
      networkFee: '14964600',
      networkFees: [],
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: freeApproval.txID,
      walletId: 'tron-wallet'
    })
    engine.processTRXTransaction(asTransaction(freeApproval))

    const tx = storedTx(engine, freeApproval.txID)
    assert.equal(tx?.blockHeight, freeApproval.blockNumber)
    assert.equal(tx?.nativeAmount, '0')
    assert.equal(tx?.networkFee, '0')
    assert.equal(tx?.isSend, true)
    assert.notEqual(tx?.confirmations, 'dropped')
  })
})
