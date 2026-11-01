import { assert } from 'chai'
import { ethers } from 'ethers'
import { createServer, Server } from 'http'
import { after, afterEach, before, describe, it } from 'mocha'
import { AddressInfo } from 'net'

import { EthereumTxOtherParams } from '../../../src/ethereum/ethereumTypes'
import {
  calcArbitrumRollupFees,
  refreshArbitrumL1Gas
} from '../../../src/ethereum/fees/ethMiningFees'

const NODE_INTERFACE = '0x00000000000000000000000000000000000000C8'
const CACHE_MS = 30000

// Each test uses its own destination, so the shared cache never carries a
// figure from one test into the next:
const destination = (index: number): string =>
  `0x${index.toString(16).padStart(40, '0')}`

describe('Arbitrum L1 gas', function () {
  let server: Server
  let rpcServers: string[]
  let l1Gas = '10'
  let reads = 0
  let rpcIsDown = false

  const realNow = Date.now
  const advanceClock = (ms: number): void => {
    Date.now = () => realNow() + ms
  }

  before(async function () {
    server = createServer((request, response) => {
      let body = ''
      request.on('data', chunk => {
        body += String(chunk)
      })
      request.on('end', () => {
        if (rpcIsDown) {
          response.writeHead(500)
          response.end()
          return
        }
        const { id, method } = JSON.parse(body)
        let result = '0x1'
        if (method === 'eth_call') {
          reads++
          result = ethers.utils.defaultAbiCoder.encode(
            ['uint64', 'uint256', 'uint256'],
            [l1Gas, '20000000', '30000000']
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
    rpcServers = [`http://127.0.0.1:${port}`]
  })

  after(function () {
    server.close()
  })

  afterEach(function () {
    Date.now = realNow
    l1Gas = '10'
    reads = 0
    rpcIsDown = false
  })

  const read = async (
    destinationAddress: string,
    txData: string = '0x',
    servers: string[] = rpcServers
  ): Promise<string> => {
    const fees = await calcArbitrumRollupFees({
      destinationAddress,
      nodeInterfaceAddress: NODE_INTERFACE,
      rpcServers: servers,
      txData
    })
    return fees.l1Gas
  }

  describe('calcArbitrumRollupFees', function () {
    it('reuses a recent figure for the same spend', async function () {
      assert.strictEqual(await read(destination(1)), '10')
      l1Gas = '123'
      assert.strictEqual(await read(destination(1)), '10')
      assert.strictEqual(reads, 1)
    })

    it('reads the chain again once the figure has expired', async function () {
      assert.strictEqual(await read(destination(2)), '10')
      l1Gas = '123'
      advanceClock(CACHE_MS)
      assert.strictEqual(await read(destination(2)), '123')
      assert.strictEqual(reads, 2)
    })

    it('does not reuse a figure for different data', async function () {
      assert.strictEqual(await read(destination(3), '0x'), '10')
      l1Gas = '123'
      assert.strictEqual(await read(destination(3), '0xabcd'), '123')
    })

    it('does not reuse a figure from another chain', async function () {
      assert.strictEqual(await read(destination(4)), '10')
      l1Gas = '123'
      // The same server under another URL stands in for another chain:
      const otherChain = [rpcServers[0].replace('127.0.0.1', 'localhost')]
      assert.strictEqual(await read(destination(4), '0x', otherChain), '123')
    })
  })

  describe('refreshArbitrumL1Gas', function () {
    const makeOtherParams = (
      overrides: Partial<EthereumTxOtherParams>
    ): EthereumTxOtherParams => ({
      arbitrumL1Gas: '10',
      from: [destination(100)],
      gas: '21010',
      gasPrice: '0x1',
      gasUsed: '0',
      isFromMakeSpend: true,
      to: [destination(101)],
      ...overrides
    })

    const refresh = async (
      otherParams: EthereumTxOtherParams
    ): Promise<void> => {
      await refreshArbitrumL1Gas({
        nodeInterfaceAddress: NODE_INTERFACE,
        otherParams,
        rpcServers
      })
    }

    it('raises a limit the chain has outgrown', async function () {
      const otherParams = makeOtherParams({})
      l1Gas = '123'
      await refresh(otherParams)
      assert.strictEqual(otherParams.gas, '21123')
      assert.strictEqual(otherParams.arbitrumL1Gas, '123')
    })

    it('reads past a live cache entry', async function () {
      const destinationAddress = destination(5)
      assert.strictEqual(await read(destinationAddress), '10')
      const otherParams = makeOtherParams({ to: [destinationAddress] })
      l1Gas = '123'
      await refresh(otherParams)
      assert.strictEqual(otherParams.gas, '21123')
    })

    it('keeps the limit when the chain wants less', async function () {
      const otherParams = makeOtherParams({ arbitrumL1Gas: '63', gas: '21063' })
      l1Gas = '10'
      await refresh(otherParams)
      assert.strictEqual(otherParams.gas, '21063')
      assert.strictEqual(otherParams.arbitrumL1Gas, '63')
    })

    it('leaves transactions without an L1 figure alone', async function () {
      const otherParams = makeOtherParams({ arbitrumL1Gas: undefined })
      await refresh(otherParams)
      assert.strictEqual(otherParams.gas, '21010')
      assert.strictEqual(reads, 0)
    })

    it('rejects when no server answers', async function () {
      const otherParams = makeOtherParams({ to: [destination(6)] })
      rpcIsDown = true
      let failed = false
      await refresh(otherParams).catch(() => {
        failed = true
      })
      assert.isTrue(failed)
      assert.strictEqual(otherParams.gas, '21010')
    })
  })
})
