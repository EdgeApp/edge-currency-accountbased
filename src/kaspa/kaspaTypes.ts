import {
  asArray,
  asBoolean,
  asCodec,
  asMaybe,
  asNumber,
  asObject,
  asOptional,
  asString,
  Cleaner
} from 'cleaners'

import { asSafeCommonWalletInfo } from '../common/types'

// Kaspa Wallet Other Data
export const asKaspaWalletOtherData = asObject({
  latestBlockHash: asMaybe(asString, ''),
  latestDaaScore: asMaybe(asNumber, 0),
  virtualDaaScore: asMaybe(asNumber, 0)
})

export type KaspaWalletOtherData = ReturnType<typeof asKaspaWalletOtherData>

// Kaspa Network Info
export interface KaspaNetworkInfo {
  rpcServers: string[]
  kaspaApiServers: string[]
  networkId: string
  genesisHash: string
  defaultFee: string
  minFee: string
  maxFee: string
  blocksPerSecond: number
  utxoRefreshTime: number
}

// Kaspa UTXO
export const asKaspaUtxo = asObject({
  transactionId: asString,
  index: asNumber,
  amount: asString,
  scriptPublicKey: asObject({
    scriptPublicKey: asString
  }),
  blockDaaScore: asNumber
})

export type KaspaUtxo = ReturnType<typeof asKaspaUtxo>

// Kaspa Transaction
export const asKaspaTransaction = asObject({
  transactionId: asString,
  inputs: asArray(
    asObject({
      previousOutpoint: asObject({
        transactionId: asString,
        index: asNumber
      }),
      signatureScript: asString,
      sigOpCount: asNumber
    })
  ),
  outputs: asArray(
    asObject({
      amount: asString,
      scriptPublicKey: asObject({
        scriptPublicKey: asString
      })
    })
  ),
  lockTime: asString,
  subnetworkId: asString,
  gas: asString,
  payload: asString,
  mass: asString,
  verboseData: asOptional(
    asObject({
      transactionId: asString,
      hash: asString,
      mass: asString,
      blockHash: asString,
      blockTime: asString
    })
  )
})

export type KaspaTransaction = ReturnType<typeof asKaspaTransaction>

// Kaspa Balance Response
export const asKaspaBalanceResponse = asObject({
  balance: asString
})

export type KaspaBalanceResponse = ReturnType<typeof asKaspaBalanceResponse>

// Kaspa Transactions Response
export const asKaspaTransactionsResponse = asObject({
  transactions: asArray(asKaspaTransaction)
})

export type KaspaTransactionsResponse = ReturnType<
  typeof asKaspaTransactionsResponse
>

// Kaspa UTXO Response
export const asKaspaUtxosResponse = asObject({
  entries: asArray(
    asObject({
      address: asString,
      outpoint: asObject({
        transactionId: asString,
        index: asNumber
      }),
      utxoEntry: asObject({
        amount: asString,
        scriptPublicKey: asString,
        blockDaaScore: asString,
        isCoinbase: asBoolean
      })
    })
  )
})

export type KaspaUtxosResponse = ReturnType<typeof asKaspaUtxosResponse>

// Safe Kaspa Wallet Info
export type SafeKaspaWalletInfo = ReturnType<typeof asSafeKaspaWalletInfo>
export const asSafeKaspaWalletInfo = asSafeCommonWalletInfo

// Kaspa Private Keys
export interface KaspaPrivateKeys {
  privateKey: string
  publicKey: string
}

export const asKaspaPrivateKeys = (
  pluginId: string
): Cleaner<KaspaPrivateKeys> => {
  const asKeys = asObject({
    [`${pluginId}Key`]: asString,
    [`${pluginId}PublicKey`]: asString
  })

  return asCodec(
    raw => {
      const clean = asKeys(raw)
      return {
        privateKey: clean[`${pluginId}Key`],
        publicKey: clean[`${pluginId}PublicKey`]
      }
    },
    clean => {
      return {
        [`${pluginId}Key`]: clean.privateKey,
        [`${pluginId}PublicKey`]: clean.publicKey
      }
    }
  )
}

// Kaspa Other Methods
export interface KaspaOtherMethods {
  // Future WalletConnect support can be added here
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

// Kaspa Info Payload
export const asKaspaInfoPayload = asObject({
  rpcServers: asOptional(asArray(asString)),
  kaspaApiServers: asOptional(asArray(asString))
})

export type KaspaInfoPayload = ReturnType<typeof asKaspaInfoPayload>

// Network adapter types
export interface KaspaNetworkUpdate {
  blockHeight?: number
  server?: string
  utxos?: KaspaUtxo[]
  transactions?: KaspaTransaction[]
  balances?: { [address: string]: string }
}

// RPC Method types
export type KaspaRpcMethod =
  | 'getBlockDagInfo'
  | 'getBlock'
  | 'getBlocks'
  | 'getUtxosByAddresses'
  | 'getBalanceByAddress'
  | 'submitTransaction'
  | 'getVirtualSelectedParentBlueScore'
