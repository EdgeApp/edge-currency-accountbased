import {
  asArray,
  asBoolean,
  asCodec,
  asEither,
  asMaybe,
  asNull,
  asNumber,
  asObject,
  asOptional,
  asString,
  asUnknown,
  asValue,
  Cleaner
} from 'cleaners'

export interface HyperCoreNetworkInfo {
  /** Hyperliquid API base, serving both `/info` and `/exchange`. */
  apiServers: string[]

  /** HyperEVM JSON-RPC servers, used to reach the balance checker. */
  evmRpcServers: string[]

  /**
   * HyperEVM contract that batch-reads HyperCore spot balances through the
   * spot-balance precompile. The fallback when the info API is unreachable.
   */
  balanceCheckerContract: string

  /** The spot token that is the wallet's native currency (HYPE). */
  nativeToken: HyperCoreTokenLocation

  /**
   * Quote tokens that can pay the one-time fee HyperCore charges the sender
   * of the first transfer to an account that does not exist yet, in the
   * order the engine offers them.
   */
  activationFeeTokenIds: string[]

  /** Amount of the activation fee, in whole quote-token units. */
  activationFee: string

  hyperliquidChain: 'Mainnet' | 'Testnet'

  /** The chain id user-signed actions carry in their EIP-712 domain. */
  signatureChainId: string
}

/**
 * Everything the API needs to name a spot token. `contractAddress` is the
 * token's 16-byte HyperCore token id, which is permanent, as are the name and
 * index assigned at deploy time.
 */
export interface HyperCoreTokenLocation {
  contractAddress: string
  name: string
  index: number
}

export const asHyperCoreTokenLocation = asObject({
  contractAddress: asString,
  name: asString,
  index: asNumber
})

//
// Info Payload
//

export const asHyperCoreInfoPayload = asObject({
  apiServers: asOptional(asArray(asString)),
  evmRpcServers: asOptional(asArray(asString)),
  balanceCheckerContract: asOptional(asString)
})
export type HyperCoreInfoPayload = ReturnType<typeof asHyperCoreInfoPayload>

//
// Wallet data
//

export const asHyperCoreWalletOtherData = asObject({
  /** Time (ms) of the newest ledger update processed. */
  ledgerCursor: asMaybe(asNumber, 0),

  /**
   * Sends whose ledger hash was not visible yet when broadcast finished,
   * keyed by nonce. History reuses these txids so the send is not listed
   * twice once its ledger entry arrives.
   */
  unresolvedNonces: asMaybe(asObject(asString), () => ({}))
})
export type HyperCoreWalletOtherData = ReturnType<
  typeof asHyperCoreWalletOtherData
>

//
// Keys
//

export interface HyperCorePrivateKeys {
  mnemonic?: string
  privateKey: string
}
export const asHyperCorePrivateKeys = (
  pluginId: string
): Cleaner<HyperCorePrivateKeys> => {
  const asMnemonic = asObject({ [`${pluginId}Mnemonic`]: asOptional(asString) })
  const asKey = asObject({ [`${pluginId}Key`]: asString })

  return asCodec(
    raw => ({
      mnemonic: asMnemonic(raw)[`${pluginId}Mnemonic`],
      privateKey: asKey(raw)[`${pluginId}Key`]
    }),
    clean => ({
      ...(clean.mnemonic != null
        ? { [`${pluginId}Mnemonic`]: clean.mnemonic }
        : {}),
      [`${pluginId}Key`]: clean.privateKey
    })
  )
}

/** The fields of a `sendAsset` typed-data request that `signMessage` checks. */
export const asSendAssetTypedData = asObject({
  domain: asObject({
    name: asString,
    chainId: asEither(asNumber, asString)
  }),
  message: asObject({
    hyperliquidChain: asString,
    destination: asString,
    sourceDex: asString,
    token: asString,
    amount: asString,
    fromSubAccount: asString
  })
})

/** The `types` of an EIP-712 typed-data request. */
export const asTypedDataTypes = asObject(
  asArray(asObject({ name: asString, type: asString }))
)
export type TypedDataTypes = ReturnType<typeof asTypedDataTypes>

/**
 * The fields of a relay `NonceMapping` typed-data request that `signMessage`
 * checks.
 */
export const asNonceMappingTypedData = asObject({
  domain: asObject({
    name: asString,
    version: asString,
    chainId: asEither(asNumber, asString),
    verifyingContract: asString
  }),
  message: asObject({
    chainId: asString,
    wallet: asString,
    depositor: asString
  })
})

/** `signMessage` only signs EIP-712 typed data, passed as JSON. */
export const asHyperCoreSignMessageParams = asOptional(
  asObject({
    typedData: asOptional(asBoolean, false)
  }),
  { typedData: false }
)

//
// Info API
//

export const asSpotMeta = asObject({
  tokens: asArray(
    asObject({
      name: asString,
      index: asNumber,
      tokenId: asString,
      weiDecimals: asNumber,
      fullName: asOptional(asEither(asString, asNull))
    })
  )
})
export type HyperCoreSpotMeta = ReturnType<typeof asSpotMeta>
export type HyperCoreSpotToken = HyperCoreSpotMeta['tokens'][number]

export const asSpotClearinghouseState = asObject({
  balances: asArray(
    asObject({
      coin: asString,
      token: asNumber,
      total: asString,
      hold: asString
    })
  )
})

export const asUserRole = asObject({
  role: asString
})

const asSpotTransferDelta = asObject({
  type: asValue('spotTransfer' as const),
  token: asString,
  amount: asString,
  user: asString,
  destination: asString,
  fee: asOptional(asString, '0'),
  nativeTokenFee: asOptional(asString, '0'),
  feeToken: asOptional(asString, ''),
  nonce: asOptional(asNumber)
})

/** `sendAsset`, which can move tokens between the spot and perp dexes. */
const asSendDelta = asObject({
  type: asValue('send' as const),
  token: asString,
  amount: asString,
  user: asString,
  destination: asString,
  sourceDex: asString,
  destinationDex: asString,
  fee: asOptional(asString, '0'),
  nativeTokenFee: asOptional(asString, '0'),
  feeToken: asOptional(asString, ''),
  nonce: asOptional(asNumber)
})

const asStakingTransferDelta = asObject({
  type: asValue('cStakingTransfer' as const),
  token: asString,
  amount: asString,
  isDeposit: asBoolean
})

/** Moves USDC between the spot and perp balances of one account. */
const asAccountClassTransferDelta = asObject({
  type: asValue('accountClassTransfer' as const),
  usdc: asString,
  toPerp: asBoolean
})

export const asLedgerDelta = asEither(
  asSpotTransferDelta,
  asSendDelta,
  asStakingTransferDelta,
  asAccountClassTransferDelta
)
export type HyperCoreLedgerDelta = ReturnType<typeof asLedgerDelta>

export const asLedgerUpdate = asObject({
  time: asNumber,
  hash: asString,
  delta: asUnknown
})
export type HyperCoreLedgerUpdate = ReturnType<typeof asLedgerUpdate>

export const asLedgerUpdates = asArray(asLedgerUpdate)

//
// Exchange API
//

export const asExchangeResponse = asObject({
  status: asString,
  response: asUnknown
})

export interface HyperCoreSpotSendAction {
  type: 'spotSend'
  hyperliquidChain: string
  signatureChainId: string
  destination: string
  token: string
  amount: string
  time: number
}

export interface HyperCoreSendAssetAction {
  type: 'sendAsset'
  hyperliquidChain: string
  signatureChainId: string
  destination: string
  sourceDex: string
  destinationDex: string
  token: string
  amount: string
  fromSubAccount: string
  nonce: number
}

/**
 * Spend options a swap provider can set. A `destinationDex` turns the
 * transfer into a `sendAsset` from our spot balance into that dex of the
 * destination account (the perp dex is named by an empty string), which is
 * how bridges such as Relay take deposits.
 */
export const asHyperCoreSpendOtherParams = asObject({
  destinationDex: asOptional(asString)
})

/** What `makeSpend` leaves for `signTx`, which stamps the nonce. */
export const asHyperCoreUnsignedTx = asObject({
  destination: asString,
  token: asString,
  amount: asString,
  destinationDex: asOptional(asString)
})

export const asHyperCoreSignedTx = asObject({
  action: asEither(
    asObject({
      type: asValue('spotSend' as const),
      hyperliquidChain: asString,
      signatureChainId: asString,
      destination: asString,
      token: asString,
      amount: asString,
      time: asNumber
    }),
    asObject({
      type: asValue('sendAsset' as const),
      hyperliquidChain: asString,
      signatureChainId: asString,
      destination: asString,
      sourceDex: asString,
      destinationDex: asString,
      token: asString,
      amount: asString,
      fromSubAccount: asString,
      nonce: asNumber
    })
  ),
  nonce: asNumber,
  signature: asObject({ r: asString, s: asString, v: asNumber })
})
export type HyperCoreSignedTx = ReturnType<typeof asHyperCoreSignedTx>
