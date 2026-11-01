import { assert } from 'chai'
import { ethers } from 'ethers'
import { createServer, Server } from 'http'
import { after, afterEach, before, describe, it } from 'mocha'
import { AddressInfo } from 'net'

import { calcArbitrumRollupFees } from '../../../src/ethereum/fees/ethMiningFees'

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
})
