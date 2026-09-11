import { EdgeTokenId } from 'edge-core-js/types'

import { EthereumEngine } from '../EthereumEngine'
import {
  EdgeTransactionsBlockHeightTuple,
  EthereumNetworkUpdate
} from '../EthereumNetwork'
import { asEtherscanGetBlockHeight } from '../ethereumSchema'
import {
  asEvmScanInternalTransaction,
  asEvmScanTokenTransaction,
  asEvmScanTransaction,
  EvmScanAdapter
} from './EvmScanAdapter'
import { BLOCKSCOUT_PRO_HOST } from './evmScanUrl'
import { GetTxsParams, RateLimitError } from './networkAdapterTypes'

/**
 * Per-instance moment (ms since epoch) before which `fetchInternalTxs` is
 * skipped after a throttle reply, shared by every wallet on the same
 * instance so one 429 pauses all of them instead of each rediscovering it.
 */
const internalTxsCooldownUntil = new Map<string, number>()
const INTERNAL_TXS_COOLDOWN_MS = 60 * 1000

/**
 * Public Blockscout instances sit behind Cloudflare, and some of them (the
 * Robinhood Chain one, measured 2026-09-03 from two unrelated IPs) answer a
 * managed challenge page to every request that does not look like it came
 * from a browser: the app's own CFNetwork and OkHttp agents get HTTP 403,
 * a browser's headers get the JSON. Sending them is the same workaround
 * `BlockbookAdapter` applies for Trezor's Blockbook servers. The agent alone
 * stopped being enough on that instance by 2026-09-09, when it began
 * challenging a request that carried only the agent string; it serves one
 * that also carries the `sec-ch-ua` client hint naming the same browser,
 * which is what a Chromium build sends alongside this agent.
 *
 * Getting past the challenge is all these buy. That instance answers
 * `x-ratelimit-limit: 10` per window (measured 2026-09-09, reset roughly
 * every 16 minutes), not the 300 per minute it used to document, so one
 * wallet's sync spends the whole budget in a single pass and every call
 * after that is throttled. A chain whose internal transactions have to come
 * from Blockscout needs a keyed server, not this one.
 */
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36',
  'sec-ch-ua': '"Chromium";v="128", "Not;A=Brand";v="24"'
}

export interface BlockscoutAdapterConfig {
  type: 'blockscout'
  /**
   * Blockscout origins, e.g. `https://eth.blockscout.com` for an instance
   * someone runs, or `https://api.blockscout.com` for the hosted API. The
   * hosted one needs the `blockscoutApiKey` init option and is dropped
   * without it; a list left empty takes the whole adapter out.
   */
  servers: string[]
}

/**
 * A Blockscout instance through its Etherscan-compatible `/api`.
 *
 * Blockscout differs from Etherscan in the places this adapter overrides:
 * block height comes from `module=block&action=eth_block_number`, there is
 * no gastracker module, a partially indexed range answers `status: "2"`,
 * and the per-IP throttle reply carries its text in `message`. Internal
 * transactions are served through `fetchInternalTxs` rather than folded into
 * `fetchTxs`, so a chain whose primary history source cannot see them (the
 * Alchemy adapter on networks without the `internal` category) still gets
 * them merged into every native-asset sync by the engine.
 */
export class BlockscoutAdapter extends EvmScanAdapter<BlockscoutAdapterConfig> {
  // A throttled public instance must not hold a native-asset sync open:
  // after three retries (1s, 2s, 4s) the call throws, the engine marks the
  // pass partial and keeps the query window open for the next attempt.
  protected rateLimitRetries = 3
  protected requestHeaders = BROWSER_HEADERS

  constructor(ethEngine: EthereumEngine, config: BlockscoutAdapterConfig) {
    super(ethEngine, config)

    // The hosted API answers 402 without a key, which `throwError` classifies
    // as a rate limit, so `serialServers` would spend its whole backoff (1s,
    // 2s, 4s) rediscovering that on every call before the waterfall reaches an
    // instance that answers. A keyless build drops the server instead. The
    // app's `env.json` schema fills an unset key with an empty string or an
    // empty list rather than leaving it out, so all three shapes mean no key.
    const { blockscoutApiKey } = ethEngine.initOptions
    const hasApiKey = Array.isArray(blockscoutApiKey)
      ? blockscoutApiKey.length > 0
      : blockscoutApiKey != null && blockscoutApiKey !== ''

    if (!hasApiKey) {
      this.config = {
        ...config,
        servers: config.servers.filter(server => {
          if (!server.includes(BLOCKSCOUT_PRO_HOST)) return true
          ethEngine.warn(
            `Blockscout server dropped: no blockscoutApiKey for ${server}`
          )
          return false
        })
      }
    }

    // With no server left the adapter leaves the waterfall entirely, the way
    // `AlchemyAdapter` does. What that prevents is a false claim and a throw,
    // not a complete-looking history: kept in, `getAllTxsEthscan` would answer
    // an empty server list with zero rows, so `fetchInternalTxs` would mark
    // the tuple `includesInternal` on rows it never fetched, and
    // `fetchBlockheight` would throw on the `undefined` an empty waterfall
    // resolves to. Dropped, the sync still reaches 100%: with no adapter
    // implementing the method, `mergeInternalTxs` returns at its zero-adapter
    // guard, before the `partial` flag that withholds the asset is ever set.
    // Robinhood never reaches here, since only the hosted server carries a key
    // requirement; a chain served by the hosted API alone would sync
    // complete-looking on a keyless build, which this drop does not cover.
    if (this.config.servers.length === 0) {
      this.fetchBlockheight = null
      this.fetchInternalTxs = null
      this.fetchTxs = null
    }
  }

  fetchBlockheight: (() => Promise<EthereumNetworkUpdate>) | null =
    async (): Promise<EthereumNetworkUpdate> => {
      const { result: jsonObj, server } = await this.serialServers(
        async server => {
          const response = await this.fetchGetEtherscan(
            server,
            '?module=block&action=eth_block_number'
          )
          if ('status' in response && response.status === '0') {
            this.handledUnexpectedResponse(server, 'eth_block_number', response)
          }
          return { server, result: response }
        }
      )

      const clean = asEtherscanGetBlockHeight(jsonObj)
      return { blockHeight: clean.result, server }
    }

  fetchTxs: ((params: GetTxsParams) => Promise<EthereumNetworkUpdate>) | null =
    async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
      const { startBlock, tokenId } = params

      let contractAddress: string | undefined
      if (tokenId != null) {
        const tokenInfo = this.ethEngine.allTokensMap[tokenId]
        if (typeof tokenInfo?.networkLocation?.contractAddress !== 'string') {
          return {}
        }
        contractAddress = tokenInfo.networkLocation.contractAddress
      }

      const { allTransactions, server } =
        tokenId == null
          ? await this.getAllTxsEthscan(
              startBlock,
              null,
              asEvmScanTransaction,
              {
                searchRegularTxs: true
              }
            )
          : await this.getAllTxsEthscan(
              startBlock,
              tokenId,
              asEvmScanTokenTransaction,
              { contractAddress }
            )

      return this.makeTxsUpdate(tokenId, startBlock, allTransactions, server, {
        includesInternal: false
      })
    }

  fetchInternalTxs:
    | ((params: GetTxsParams) => Promise<EthereumNetworkUpdate>)
    | null = async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
    const { startBlock } = params
    const cooldownKey = this.config.servers.join(',')
    const cooldownUntil = internalTxsCooldownUntil.get(cooldownKey) ?? 0
    if (Date.now() < cooldownUntil) {
      throw new Error(
        `Blockscout internal transactions paused ${Math.ceil(
          (cooldownUntil - Date.now()) / 1000
        )}s after a rate limit`
      )
    }

    let response: Awaited<ReturnType<typeof this.getAllTxsEthscan>>
    try {
      response = await this.getAllTxsEthscan(
        startBlock,
        null,
        asEvmScanInternalTransaction,
        { searchRegularTxs: false }
      )
    } catch (error: unknown) {
      if (error instanceof RateLimitError) {
        internalTxsCooldownUntil.set(
          cooldownKey,
          Date.now() + INTERNAL_TXS_COOLDOWN_MS
        )
      }
      throw error
    }
    const { allTransactions, server } = response
    return this.makeTxsUpdate(null, startBlock, allTransactions, server, {
      includesInternal: true
    })
  }

  private makeTxsUpdate(
    tokenId: EdgeTokenId,
    startBlock: number,
    edgeTransactions: EdgeTransactionsBlockHeightTuple['edgeTransactions'],
    server: string | undefined,
    options: { includesInternal: boolean }
  ): EthereumNetworkUpdate {
    const tuple: EdgeTransactionsBlockHeightTuple = {
      blockHeight: startBlock,
      edgeTransactions,
      includesInternal: options.includesInternal
    }
    const maxBlockHeight = edgeTransactions.reduce((max, tx) => {
      return Math.max(max, tx.blockHeight)
    }, 0)
    return {
      tokenTxs: new Map([[tokenId, tuple]]),
      blockHeight: maxBlockHeight,
      server: server ?? ''
    }
  }
}
