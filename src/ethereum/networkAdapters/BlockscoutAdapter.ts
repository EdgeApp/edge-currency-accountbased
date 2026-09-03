import { EdgeTokenId } from 'edge-core-js/types'

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
import { GetTxsParams, RateLimitError } from './networkAdapterTypes'

/**
 * Per-instance moment (ms since epoch) before which `fetchInternalTxs` is
 * skipped after a throttle reply, shared by every wallet on the same
 * instance so one 429 pauses all of them instead of each rediscovering it.
 */
const internalTxsCooldownUntil = new Map<string, number>()
const INTERNAL_TXS_COOLDOWN_MS = 60 * 1000

export interface BlockscoutAdapterConfig {
  type: 'blockscout'
  /** Blockscout instance origins, e.g. `https://eth.blockscout.com` */
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

  fetchBlockheight = async (): Promise<EthereumNetworkUpdate> => {
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

  fetchTxs = async (params: GetTxsParams): Promise<EthereumNetworkUpdate> => {
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
        ? await this.getAllTxsEthscan(startBlock, null, asEvmScanTransaction, {
            searchRegularTxs: true
          })
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

  fetchInternalTxs = async (
    params: GetTxsParams
  ): Promise<EthereumNetworkUpdate> => {
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
