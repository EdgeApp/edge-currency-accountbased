import {
  EdgeConfirmationState,
  EdgeTableSpec,
  EdgeTokenId,
  EdgeTransaction,
  EdgeTx,
  fromEdgeTx,
  JsonObject,
  toEdgeTx
} from 'edge-core-js/types'

/**
 * Where this engine's transactions live.
 *
 * `EdgeTx` is one document per transaction with the per-asset parts keyed,
 * while this engine has always held one `EdgeTransaction` per asset -- so a
 * token transfer that was two objects in the old JSON file is one row here,
 * and the core's converters do the widening and the projecting.
 *
 * What they cannot carry is the residue: `otherParams` is free-form and
 * plugin-controlled, and the engine's own `confirmations` verdict is not
 * derivable from a block height. Those live in this table, beside the
 * transaction rather than inside it.
 */

/*
 * Every table this engine owns, declared together.
 *
 * Bumping the version **drops all of them**, so the declaration names what
 * the engine will want rather than only what it writes today: adding a table
 * later would take the rows in the others with it.
 */
export const txStoreTables: EdgeTableSpec = {
  version: 1,
  tables: {
    /** One row, holding the wallet state that used to be a JSON file. */
    meta: { key: ['id'] },
    txDetail: { key: ['txid'] }
  }
}

/** The part of one asset's `EdgeTransaction` that `EdgeTx` has no room for. */
export interface TxAssetDetail {
  /**
   * Resolving a `tokenId` needs the wallet's token map, and a token the user
   * has since removed is no longer in it -- so this is recorded rather than
   * looked up again.
   */
  currencyCode: string

  /**
   * 'dropped' and 'failed' are verdicts, not heights: nothing in the stored
   * transaction implies either one, so losing this would resurrect a dropped
   * transaction as merely unconfirmed on every restart.
   */
  confirmations?: EdgeConfirmationState

  otherParams?: JsonObject
}

/**
 * One row per transaction, holding every asset's residue.
 *
 * Keyed by txid alone, because `putRows` replaces a row rather than merging
 * it: a per-asset key would mean the token write erasing what the chain write
 * put there. The engine has the whole transaction in memory, so it writes the
 * whole row.
 */
export interface TxDetail {
  txid: string
  /** Keyed the way this engine has always spelled a `tokenId` in JSON. */
  assets: { [safeTokenId: string]: TxAssetDetail }
}

/** The residue of one asset's view of a transaction. */
export function assetDetail(tx: EdgeTransaction): TxAssetDetail {
  const out: TxAssetDetail = { currencyCode: tx.currencyCode }
  if (tx.confirmations != null) out.confirmations = tx.confirmations
  if (tx.otherParams != null) out.otherParams = tx.otherParams
  return out
}

/**
 * One transaction, as the database takes it.
 *
 * Every asset becomes its own `EdgeTx`; the write path merges them back into
 * one document under the txid, which is the same merge that lets two separate
 * sync passes agree.
 */
export function splitTransaction(
  assets: Array<[string, EdgeTransaction]>,
  pluginId: string
): { txs: EdgeTx[]; detail: TxDetail } {
  const txs: EdgeTx[] = []

  /*
   * The txid as the transaction spells it, which is *not* how the engine
   * keys its own maps -- `normalizeAddress` strips an EVM `0x`. Keying the
   * row the engine's way would make it unreachable from a stored `EdgeTx`,
   * and the miss is silent: the join falls back and the transaction comes
   * back looking fine, minus everything this row was holding.
   */
  const detail: TxDetail = { txid: assets[0][1].txid, assets: {} }

  for (const [safeTokenId, tx] of assets) {
    txs.push(toEdgeTx(tx, pluginId))
    detail.assets[safeTokenId] = assetDetail(tx)
  }
  return { txs, detail }
}

/**
 * One asset's view of a stored transaction, put back together.
 *
 * Returns nothing when the asset cannot be named: an `EdgeTransaction`
 * requires a `currencyCode`, and inventing one would put a transaction in the
 * list under an asset that does not exist.
 */
export function joinTransaction(
  tx: EdgeTx,
  tokenId: EdgeTokenId,
  detail: TxDetail | undefined,
  fallbackCurrencyCode: (tokenId: EdgeTokenId) => string | undefined
): EdgeTransaction | undefined {
  const asset = detail?.assets?.[tokenId ?? '']
  const currencyCode = asset?.currencyCode ?? fallbackCurrencyCode(tokenId)
  if (currencyCode == null) return

  const out = fromEdgeTx(tx, tokenId, currencyCode)
  if (asset?.confirmations != null) out.confirmations = asset.confirmations
  if (asset?.otherParams != null) out.otherParams = asset.otherParams
  return out
}
