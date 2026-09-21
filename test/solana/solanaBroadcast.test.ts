import {
  SignatureStatus,
  TransactionError,
  TransactionExpiredBlockheightExceededError
} from '@solana/web3.js'
import { assert } from 'chai'
import { EdgeTransaction } from 'edge-core-js/types'
import { describe, it } from 'mocha'

import { snooze } from '../../src/common/utils'
import { SolanaEngine } from '../../src/solana/SolanaEngine'

const TXID = '5'.repeat(88)
const LAST_VALID_BLOCK_HEIGHT = 426192700
const HEIGHT = LAST_VALID_BLOCK_HEIGHT - 100
// What a gateway that answers getBlockHeight with the slot reports. The slot
// runs about 5% above the block height, far past any lastValidBlockHeight.
const SLOT_AS_HEIGHT = 448151741

const CONFIRMED_STATUS: SignatureStatus = {
  slot: 448151000,
  confirmations: null,
  err: null,
  confirmationStatus: 'finalized'
}

const never = async <T>(): Promise<T> => await new Promise<T>(() => {})

/** What web3.js throws when a node's height passes lastValidBlockHeight. */
const expire = async (): Promise<never> => {
  throw new TransactionExpiredBlockheightExceededError(TXID)
}

interface FakeNodeOptions {
  send?: () => Promise<string>
  height?: () => Promise<number>
  /** Resolves with the on-chain error once the node sees the transaction. */
  confirm?: () => Promise<TransactionError | null>
  status?: () => Promise<SignatureStatus | null>
}

interface FakeNode {
  sends: number
  sendEncodedTransaction: () => Promise<string>
  getBlockHeight: () => Promise<number>
  confirmTransaction: () => Promise<unknown>
  getSignatureStatuses: () => Promise<unknown>
}

/** A stand-in for a web3.js `Connection` to one RPC node. */
const makeNode = (options: FakeNodeOptions = {}): FakeNode => {
  const {
    send = async () => TXID,
    height = async () => HEIGHT,
    confirm = never,
    status = async () => null
  } = options

  const node: FakeNode = {
    sends: 0,
    sendEncodedTransaction: async () => {
      node.sends++
      return await send()
    },
    getBlockHeight: height,
    confirmTransaction: async () => ({
      context: { slot: 1 },
      value: { err: await confirm() }
    }),
    getSignatureStatuses: async () => ({
      context: { slot: 1 },
      value: [await status()]
    })
  }
  return node
}

const broadcast = async (nodes: FakeNode[]): Promise<EdgeTransaction> => {
  const engine = {
    networkInfo: { stakedConnectionRpcNodes: [] },
    tools: { connections: nodes, makeConnections: () => [] },
    warn: () => undefined
  }
  // Only the fields broadcastTx reads. Partial keeps the field names checked,
  // which `any` would not, and the cast below stands in for the rest.
  const edgeTransaction: Partial<EdgeTransaction> = {
    signedTx: 'c2lnbmVk',
    tokenId: null,
    txid: '',
    otherParams: {
      unsignedTx: '',
      blockhash: 'blockhash',
      lastValidBlockHeight: LAST_VALID_BLOCK_HEIGHT
    }
  }
  return await SolanaEngine.prototype.broadcastTx.call(
    engine,
    edgeTransaction as EdgeTransaction
  )
}

const broadcastError = async (nodes: FakeNode[]): Promise<Error> => {
  try {
    await broadcast(nodes)
  } catch (error: unknown) {
    return error as Error
  }
  throw new Error('Expected broadcastTx to fail')
}

describe('Solana broadcastTx', function () {
  it('confirms while another node falsely expires the transaction', async function () {
    const slotReporter = makeNode({
      height: async () => SLOT_AS_HEIGHT,
      confirm: expire
    })
    const healthy = makeNode({
      confirm: async () => {
        await snooze(50)
        return null
      }
    })

    const tx = await broadcast([slotReporter, healthy])
    assert.equal(tx.txid, TXID)
  })

  it('keeps resubmitting while one node reports a height past expiry', async function () {
    this.timeout(5000)
    const slotReporter = makeNode({ height: async () => SLOT_AS_HEIGHT })
    const healthy = makeNode({
      confirm: async () => {
        await snooze(1500)
        return null
      }
    })

    await broadcast([slotReporter, healthy])
    // The first submission plus the resubmissions while it confirmed:
    assert.isAtLeast(healthy.sends, 2)
  })

  it('does not wait on a node that never answers', async function () {
    const silent = makeNode({ send: never, confirm: never })
    const healthy = makeNode({ confirm: async () => null })

    const tx = await broadcast([silent, healthy])
    assert.equal(tx.txid, TXID)
  })

  it('succeeds when every confirmation fails but a node holds the transaction', async function () {
    const lagging = makeNode({ confirm: expire })
    const holder = makeNode({
      confirm: expire,
      status: async () => CONFIRMED_STATUS
    })

    const tx = await broadcast([lagging, holder])
    assert.equal(tx.txid, TXID)
  })

  it('fails when no node holds the transaction', async function () {
    const error = await broadcastError([
      makeNode({ confirm: expire }),
      makeNode({ confirm: expire })
    ])
    assert.match(error.message, /has expired: block height exceeded/)
  })

  it('fails when the transaction fails on-chain', async function () {
    const failing = makeNode({
      confirm: async () => ({ InstructionError: [0, { Custom: 1 }] })
    })

    const error = await broadcastError([failing])
    assert.equal(
      error.message,
      'Transaction failed: {"InstructionError":[0,{"Custom":1}]}'
    )
  })

  it('fails without RPC connections', async function () {
    const error = await broadcastError([])
    assert.equal(error.message, 'No Solana RPC connections')
  })
})
