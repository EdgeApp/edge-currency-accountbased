import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID
} from '@solana/spl-token'
import {
  Connection,
  Keypair,
  MessageV0,
  TransactionError,
  VersionedTransaction
} from '@solana/web3.js'
import { assert } from 'chai'
import {
  EdgeSpendInfo,
  EdgeTokenId,
  EdgeTransaction,
  InsufficientFundsError
} from 'edge-core-js/types'
import { describe, it } from 'mocha'
import { base64 } from 'rfc4648'

import { isSolShortfall, SolanaEngine } from '../../src/solana/SolanaEngine'

const WALLET = Keypair.generate().publicKey
const RECIPIENT = Keypair.generate().publicKey.toBase58()
const BLOCKHASH = Keypair.generate().publicKey.toBase58()
const USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const OTHER_MINT = Keypair.generate().publicKey
// The placeholder address swap plugins pass for a SOL-from swap
const SYSTEM_PROGRAM = '11111111111111111111111111111111'

const FEE = '5000'
// The engine's own rent floor, getMinimumBalanceForRentExemption(50)
const RENT_FLOOR = '1238880'
// A plain token account, getMinimumBalanceForRentExemption(165)
const TOKEN_ACCOUNT_RENT = '2039280'
// A Token-2022 account carrying three extensions is 179 bytes
const TOKEN_2022_ACCOUNT_RENT = '2136720'
// The SOL a wallet must hold to open a plain token account and keep its own
// floor: FEE + TOKEN_ACCOUNT_RENT + RENT_FLOOR
const SOL_REQUIRED = '3283160'

/** What a node says when the wallet cannot fund a new account's rent. */
const ATA_SHORTFALL_LOGS = [
  'Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL invoke [1]',
  'Program 11111111111111111111111111111111 invoke [2]',
  'Transfer: insufficient lamports 1288580, need 2039280',
  'Program 11111111111111111111111111111111 failed: custom program error: 0x1'
]

/**
 * What a node says when a swap opened a token account and then left the
 * wallet below its own rent floor.
 */
const ATA_OPENED_LOGS = [
  'Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL invoke [2]',
  'Program log: CreateIdempotent',
  'Program 11111111111111111111111111111111 invoke [3]',
  'Program 11111111111111111111111111111111 success',
  'Program log: Initialize the associated token account',
  'Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL success'
]

type SimulationAnswer =
  | { err: TransactionError | string; logs: string[] }
  | { remaining: number | null }

interface StubOptions {
  /** The wallet's live SOL balance, as getBalance answers it. */
  balance?: number
  simulation?: SimulationAnswer
  /** Whether the recipient's token account exists on chain. */
  recipientAccountExists?: boolean
  /** Every node fails, as in an outage. */
  down?: boolean
}

interface StubNode {
  connection: Connection
  calls: string[]
}

interface JsonRpcRequest {
  id: number
  method: string
}

const makeStubNode = (options: StubOptions = {}): StubNode => {
  const {
    balance = 10000000,
    simulation = { remaining: balance - 5000 },
    recipientAccountExists = true,
    down = false
  } = options
  const calls: string[] = []

  const answer = (request: JsonRpcRequest): unknown => {
    calls.push(request.method)
    const reply = (result: unknown): unknown => ({
      jsonrpc: '2.0',
      id: request.id,
      result
    })
    const context = { slot: 1 }

    switch (request.method) {
      case 'getBalance':
        return reply({ context, value: balance })
      case 'getAccountInfo':
        return reply({
          context,
          value: recipientAccountExists
            ? {
                data: ['', 'base64'],
                executable: false,
                lamports: Number(TOKEN_ACCOUNT_RENT),
                owner: TOKEN_PROGRAM_ID.toBase58(),
                rentEpoch: 0
              }
            : null
        })
      case 'simulateTransaction': {
        if ('err' in simulation) {
          return reply({
            context,
            value: {
              err: simulation.err,
              logs: simulation.logs,
              accounts: null
            }
          })
        }
        const { remaining } = simulation
        return reply({
          context,
          value: {
            err: null,
            logs: [],
            accounts: [
              remaining == null
                ? null
                : {
                    data: ['', 'base64'],
                    executable: false,
                    lamports: remaining,
                    owner: SYSTEM_PROGRAM,
                    rentEpoch: 0
                  }
            ]
          }
        })
      }
    }
    throw new Error(`Unexpected RPC method ${request.method}`)
  }

  const stubFetch = async (_url: unknown, init: unknown): Promise<Response> => {
    if (down) throw new Error('fetch failed')
    const body = JSON.parse((init as { body: string }).body)
    const payload = Array.isArray(body) ? body.map(answer) : answer(body)
    return new Response(JSON.stringify(payload), {
      headers: { 'content-type': 'application/json' }
    })
  }

  return {
    connection: new Connection('http://localhost/stub', {
      commitment: 'confirmed',
      fetch: stubFetch as never
    }),
    calls
  }
}

interface EngineOptions {
  sol?: string
  usdc?: string
  tokenAccountRent?: string
}

const makeEngine = (
  node: StubNode,
  options: EngineOptions = {}
): SolanaEngine => {
  const {
    sol = '10000000',
    usdc = '50000000',
    tokenAccountRent = TOKEN_ACCOUNT_RENT
  } = options
  const balances: { [tokenId: string]: string } = { sol, [USDC]: usdc }

  // Only the fields makeSpend and getMaxSpendable read, on top of the real
  // SolanaEngine methods.
  const fields: Partial<SolanaEngine> = {
    addressCache: new Map(),
    allTokensMap: {
      [USDC]: {
        currencyCode: 'USDC',
        displayName: 'USD Coin',
        denominations: [{ multiplier: '1000000', name: 'USDC' }],
        networkLocation: { tokenId: USDC }
      }
    },
    base58PublicKey: WALLET.toBase58(),
    feePerSignature: FEE,
    // Zero priority keeps the estimate at the bare signature fee
    getPriorityFee: async () => '0',
    getMinimumAddressBalance: async () => RENT_FLOOR,
    getTokenAccountRent: async () => tokenAccountRent,
    getRecentBlockhash: async () => ({
      blockhash: BLOCKHASH,
      lastValidBlockHeight: 1000
    }),
    getBalance: ({ tokenId }: { tokenId: EdgeTokenId }) =>
      balances[tokenId ?? 'sol'] ?? '0',
    makeSpendCheck: (edgeSpendInfo: EdgeSpendInfo) => ({
      edgeSpendInfo,
      nativeBalance: '0',
      currencyCode: edgeSpendInfo.tokenId == null ? 'SOL' : 'USDC',
      denom: { multiplier: '1000000000', name: 'SOL' },
      skipChecks: false
    }),
    networkInfo: {
      associatedTokenPublicKey: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
      commitment: 'confirmed',
      memoPublicKey: 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
    } as unknown as SolanaEngine['networkInfo'],
    tools: {
      connections: [node.connection],
      getTokenOwnerPublicKey: () => TOKEN_PROGRAM_ID
    } as unknown as SolanaEngine['tools'],
    walletId: 'wallet',
    warn: () => undefined
  }
  return Object.assign(Object.create(SolanaEngine.prototype), fields)
}

/**
 * A prebuilt transaction like the ones swap plugins hand the engine: it opens
 * a token account the wallet does not hold yet.
 */
const makeSwapTx = (): string => {
  const ata = getAssociatedTokenAddressSync(OTHER_MINT, WALLET)
  const message = MessageV0.compile({
    instructions: [
      createAssociatedTokenAccountIdempotentInstruction(
        WALLET,
        ata,
        WALLET,
        OTHER_MINT
      )
    ],
    payerKey: WALLET,
    recentBlockhash: BLOCKHASH
  })
  return base64.stringify(new VersionedTransaction(message).serialize())
}

const tokenSend = (nativeAmount = '1000000'): EdgeSpendInfo => ({
  tokenId: USDC,
  spendTargets: [{ publicAddress: RECIPIENT, nativeAmount }]
})

const solSend = (nativeAmount: string): EdgeSpendInfo => ({
  tokenId: null,
  spendTargets: [{ publicAddress: RECIPIENT, nativeAmount }]
})

const tokenSwap = (): EdgeSpendInfo => ({
  tokenId: USDC,
  spendTargets: [{ publicAddress: USDC, nativeAmount: '1000000' }],
  otherParams: { unsignedTx: makeSwapTx() }
})

const solSwap = (nativeAmount: string): EdgeSpendInfo => ({
  tokenId: null,
  spendTargets: [{ publicAddress: SYSTEM_PROGRAM, nativeAmount }],
  otherParams: { unsignedTx: makeSwapTx() }
})

const makeSpendError = async (
  engine: SolanaEngine,
  spendInfo: EdgeSpendInfo
): Promise<InsufficientFundsError> => {
  try {
    await engine.makeSpend(spendInfo)
  } catch (error: unknown) {
    assert.strictEqual((error as Error).name, 'InsufficientFundsError')
    return error as InsufficientFundsError
  }
  throw new Error('Expected makeSpend to fail')
}

describe('Solana SOL shortfall detection', function () {
  it('reads a rent failure on the wallet as a shortfall', function () {
    assert.isTrue(
      isSolShortfall({ InsufficientFundsForRent: { account_index: 0 } }, [])
    )
  })

  it('reads a missing fee as a shortfall', function () {
    assert.isTrue(isSolShortfall('InsufficientFundsForFee', null))
    assert.isTrue(isSolShortfall('AccountNotFound', null))
  })

  it('reads a failed lamport transfer for a new account as a shortfall', function () {
    assert.isTrue(
      isSolShortfall(
        { InstructionError: [0, { Custom: 1 }] },
        ATA_SHORTFALL_LOGS
      )
    )
  })

  it('does not read a swap failure as a shortfall', function () {
    assert.isFalse(
      isSolShortfall({ InstructionError: [2, { Custom: 6001 }] }, [
        'Program log: Error: Slippage tolerance exceeded'
      ])
    )
  })
})

describe('Solana token send rent', function () {
  it('blocks a send whose new recipient account the wallet cannot fund', async function () {
    const node = makeStubNode({
      balance: 1288580,
      recipientAccountExists: false,
      simulation: {
        err: { InstructionError: [1, { Custom: 1 }] },
        logs: ATA_SHORTFALL_LOGS
      }
    })
    const engine = makeEngine(node, { sol: '1288580' })

    const error = await makeSpendError(engine, tokenSend())
    assert.strictEqual(error.tokenId, null)
    assert.strictEqual(error.networkFee, SOL_REQUIRED)
  })

  it('blocks a send that would leave the wallet below its rent floor', async function () {
    const node = makeStubNode({
      balance: 3200000,
      recipientAccountExists: false,
      simulation: { remaining: 3200000 - 2044280 }
    })
    const engine = makeEngine(node, { sol: '3200000' })

    const error = await makeSpendError(engine, tokenSend())
    assert.strictEqual(error.tokenId, null)
    assert.strictEqual(error.networkFee, SOL_REQUIRED)
  })

  it('shows the exact rent of a Token-2022 recipient account in the fee', async function () {
    const spent = Number(FEE) + Number(TOKEN_2022_ACCOUNT_RENT)
    const node = makeStubNode({
      recipientAccountExists: false,
      simulation: { remaining: 10000000 - spent }
    })
    const engine = makeEngine(node)

    const tx = await engine.makeSpend(tokenSend())
    assert.strictEqual(tx.parentNetworkFee, String(spent))
    assert.strictEqual(tx.networkFee, '0')
    assert.strictEqual(tx.nativeAmount, '-1000000')
  })

  it('falls back to the rent estimate when no node can simulate', async function () {
    const node = makeStubNode({ recipientAccountExists: false })
    const engine = makeEngine(node)
    engine.tools.connections = [makeStubNode({ down: true }).connection]
    engine.addressCache.set(`${RECIPIENT}:${USDC}`, false)

    const tx = await engine.makeSpend(tokenSend())
    assert.strictEqual(tx.parentNetworkFee, '2044280')

    engine.getBalance = () => '3000000'
    const error = await makeSpendError(engine, tokenSend())
    assert.strictEqual(error.networkFee, SOL_REQUIRED)
  })

  it('does not simulate a send to an existing token account', async function () {
    const node = makeStubNode({ recipientAccountExists: true })
    const engine = makeEngine(node)

    const tx = await engine.makeSpend(tokenSend())
    assert.strictEqual(tx.parentNetworkFee, FEE)
    assert.notInclude(node.calls, 'simulateTransaction')
  })
})

describe('Solana SOL send rent', function () {
  it('makes no extra node request for a plain SOL send', async function () {
    const node = makeStubNode()
    const engine = makeEngine(node)

    const tx = await engine.makeSpend(solSend('1000000'))
    assert.strictEqual(tx.networkFee, FEE)
    assert.strictEqual(tx.nativeAmount, '-1005000')
    assert.deepEqual(node.calls, [])
  })

  it('keeps the rent floor out of the spendable balance', async function () {
    const engine = makeEngine(makeStubNode())

    const max = await engine.getMaxSpendable(solSend('0'))
    assert.strictEqual(max, '8756120')
  })

  it('reports no spendable token balance when SOL cannot cover the fee and floor', async function () {
    const engine = makeEngine(makeStubNode(), { sol: '1240000' })

    try {
      await engine.getMaxSpendable(tokenSend('0'))
    } catch (error: unknown) {
      assert.strictEqual((error as Error).name, 'InsufficientFundsError')
      assert.strictEqual((error as InsufficientFundsError).tokenId, null)
      assert.strictEqual(
        (error as InsufficientFundsError).networkFee,
        String(Number(FEE) + Number(RENT_FLOOR))
      )
      return
    }
    throw new Error('Expected getMaxSpendable to fail')
  })
})

describe('Solana swap rent', function () {
  it('blocks a swap that opens a token account the wallet cannot fund', async function () {
    const node = makeStubNode({
      balance: 1288580,
      simulation: {
        err: { InstructionError: [0, { Custom: 1 }] },
        logs: ATA_SHORTFALL_LOGS
      }
    })
    const engine = makeEngine(node, { sol: '1288580' })

    const error = await makeSpendError(engine, tokenSwap())
    assert.strictEqual(error.tokenId, null)
    assert.strictEqual(error.networkFee, SOL_REQUIRED)
    // The placeholder spend target is not a token account to fund
    assert.notInclude(node.calls, 'getAccountInfo')
  })

  it('names the rent of an account the swap opened before it ran short', async function () {
    const node = makeStubNode({
      balance: 2000000,
      simulation: {
        err: { InsufficientFundsForRent: { account_index: 0 } },
        logs: ATA_OPENED_LOGS
      }
    })
    const engine = makeEngine(node, { sol: '2000000' })

    const error = await makeSpendError(engine, tokenSwap())
    assert.strictEqual(error.tokenId, null)
    assert.strictEqual(error.networkFee, SOL_REQUIRED)
  })

  it('adds no rent for an account the swap finds already open', async function () {
    const node = makeStubNode({
      balance: 1000000,
      simulation: {
        err: { InsufficientFundsForRent: { account_index: 0 } },
        logs: [
          'Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL invoke [1]',
          'Program log: CreateIdempotent',
          'Program ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL success'
        ]
      }
    })
    const engine = makeEngine(node, { sol: '1000000' })

    const error = await makeSpendError(engine, tokenSwap())
    assert.strictEqual(
      error.networkFee,
      String(Number(FEE) + Number(RENT_FLOOR))
    )
  })

  it('blocks a swap that leaves the wallet below its rent floor', async function () {
    const node = makeStubNode({
      balance: 3000000,
      simulation: { remaining: 3000000 - 2044280 }
    })
    const engine = makeEngine(node, { sol: '3000000' })

    const error = await makeSpendError(engine, tokenSwap())
    assert.strictEqual(error.tokenId, null)
    assert.strictEqual(error.networkFee, SOL_REQUIRED)
  })

  it('shows the rent a token swap pays in the fee', async function () {
    const node = makeStubNode({ simulation: { remaining: 10000000 - 2044280 } })
    const engine = makeEngine(node)

    const tx = await engine.makeSpend(tokenSwap())
    assert.strictEqual(tx.parentNetworkFee, '2044280')
    assert.strictEqual(tx.networkFee, '0')
    // The swap goes out exactly as the plugin built it
    assert.strictEqual(tx.otherParams?.unsignedTx, makeSwapTx())
  })

  it('shows the rent a SOL swap pays in the fee', async function () {
    const spent = 4000000 + 2044280
    const node = makeStubNode({ simulation: { remaining: 10000000 - spent } })
    const engine = makeEngine(node)

    const tx = await engine.makeSpend(solSwap('4000000'))
    assert.strictEqual(tx.networkFee, '2044280')
    assert.strictEqual(tx.nativeAmount, `-${spent}`)
  })

  it('lets a SOL swap empty the wallet', async function () {
    const node = makeStubNode({ simulation: { remaining: null } })
    const engine = makeEngine(node)

    const tx = await engine.makeSpend(solSwap('9990000'))
    assert.strictEqual(tx.networkFee, '10000')
  })

  it('keeps the estimate when a swap pays SOL back into the wallet', async function () {
    const node = makeStubNode({ simulation: { remaining: 10000000 + 500000 } })
    const engine = makeEngine(node)

    const tx = await engine.makeSpend(tokenSwap())
    assert.strictEqual(tx.parentNetworkFee, FEE)
  })

  it('keeps the estimate when a swap fails for another reason', async function () {
    const node = makeStubNode({
      simulation: {
        err: { InstructionError: [2, { Custom: 6001 }] },
        logs: ['Program log: Error: Slippage tolerance exceeded']
      }
    })
    const engine = makeEngine(node)

    const tx: EdgeTransaction = await engine.makeSpend(tokenSwap())
    assert.strictEqual(tx.parentNetworkFee, FEE)
  })
})

describe('Solana simulateSolSpend', function () {
  it('measures the SOL a transaction takes from the live balance', async function () {
    const node = makeStubNode({
      balance: 7000000,
      simulation: { remaining: 4000000 }
    })
    const engine = makeEngine(node)

    const result = await engine.simulateSolSpend(base64.parse(makeSwapTx()))
    assert.deepEqual(result, {
      type: 'spent',
      spent: '3000000',
      remaining: '4000000'
    })
    assert.sameMembers(node.calls, ['getBalance', 'simulateTransaction'])
  })
})
