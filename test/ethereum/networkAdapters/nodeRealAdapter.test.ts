import { assert } from 'chai'
import { describe, it } from 'mocha'

import { EthereumEngine } from '../../../src/ethereum/EthereumEngine'
import {
  builtinTokens,
  currencyInfo
} from '../../../src/ethereum/info/robinhoodInfo'
import {
  NodeRealAdapter,
  NodeRealTransfer
} from '../../../src/ethereum/networkAdapters/NodeRealAdapter'

const SERVER = 'https://opbnb-mainnet.nodereal.io/v1/key'
const ourAddress = '0x9488eed0543de2a64dd73d0e8e3bbd87915516b7'
const otherAddress = '0x4ef026964fdec686efb7594835cb681faf44bc25'
const usdcAddress = '0x80e0e24718dbfcad49ecaa6f1e6c89a190586ca8'
const usdcTokenId = '80e0e24718dbfcad49ecaa6f1e6c89a190586ca8'
const walletId = 'VWJmHu/i8kqi6Ru6/B0UQlTEy38jZJsgIp670NkeoxI='

interface Request {
  addressType: string
  category: string[]
  contractAddresses?: string[]
  excludeZeroValue: boolean
  pageKey?: string
}

/** Answers each request with the reply the test picks, and records it */
function makeAdapter(
  respond: (request: Request, url: string) => unknown,
  servers: string[] = [SERVER]
): {
  adapter: NodeRealAdapter
  requests: Request[]
} {
  const requests: Request[] = []
  const engine = {
    allTokensMap: builtinTokens,
    currencyInfo,
    walletId,
    walletLocalData: { publicKey: ourAddress },
    async engineFetch(url: string, opts: { body: string }) {
      const request: Request = JSON.parse(opts.body).params[0]
      requests.push(request)
      const reply = respond(request, url)
      return {
        ok: true,
        status: 200,
        json: async () => reply,
        text: async () => JSON.stringify(reply)
      }
    },
    error() {},
    log() {},
    warn() {}
  }
  const adapter = new NodeRealAdapter(engine as unknown as EthereumEngine, {
    type: 'nodereal',
    servers
  })
  return { adapter, requests }
}

const page = (
  transfers: NodeRealTransfer[],
  pageKey: string = ''
): { result: { transfers: NodeRealTransfer[]; pageKey: string } } => ({
  result: { transfers, pageKey }
})

const makeRow = (
  overrides: Partial<NodeRealTransfer> & { hash: string; blockNum: string }
): NodeRealTransfer => ({
  category: 'external',
  from: otherAddress,
  to: ourAddress,
  value: '0x38d7ea4c68000',
  contractAddress: '0x0000000000000000000000000000000000000000',
  blockTimeStamp: 1792920097,
  gas: 21000,
  gasPrice: 1000000,
  gasUsed: 21000,
  l1Fee: '0x',
  receiptsStatus: 1,
  logIndex: 0,
  traceIndex: 0,
  ...overrides
})

const hashA = `0x${'a'.repeat(64)}`
const hashB = `0x${'b'.repeat(64)}`
const hashC = `0x${'c'.repeat(64)}`
const hashD = `0x${'d'.repeat(64)}`

describe('NodeRealAdapter fetchTxs', function () {
  it('pages newest first and stops at the start block', async function () {
    const { adapter, requests } = makeAdapter(request => {
      if (request.addressType === 'to') {
        return page([
          makeRow({
            hash: hashD,
            blockNum: '0x5f',
            category: 'internal',
            traceIndex: 4,
            gas: undefined,
            gasPrice: undefined,
            l1Fee: undefined
          })
        ])
      }
      const send = { from: ourAddress, to: otherAddress }
      if (request.pageKey == null) {
        return page(
          [makeRow({ ...send, hash: hashA, blockNum: '0x64', l1Fee: '0x3e8' })],
          'p2'
        )
      }
      return page(
        [
          makeRow({ ...send, hash: hashB, blockNum: '0x5a' }),
          makeRow({ ...send, hash: hashC, blockNum: '0x32' })
        ],
        'p3'
      )
    })

    const update = await adapter.fetchTxs({
      startBlock: 60,
      startDate: 0,
      tokenId: null
    })

    assert.notInclude(
      requests.map(request => request.pageKey),
      'p3'
    )
    for (const request of requests) {
      assert.deepEqual(request.category, ['external', 'internal'])
      assert.equal(request.excludeZeroValue, request.addressType === 'to')
    }
    assert.equal(update.blockHeight, 100)
    const tuple = update.tokenTxs?.get(null)
    assert.equal(tuple?.includesInternal, true)
    const txs = tuple?.edgeTransactions ?? []
    assert.deepEqual(
      txs.map(tx => tx.txid).sort((a, b) => a.localeCompare(b)),
      [hashA, hashB, hashD]
    )

    const txA = txs.find(tx => tx.txid === hashA)
    assert.equal(txA?.networkFee, '21000001000')
    assert.equal(txA?.nativeAmount, '-1000021000001000')
    assert.equal(txA?.isSend, true)
    assert.equal(txA?.date, 1792920097)
    const txD = txs.find(tx => tx.txid === hashD)
    assert.equal(txD?.nativeAmount, '1000000000000000')
    assert.equal(txD?.networkFee, '0')
  })

  it('keeps only its own reverted sends, as failed fee-only rows', async function () {
    const { adapter } = makeAdapter(request =>
      request.addressType === 'from'
        ? page([
            makeRow({
              hash: hashA,
              blockNum: '0x64',
              from: ourAddress,
              to: otherAddress,
              receiptsStatus: 0
            })
          ])
        : page([makeRow({ hash: hashB, blockNum: '0x65', receiptsStatus: 0 })])
    )

    const update = await adapter.fetchTxs({
      startBlock: 0,
      startDate: 0,
      tokenId: null
    })

    const txs = update.tokenTxs?.get(null)?.edgeTransactions ?? []
    assert.lengthOf(txs, 1)
    assert.equal(txs[0].txid, hashA)
    assert.equal(txs[0].confirmations, 'failed')
    assert.equal(txs[0].nativeAmount, '-21000000000')
  })

  it('charges a token spend only when the wallet signed it', async function () {
    const tokenRow = {
      category: '20',
      contractAddress: usdcAddress,
      from: ourAddress,
      to: otherAddress,
      value: `0x${'0'.repeat(56)}02faf080`
    }
    const { adapter, requests } = makeAdapter(request => {
      if (request.category[0] === 'external') {
        return page([
          makeRow({
            hash: hashA,
            blockNum: '0x64',
            from: ourAddress,
            to: usdcAddress,
            value: '0x0'
          })
        ])
      }
      if (request.addressType === 'to') return page([])
      return page([
        makeRow({ ...tokenRow, hash: hashA, blockNum: '0x64', logIndex: 3 }),
        makeRow({ ...tokenRow, hash: hashB, blockNum: '0x63', logIndex: 1 })
      ])
    })

    const update = await adapter.fetchTxs({
      startBlock: 0,
      startDate: 0,
      tokenId: usdcTokenId
    })

    const tokenRequests = requests.filter(
      request => request.category[0] === '20'
    )
    assert.lengthOf(tokenRequests, 2)
    for (const request of tokenRequests) {
      assert.deepEqual(
        request.contractAddresses?.map(address => address.toLowerCase()),
        [usdcAddress]
      )
      assert.equal(request.excludeZeroValue, true)
    }
    const spendRequest = requests.find(
      request => request.category[0] === 'external'
    )
    assert.equal(spendRequest?.addressType, 'from')
    assert.equal(spendRequest?.excludeZeroValue, false)

    const tuple = update.tokenTxs?.get(usdcTokenId)
    assert.equal(tuple?.includesInternal, false)
    const txs = tuple?.edgeTransactions ?? []
    const signed = txs.find(tx => tx.txid === hashA)
    assert.equal(signed?.nativeAmount, '-50000000')
    assert.equal(signed?.parentNetworkFee, '21000000000')
    const pulled = txs.find(tx => tx.txid === hashB)
    assert.equal(pulled?.nativeAmount, '-50000000')
    assert.isUndefined(pulled?.parentNetworkFee)
  })

  it('retries a rate-limited page without starting over', async function () {
    this.timeout(5000)
    let limited = 0
    const { adapter, requests } = makeAdapter(request => {
      if (request.addressType === 'to') return page([])
      if (request.pageKey == null) {
        return page([makeRow({ hash: hashA, blockNum: '0x64' })], 'p2')
      }
      if (limited === 0) {
        limited++
        return {
          error: {
            code: -32005,
            message: 'reached the maximum API usage limit'
          }
        }
      }
      return page([makeRow({ hash: hashB, blockNum: '0x63' })])
    })

    const update = await adapter.fetchTxs({
      startBlock: 0,
      startDate: 0,
      tokenId: null
    })

    assert.equal(limited, 1)
    const firstPages = requests.filter(
      request => request.addressType === 'from' && request.pageKey == null
    )
    assert.lengthOf(firstPages, 1)
    assert.deepEqual(
      update.tokenTxs
        ?.get(null)
        ?.edgeTransactions.map(tx => tx.txid)
        .sort((a, b) => a.localeCompare(b)),
      [hashA, hashB]
    )
  })

  it('moves to the next endpoint when one fails', async function () {
    const brokenServer = 'https://opbnb-mainnet.nodereal.io/v1/broken'
    const { adapter } = makeAdapter(
      (request, url) =>
        url === brokenServer
          ? { error: { code: -32000, message: 'internal error' } }
          : page(
              request.addressType === 'to'
                ? [makeRow({ hash: hashA, blockNum: '0x64' })]
                : []
            ),
      [brokenServer, SERVER]
    )

    const update = await adapter.fetchTxs({
      startBlock: 0,
      startDate: 0,
      tokenId: null
    })

    assert.equal(update.server, 'opbnb-mainnet.nodereal.io')
    assert.deepEqual(
      update.tokenTxs?.get(null)?.edgeTransactions.map(tx => tx.txid),
      [hashA]
    )
  })
})
