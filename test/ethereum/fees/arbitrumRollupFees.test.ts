import { assert } from 'chai'
import { ethers } from 'ethers'
import { createServer, Server } from 'http'
import { after, afterEach, before, beforeEach, describe, it } from 'mocha'
import { AddressInfo } from 'net'

import { EthereumTxOtherParams } from '../../../src/ethereum/ethereumTypes'
import {
  calcArbitrumRollupFees,
  makeArbitrumRollupFeeCache,
  refreshArbitrumL1Gas
} from '../../../src/ethereum/fees/ethMiningFees'

const NODE_INTERFACE = '0x00000000000000000000000000000000000000C8'
const CACHE_MS = 30000
const FROM = '0x0000000000000000000000000000000000000001'
const TO = '0x0000000000000000000000000000000000000002'

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

  describe('makeArbitrumRollupFeeCache', function () {
    let calc: typeof calcArbitrumRollupFees

    beforeEach(function () {
      calc = makeArbitrumRollupFeeCache()
    })

    const read = async (txData: string = '0x'): Promise<string> => {
      const fees = await calc({
        destinationAddress: TO,
        nodeInterfaceAddress: NODE_INTERFACE,
        rpcServers,
        txData
      })
      return fees.l1Gas
    }

    it('reuses a recent figure for the same spend', async function () {
      assert.strictEqual(await read(), '10')
      l1Gas = '123'
      assert.strictEqual(await read(), '10')
      assert.strictEqual(reads, 1)
    })

    it('reads the chain again once the figure has expired', async function () {
      assert.strictEqual(await read(), '10')
      l1Gas = '123'
      advanceClock(CACHE_MS)
      assert.strictEqual(await read(), '123')
      assert.strictEqual(reads, 2)
    })

    it('does not reuse a figure for different data', async function () {
      assert.strictEqual(await read('0x'), '10')
      l1Gas = '123'
      assert.strictEqual(await read('0xabcd'), '123')
    })

    it('keeps a separate figure in each cache', async function () {
      assert.strictEqual(await read(), '10')
      l1Gas = '123'
      calc = makeArbitrumRollupFeeCache()
      assert.strictEqual(await read(), '123')
    })
  })

  describe('refreshArbitrumL1Gas', function () {
    const makeOtherParams = (
      overrides: Partial<EthereumTxOtherParams>
    ): EthereumTxOtherParams => ({
      arbitrumL1Gas: '10',
      from: [FROM],
      gas: '21010',
      gasPrice: '0x1',
      gasUsed: '0',
      isFromMakeSpend: true,
      to: [TO],
      ...overrides
    })

    const refresh = async (
      otherParams: EthereumTxOtherParams,
      gasBudget: string = '1000000'
    ): Promise<void> => {
      await refreshArbitrumL1Gas({
        gasBudget,
        nodeInterfaceAddress: NODE_INTERFACE,
        otherParams,
        rpcServers
      })
    }

    it('raises a limit the chain has outgrown', async function () {
      const otherParams = makeOtherParams({})
      l1Gas = '15'
      await refresh(otherParams)
      assert.strictEqual(otherParams.gas, '21015')
      assert.strictEqual(otherParams.arbitrumL1Gas, '15')
    })

    it('stops the raise at twice the quoted figure', async function () {
      const otherParams = makeOtherParams({})
      l1Gas = '123'
      await refresh(otherParams)
      assert.strictEqual(otherParams.gas, '21020')
      assert.strictEqual(otherParams.arbitrumL1Gas, '20')
    })

    it('reads past a cached figure', async function () {
      const calc = makeArbitrumRollupFeeCache()
      await calc({
        destinationAddress: TO,
        nodeInterfaceAddress: NODE_INTERFACE,
        rpcServers,
        txData: '0x'
      })
      const otherParams = makeOtherParams({})
      l1Gas = '15'
      await refresh(otherParams)
      assert.strictEqual(otherParams.gas, '21015')
    })

    it('raises a limit the balance just covers', async function () {
      const otherParams = makeOtherParams({})
      l1Gas = '15'
      await refresh(otherParams, '21015')
      assert.strictEqual(otherParams.gas, '21015')
    })

    it('keeps the limit of a max send', async function () {
      // A max send's gas uses every unit of the budget at 1 wei per unit:
      const otherParams = makeOtherParams({})
      l1Gas = '11'
      await refresh(otherParams, '21010')
      assert.strictEqual(otherParams.gas, '21010')
      assert.strictEqual(otherParams.arbitrumL1Gas, '10')
    })

    it('prices the raise at the transaction gas price', async function () {
      // At 1000 wei per unit, one more unit of gas costs 1000 wei:
      const otherParams = makeOtherParams({ gasPrice: '0x3e8' })
      l1Gas = '11'
      await refresh(otherParams, '21010999')
      assert.strictEqual(otherParams.gas, '21010')
      await refresh(otherParams, '21011000')
      assert.strictEqual(otherParams.gas, '21011')
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
      const otherParams = makeOtherParams({})
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
