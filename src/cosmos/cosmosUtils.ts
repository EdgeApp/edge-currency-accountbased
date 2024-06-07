import { getIbcInfo, getTransferChannel } from '@chain-registry/utils'
import { addCoins, StdSignDoc } from '@cosmjs/amino'
import { fromBech32 } from '@cosmjs/encoding'
import {
  isJsonRpcErrorResponse,
  JsonRpcRequest,
  JsonRpcSuccessResponse
} from '@cosmjs/json-rpc'
import {
  Coin,
  Event,
  HttpEndpoint,
  QueryClient,
  setupAuthExtension,
  setupBankExtension,
  setupIbcExtension,
  setupStakingExtension,
  setupTxExtension,
  StargateClient
} from '@cosmjs/stargate'
import {
  Comet38Client,
  CometClient,
  RpcClient,
  Tendermint34Client,
  Tendermint37Client
} from '@cosmjs/tendermint-rpc'
import { add } from 'biggystring'
import { chains, ibc } from 'chain-registry'
import { asMaybe, asObject, asString, asTuple, asValue } from 'cleaners'
import { EdgeFetchFunction } from 'edge-core-js/types'
import { base16, base64 } from 'rfc4648'

import {
  asCosmosInitOptions,
  CosmosClients,
  CosmosCoin,
  CosmosInitOptions,
  IbcChannel
} from './cosmosTypes'
import { Asset } from './info/proto/thorchainrune/thorchain/v1/common/common'

export const rpcWithApiKey = (
  endpoint: HttpEndpoint,
  initOptions: CosmosInitOptions
): HttpEndpoint => {
  const apiKeys = asCosmosInitOptions(initOptions) as { [key: string]: string }
  const headers: { [key: string]: string } = {}
  const regex = /{{(.*?)}}/g
  for (const [key, value] of Object.entries(endpoint.headers)) {
    const match = regex.exec(value)
    if (match != null) {
      headers[key] = apiKeys[match[1]]
    }
  }

  return { url: endpoint.url, headers }
}

const createRpcClient = (
  fetch: EdgeFetchFunction,
  endpoint: HttpEndpoint
): RpcClient => {
  const { url, headers } = endpoint

  return {
    execute: async (
      request: JsonRpcRequest
    ): Promise<JsonRpcSuccessResponse> => {
      const opts = {
        method: 'POST',
        headers,
        body: JSON.stringify(request)
      }
      const res = await fetch(url, opts)
      const json = await res.json()
      if (isJsonRpcErrorResponse(json)) {
        throw new Error(String(json.error.data ?? json.error.message))
      }
      return json
    },
    disconnect: () => {}
  }
}

const createCometClient = async (rpc: RpcClient): Promise<CometClient> => {
  const cometClient = await Comet38Client.create(rpc)
  const version = (await cometClient.status()).nodeInfo.version
  if (version.startsWith('0.38.')) {
    return cometClient
  }
  if (version.startsWith('0.37.')) {
    return await Tendermint37Client.create(rpc)
  }
  return await Tendermint34Client.create(rpc)
}

export const createCosmosClients = async (
  fetch: EdgeFetchFunction,
  endpoint: HttpEndpoint
): Promise<CosmosClients> => {
  const stargateClient = await StargateClient.create(
    await createCometClient(createRpcClient(fetch, endpoint))
  )
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const cometClient = stargateClient['forceGetCometClient']()
  const queryClient = QueryClient.withExtensions(
    cometClient,
    setupAuthExtension,
    setupBankExtension,
    setupStakingExtension,
    setupTxExtension,
    setupIbcExtension
  )

  return {
    queryClient,
    stargateClient,
    cometClient
  }
}

// from THORSwap
export const assetFromString = (assetString: string): Asset => {
  const [chain, ...symbolArray] = assetString.split('.') as [
    string,
    ...Array<string | undefined>
  ]
  const synth = assetString.includes('/')
  const symbol = symbolArray.join('.')
  const ticker = symbol?.split('-')?.[0]

  return { chain, symbol, ticker, synth }
}

export const safeAddCoins = (coins: Coin[]): Coin => {
  return coins.reduce((prev, curr) => {
    try {
      return addCoins(prev, curr)
    } catch (e) {
      // throws for mixed denoms
    }
    return prev
  })
}

/**
 * An overkill way to take all events from a transaction and reduce them down to only the balance changes relevant to the provided address.
 * Event attributes are filtered, sorted, and passed through strict cleaners to be sure we can use it.
 */

const asAmountKey = asValue('amount')
const asReceiverKey = asValue('receiver')
const asSpenderKey = asValue('spender')
const asCoinAttributeKey = asValue('amount', 'receiver', 'spender')

const asCoinReceivedEvent = asObject({
  type: asValue('coin_received'),
  attributes: asTuple(
    asObject({
      key: asAmountKey,
      value: asString /* '100000000rune' */
    }),
    asObject({
      key: asReceiverKey,
      value: asString
    })
  )
})
const asCoinSpentEvent = asObject({
  type: asValue('coin_spent'),
  attributes: asTuple(
    asObject({
      key: asAmountKey,
      value: asString /* '100000000rune' */
    }),
    asObject({
      key: asSpenderKey,
      value: asString
    })
  )
})

export const reduceCoinEventsForAddress = (
  events: Event[],
  address: string
): CosmosCoin[] => {
  const coinTotalsMap = new Map<string, string>()
  for (const event of events) {
    const sortedEvent = {
      type: event.type,
      attributes: event.attributes
        .filter(attr => asMaybe(asCoinAttributeKey)(attr.key) != null)
        .sort((a, b) => (a.key < b.key ? -1 : 1))
    }

    const receivedEvent = asMaybe(asCoinReceivedEvent)(sortedEvent)
    if (receivedEvent != null) {
      const [amount, receiver] = receivedEvent.attributes.map(
        attr => attr.value
      )
      if (receiver !== address) continue

      const coins = extendedParseCoins(amount)
      coins.forEach(coin => {
        const amount = coin.amount
        const coinTotal = coinTotalsMap.get(coin.denom) ?? '0'
        coinTotalsMap.set(coin.denom, add(amount, coinTotal))
      })
      continue
    }

    const spentEvent = asMaybe(asCoinSpentEvent)(sortedEvent)
    if (spentEvent != null) {
      const [amount, spender] = spentEvent.attributes.map(attr => attr.value)
      if (spender !== address) continue

      const coins = extendedParseCoins(amount)
      coins.forEach(coin => {
        const amount = `-${coin.amount}`
        const coinTotal = coinTotalsMap.get(coin.denom) ?? '0'
        coinTotalsMap.set(coin.denom, add(amount, coinTotal))
      })
    }
  }

  // Remove 0 amounts
  const out: CosmosCoin[] = []
  coinTotalsMap.forEach((amount, denom) => {
    if (amount !== '0') out.push({ denom, amount })
  })
  return out
}

// Sometimes bytes from dapps are base16 and sometimes they are base64. This function will parse the input and return the bytes and the type.
export const safeParse = (input: string): Uint8Array => {
  try {
    const parsed = base16.parse(input)
    return parsed
  } catch (e) {
    const parsed = base64.parse(input)
    return parsed
  }
}

// The helper function parseCoins from the @cosmjs sdk doesn't handle denoms with hyphens.
export const extendedParseCoins = (input: string): Coin[] => {
  return input
    .replace(/\s/g, '')
    .split(',')
    .filter(Boolean)
    .map(part => {
      // Denom regex from Stargate (https://github.com/cosmos/cosmos-sdk/blob/v0.42.7/types/coin.go#L599-L601)
      const match = part.match(/^([0-9]+)([a-zA-Z][a-zA-Z0-9/-]{2,127})$/)
      if (match == null) throw new Error(`Got an invalid coin string: ${input}`)
      return {
        amount: match[1].replace(/^0+/, '') ?? '0',
        denom: match[2]
      }
    })
}

export const getIbcChannelAndPort = (
  fromChainName: string,
  toAddress: string
): IbcChannel => {
  const chain = chains.find(
    chain => chain.bech32_prefix === fromBech32(toAddress).prefix
  )
  if (chain == null) throw new Error('Unrecognized denom')

  const toChainName = chain.chain_name
  const ibcInfo = getIbcInfo(ibc, fromChainName, toChainName)
  if (ibcInfo == null) {
    throw new Error(
      `No IBC channels between ${fromChainName} and ${toChainName}`
    )
  }

  const channel = getTransferChannel(ibcInfo)

  // channel data is alphabetical by chain name
  if (fromChainName < toChainName) {
    return {
      channel: channel.chain_1.channel_id,
      port: channel.chain_1.port_id
    }
  } else {
    return {
      channel: channel.chain_2.channel_id,
      port: channel.chain_2.port_id
    }
  }
}

// Spec: https://github.com/cosmos/cosmos-sdk/blob/main/docs/architecture/adr-036-arbitrary-signature.md
// Function adopted from @keplr-wallet/cosmos https://github.com/chainapsis/keplr-wallet/blob/master/packages/cosmos/src/adr-36/amino.ts
export function checkAndValidateADR36AminoSignDoc(
  signDoc: StdSignDoc
): boolean {
  const hasOnlyMsgSignData = (() => {
    if (
      signDoc?.msgs != null &&
      Array.isArray(signDoc.msgs) &&
      signDoc.msgs.length === 1
    ) {
      const msg = signDoc.msgs[0]
      return msg.type === 'sign/MsgSignData'
    } else {
      return false
    }
  })()

  if (!hasOnlyMsgSignData) {
    return false
  }

  if (signDoc.chain_id !== '') {
    throw new Error('Chain id should be empty string for ADR-36 signing')
  }

  if (signDoc.memo !== '') {
    throw new Error('Memo should be empty string for ADR-36 signing')
  }

  if (signDoc.account_number !== '0') {
    throw new Error('Account number should be "0" for ADR-36 signing')
  }

  if (signDoc.sequence !== '0') {
    throw new Error('Sequence should be "0" for ADR-36 signing')
  }

  if (signDoc.fee.gas !== '0') {
    throw new Error('Gas should be "0" for ADR-36 signing')
  }

  if (signDoc.fee.amount.length !== 0) {
    throw new Error('Fee amount should be empty array for ADR-36 signing')
  }

  const msg = signDoc.msgs[0]
  if (msg.type !== 'sign/MsgSignData') {
    throw new Error(`Invalid type of ADR-36 sign msg: ${msg.type}`)
  }
  if (msg.value == null) {
    throw new Error('Empty value in the msg')
  }
  const signer = msg.value.signer
  if (signer == null) {
    throw new Error('Empty signer in the ADR-36 msg')
  }
  fromBech32(signer)
  const data = msg.value.data
  if (data == null) {
    throw new Error('Empty data in the ADR-36 msg')
  }
  const rawData = Buffer.from(data, 'base64')
  // Validate the data is encoded as base64.
  if (rawData.toString('base64') !== data) {
    throw new Error('Data is not encoded by base64')
  }
  if (rawData.length === 0) {
    throw new Error('Empty data in the ADR-36 msg')
  }

  return true
}
