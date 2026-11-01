import { assert } from 'chai'
import { EdgeTransaction } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import type { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import { EthereumNetwork } from '../../../src/ethereum/EthereumNetwork'
import { EvmScanAdapter } from '../../../src/ethereum/networkAdapters/EvmScanAdapter'
import {
  BroadcastRejection,
  findBroadcastRejections
} from '../../../src/ethereum/networkAdapters/networkAdapterTypes'

type EngineFetch = EthereumEngine['engineFetch']

const TXID =
  '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789'

const TX: EdgeTransaction = {
  blockHeight: 0,
  currencyCode: 'ETH',
  date: 1,
  isSend: true,
  memos: [],
  nativeAmount: '-1000',
  networkFee: '21000',
  networkFees: [],
  ourReceiveAddresses: [],
  signedTx: '0x02f8',
  tokenId: null,
  txid: TXID,
  walletId: 'test-wallet'
}

describe('EthereumNetwork broadcastTx failures', function () {
  it('shows the node message when every route refuses', async function () {
    const { network, errors } = makeNetwork([
      rpcError('intrinsic gas too low'),
      rpcError('intrinsic gas too low')
    ])

    let message = ''
    await network.broadcastTx(TX).catch((error: unknown) => {
      message = String(error)
    })

    assert.include(message.split('\n')[0], 'intrinsic gas too low')
    assert.notInclude(message, '[object Object]')
    assert.lengthOf(errors, 2)
    assert.include(errors[0], 'FAILURE https://server0.test')
    assert.include(errors[1], 'FAILURE https://server1.test')
  })

  it('counts an Etherscan NOTOK reply as a refusal', async function () {
    const { network, errors } = makeNetwork([
      rpcError('intrinsic gas too low'),
      {
        message: 'NOTOK',
        result: 'Free API access is not supported for this chain',
        status: '0'
      }
    ])

    let message = ''
    await network.broadcastTx(TX).catch((error: unknown) => {
      message = String(error)
    })

    const [firstLine] = message.split('\n')
    assert.include(firstLine, 'intrinsic gas too low')
    assert.include(firstLine, 'Free API access is not supported')
    assert.lengthOf(errors, 2)
  })

  it('reads a bare string error without JSON quotes', async function () {
    const { network } = makeNetwork([
      { error: 'nonce too low', id: 1, jsonrpc: '2.0' }
    ])

    let message = ''
    await network.broadcastTx(TX).catch((error: unknown) => {
      message = String(error)
    })

    assert.include(message.split('\n')[0], 'nonce too low')
    assert.notInclude(message, '"nonce too low"')
  })

  it('logs no failure when another route delivers the transaction', async function () {
    const { network, errors } = makeNetwork([
      rpcError('already known'),
      { id: 1, jsonrpc: '2.0', result: TXID }
    ])

    await network.broadcastTx(TX)
    assert.deepEqual(errors, [])
  })
})

describe('findBroadcastRejections', function () {
  it('collects refusals from nested aggregates', function () {
    const a = new BroadcastRejection('a', 'nonce too low', '{}')
    const b = new BroadcastRejection('b', 'already known', '{}')
    const error = {
      errors: [{ errors: [a, new Error('timeout')] }, { errors: [b] }]
    }
    assert.deepEqual(findBroadcastRejections(error), [a, b])
  })

  it('finds nothing in a plain error', function () {
    assert.deepEqual(findBroadcastRejections(new Error('offline')), [])
  })
})

function rpcError(message: string): unknown {
  return { error: { code: -32000, message }, id: 1, jsonrpc: '2.0' }
}

/**
 * A network with one Etherscan-style adapter per reply, each answering the
 * broadcast with its reply, and a record of the errors the engine logs.
 */
function makeNetwork(replies: unknown[]): {
  network: EthereumNetwork
  errors: string[]
} {
  const errors: string[] = []
  const adapters = replies.map((reply, i) => {
    const engine = makeEngine(async () => fakeResponse(reply), errors)
    return new EvmScanAdapter(engine, {
      type: 'evmscan',
      servers: [`https://server${i}.test`]
    })
  })
  const network: EthereumNetwork = Object.assign(
    Object.create(EthereumNetwork.prototype),
    {
      ethEngine: makeEngine(async () => fail(), errors),
      networkAdapters: adapters
    }
  )
  return { network, errors }
}

function makeEngine(
  engineFetch: EngineFetch,
  errors: string[]
): EthereumEngine {
  return {
    allTokensMap: {},
    currencyInfo: {
      currencyCode: 'ETH',
      denominations: [{ multiplier: '1000000000000000000', name: 'ETH' }],
      pluginId: 'ethereum'
    },
    engineFetch,
    error: (message: string) => {
      errors.push(message)
    },
    initOptions: { etherscanApiKey: 'test-api-key' },
    log: Object.assign(() => undefined, { warn: () => undefined }),
    networkInfo: { chainParams: { chainId: 1 } },
    walletId: 'test-wallet',
    walletLocalData: { publicKey: '0x0' },
    warn: () => undefined
  } as unknown as EthereumEngine
}

function fakeResponse(json: unknown): Awaited<ReturnType<EngineFetch>> {
  return { json: async () => json, ok: true } as unknown as Awaited<
    ReturnType<EngineFetch>
  >
}

function fail(): never {
  throw new Error('No request expected')
}
