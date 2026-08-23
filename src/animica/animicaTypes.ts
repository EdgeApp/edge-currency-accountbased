import {
  asArray,
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  Cleaner
} from 'cleaners'

import { asNumberString, asWalletInfo } from '../common/types'
import { hexToDecimal } from '../common/utils'

export interface AnimicaNetworkInfo {
  /** JSON-RPC 2.0 endpoints, tried in order. */
  rpcServers: string[]
  /** Explorer REST base, the only source of transaction history. */
  explorerApi: string
  chainId: number
  genesisHash: string
  /** Goes into the signing wrapper; the node rejects signatures without it. */
  forkId: number
  /** Gas units a native transfer uses. */
  gasLimit: string
  /** Floor for `eth_gasPrice`, in nANM per gas unit. */
  defaultGasPrice: string
  /** Blocks a transaction stays valid for after it is built. */
  validityWindow: number
  pluginMnemonicKeyName: string
}

//
// Info Payload
//

export const asAnimicaInfoPayload = asObject({
  rpcServers: asOptional(asArray(asString)),
  explorerApi: asOptional(asString)
})
export type AnimicaInfoPayload = ReturnType<typeof asAnimicaInfoPayload>

//
// Wallet Local Data
//

/**
 * The explorer scans blocks backwards from the chain tip, so the engine keeps
 * one contiguous scanned range and extends it at both ends: new blocks at the
 * top every poll, older history at the bottom until it reaches genesis.
 */
export const asAnimicaWalletOtherData = asObject({
  /** Highest block height whose transactions have been scanned. */
  scanTop: asOptional(asNumber),
  /** First unscanned height below `scanTop`; where the backfill resumes. */
  scanBottom: asOptional(asNumber),
  /** True once the backfill has reached genesis. */
  historyComplete: asOptional(asBoolean, false)
})
export type AnimicaWalletOtherData = ReturnType<typeof asAnimicaWalletOtherData>

//
// Wallet Info and Keys:
//

export const asSafeAnimicaWalletInfo = asWalletInfo(
  asObject({
    /** The bech32m address. */
    publicKey: asString,
    /**
     * The full ML-DSA-65 public key. The address only commits to its hash,
     * so this is the only way to recover the key without the seed.
     */
    publicKeyHex: asOptional(asString)
  })
)
export type SafeAnimicaWalletInfo = ReturnType<typeof asSafeAnimicaWalletInfo>

export interface AnimicaPrivateKeys {
  mnemonic?: string
  /** 32-byte ML-DSA-65 seed, hex. */
  privateKey?: string
}
export const asAnimicaPrivateKeys = (
  pluginId: string
): Cleaner<AnimicaPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Mnemonic`]: asOptional(asString),
    [`${pluginId}Key`]: asOptional(asString)
  })

  return asCodec(
    raw => {
      const from = asKeys(raw)
      return {
        mnemonic: from[`${pluginId}Mnemonic`],
        privateKey: from[`${pluginId}Key`]
      }
    },
    clean => {
      return {
        ...(clean.mnemonic != null
          ? { [`${pluginId}Mnemonic`]: clean.mnemonic }
          : {}),
        ...(clean.privateKey != null
          ? { [`${pluginId}Key`]: clean.privateKey }
          : {})
      }
    }
  )
}

//
// Transactions
//

/** Everything `signTx` needs to rebuild the body `makeSpend` priced. */
export const asAnimicaTxOtherParams = asObject({
  unsignedTx: asObject({
    /** Recipient account digest, hex. */
    to: asString,
    /** nANM, decimal. */
    amount: asString,
    /** Payload data, hex (empty for a plain transfer). */
    data: asString,
    /** nANM per gas unit, decimal. */
    gasPrice: asString,
    gasLimit: asString,
    validAfter: asNumber,
    validUntil: asNumber,
    /** Random salt, hex. */
    salt: asString
  })
})
export type AnimicaTxOtherParams = ReturnType<typeof asAnimicaTxOtherParams>

//
// JSON-RPC
//

export const asAnimicaRpcError = asObject({
  code: asNumber,
  message: asString,
  data: asOptional(asUnknown)
})
export type AnimicaRpcErrorBody = ReturnType<typeof asAnimicaRpcError>

export const asAnimicaRpcResponse = asObject({
  result: asOptional(asUnknown),
  error: asOptional(asAnimicaRpcError)
})

export const asAnimicaHead = asObject({
  height: asNumber
})

/** A `0x`-prefixed hex quantity (balances, gas price), cleaned to decimal. */
export const asAnimicaHexQuantity: Cleaner<string> = raw => {
  const hex = asString(raw)
  if (!/^0x[0-9a-fA-F]+$/.test(hex)) {
    throw new TypeError('Expected a hex quantity')
  }
  return hexToDecimal(hex)
}

//
// Explorer REST
//

export const asAnimicaExplorerTx = asObject({
  hash: asString,
  from: asMaybe(asString),
  to: asMaybe(asString),
  /** nANM, decimal. */
  value: asMaybe(asNumberString, '0'),
  status: asMaybe(asString),
  blockNumber: asMaybe(asNumber),
  /** Block time, seconds. */
  timestamp: asMaybe(asNumber),
  gasPrice: asMaybe(asNumberString),
  gasLimit: asMaybe(asNumberString),
  classification: asMaybe(
    asObject({
      failed: asMaybe(asBoolean)
    })
  )
})
export type AnimicaExplorerTx = ReturnType<typeof asAnimicaExplorerTx>

/**
 * One page of `GET /address/{address}`. The explorer scans a bounded window
 * of blocks per call, newest first; `nextCursor` is the first height it did
 * not reach (absent once the scan hit genesis), and `scannedBlocks` counts
 * the blocks it did.
 */
export const asAnimicaAddressHistory = asObject({
  txs: asArray(asUnknown),
  nextCursor: asMaybe(asString),
  scannedBlocks: asNumber,
  partial: asBoolean
})
