import { assert } from 'chai'
import {
  EdgeCurrencyEngineCallbacks,
  EdgeCurrencyEngineOptions,
  EdgeTransaction,
  makeFakeIo
} from 'edge-core-js'
import { ethers } from 'ethers'
import { createServer, Server } from 'http'
import { after, before, describe, it } from 'mocha'
import { AddressInfo } from 'net'

import { PluginEnvironment } from '../../src/common/innerPlugin'
import { EthereumEngine } from '../../src/ethereum/EthereumEngine'
import type { EthereumTools } from '../../src/ethereum/EthereumTools'
import {
  EthereumNetworkInfo,
  EthereumTxOtherParams
} from '../../src/ethereum/ethereumTypes'
import { currencyInfo } from '../../src/ethereum/info/robinhoodInfo'
import { fakeLog } from '../fake/fakeLog'

const PRIVATE_KEY = '01'.repeat(32)
const WALLET = new ethers.Wallet(`0x${PRIVATE_KEY}`).address
const TO = '0x0000000000000000000000000000000000000002'
const BALANCE = '1000000000000000000'

// Spends are quoted at 1000 wei per unit of gas, with 10 units of L1 gas:
const GAS_PRICE = '1000'
const QUOTED_GAS = '21010'
const QUOTED_FEE = '21010000'

describe('EthereumEngine.signTx on an Arbitrum rollup', function () {
  let server: Server
  let rpcServer: string
  let reads = 0

  before(async function () {
    // The chain now wants one more unit of L1 gas than the quote:
    server = createServer((request, response) => {
      let body = ''
      request.on('data', chunk => {
        body += String(chunk)
      })
      request.on('end', () => {
        const { id, method } = JSON.parse(body)
        let result = '0x1'
        if (method === 'eth_call') {
          reads++
          result = ethers.utils.defaultAbiCoder.encode(
            ['uint64', 'uint256', 'uint256'],
            ['11', '20000000', '30000000']
          )
        }
        response.writeHead(200, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ id, jsonrpc: '2.0', result }))
      })
    })
    await new Promise<void>(resolve => {
      server.listen(0, '127.0.0.1', resolve)
    })
    const { port } = server.address() as AddressInfo
    rpcServer = `http://127.0.0.1:${port}`
  })

  after(function () {
    server.close()
  })

  async function makeEngine(): Promise<EthereumEngine> {
    const fakeIo = makeFakeIo()
    const noop = (): void => {}
    const callbacks: EdgeCurrencyEngineCallbacks = {
      onAddressChanged: noop,
      onAddressesChecked: noop,
      onBalanceChanged: noop,
      onBlockHeightChanged: noop,
      onNewTokens: noop,
      onSeenTxCheckpoint: noop,
      onStakingStatusChanged: noop,
      onSubscribeAddresses: noop,
      onSyncStatusChanged: noop,
      onTokenBalanceChanged: noop,
      onTransactions: noop,
      onTransactionsChanged: noop,
      onTxidsChanged: noop,
      onUnactivatedTokenIdsChanged: noop,
      onWcNewContractCall: noop
    }
    const engineOpts: EdgeCurrencyEngineOptions = {
      callbacks,
      customTokens: {},
      enabledTokenIds: [],
      log: fakeLog,
      userSettings: {},
      walletLocalDisklet: fakeIo.disklet,
      walletLocalEncryptedDisklet: fakeIo.disklet,
      walletSettings: {}
    }
    const networkInfo: EthereumNetworkInfo = {
      addressQueryLookbackBlocks: 1250,
      networkAdapterConfigs: [{ type: 'rpc', servers: [rpcServer] }],
      uriNetworks: ['robinhood'],
      ercTokenStandard: 'ERC20',
      chainParams: { chainId: 4663, name: 'Robinhood Chain' },
      arbitrumRollupParams: {
        nodeInterfaceAddress: '0x00000000000000000000000000000000000000C8'
      },
      supportsEIP1559: true,
      hdPathCoinType: 60,
      pluginMnemonicKeyName: 'robinhoodMnemonic',
      pluginRegularKeyName: 'robinhoodKey',
      evmGasStationUrl: null,
      networkFees: {}
    }
    const env = {
      builtinTokens: {},
      currencyInfo,
      initOptions: {},
      io: fakeIo,
      log: fakeLog,
      networkInfo
    } as unknown as PluginEnvironment<EthereumNetworkInfo>

    const engine = new EthereumEngine(
      env,
      {} as unknown as EthereumTools,
      {
        id: 'robinhood-wallet',
        type: 'wallet:robinhood',
        keys: { publicKey: WALLET }
      },
      {},
      engineOpts,
      currencyInfo
    )
    await engine.loadEngine()
    engine.walletLocalData.totalBalances[''] = BALANCE
    return engine
  }

  /** Signs a native spend of `spent` wei, gas included, and reads its limit */
  async function signedGasLimit(spent: string): Promise<string> {
    reads = 0
    const engine = await makeEngine()
    const otherParams: EthereumTxOtherParams = {
      arbitrumL1Gas: '10',
      from: [WALLET],
      gas: QUOTED_GAS,
      gasPrice: ethers.BigNumber.from(GAS_PRICE).toHexString(),
      gasUsed: '0',
      isFromMakeSpend: true,
      nonceUsed: '0',
      to: [TO]
    }
    const edgeTransaction = {
      blockHeight: 0,
      currencyCode: 'ETH',
      date: 0,
      isSend: true,
      memos: [],
      nativeAmount: `-${spent}`,
      networkFee: QUOTED_FEE,
      networkFees: [],
      otherParams,
      ourReceiveAddresses: [],
      signedTx: '',
      tokenId: null,
      txid: '',
      walletId: 'robinhood-wallet'
    } as unknown as EdgeTransaction

    const signed = await engine.signTx(edgeTransaction, {
      robinhoodKey: PRIVATE_KEY
    })
    // The chain was asked, so a kept limit is the budget's doing:
    assert.strictEqual(reads, 1)
    return ethers.utils.parseTransaction(signed.signedTx).gasLimit.toString()
  }

  it('raises the limit of a spend the balance covers', async function () {
    assert.strictEqual(await signedGasLimit('100000000000000000'), '21011')
  })

  it('keeps the limit of a max send', async function () {
    // Every wei of the balance is spent, so the extra unit is unaffordable:
    assert.strictEqual(await signedGasLimit(BALANCE), QUOTED_GAS)
  })
})
