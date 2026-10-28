import { expect } from 'chai'
import { ethers } from 'ethers'
import { describe, it } from 'mocha'

import {
  ENS_UNIVERSAL_RESOLVER,
  lookupEnsName,
  resolveEnsAddress
} from '../../src/ethereum/ensUtils'

const universalResolver = new ethers.utils.Interface([
  'function resolve(bytes name, bytes data) view returns (bytes result, address resolver)',
  'function reverse(bytes lookupAddress, uint256 coinType) view returns (string primary, address resolver, address reverseResolver)',
  'error ResolverNotFound(bytes name)',
  'error ResolverError(bytes errorData)',
  'error ReverseAddressMismatch(string primary, bytes primaryAddress)'
])
const addrResolver = new ethers.utils.Interface([
  'function addr(bytes32 node) view returns (address)',
  'function addr(bytes32 node, uint256 coinType) view returns (bytes)'
])

const nickAddress = '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5'
const resolverAddress = '0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63'

interface CallRequest {
  to?: string
  data?: string
  ccipReadEnabled?: boolean
}

/**
 * A provider whose `call` returns a fixed response and records the request.
 */
function makeFakeProvider(response: string): {
  provider: ethers.providers.Provider
  requests: CallRequest[]
} {
  const requests: CallRequest[] = []
  const fake = {
    call: async (request: CallRequest): Promise<string> => {
      requests.push(request)
      return response
    }
  }
  return {
    provider: fake as unknown as ethers.providers.Provider,
    requests
  }
}

function encodeResolveResult(address: string): string {
  return universalResolver.encodeFunctionResult('resolve', [
    addrResolver.encodeFunctionResult('addr(bytes32)', [address]),
    resolverAddress
  ])
}

/**
 * A provider that answers `resolve` calls from a table of address records,
 * keyed by coin type, and records which coin types it was asked for.
 */
function makeCoinTypeProvider(records: Map<number, string>): {
  provider: ethers.providers.Provider
  coinTypes: number[]
} {
  const coinTypes: number[] = []
  const fake = {
    call: async (request: CallRequest): Promise<string> => {
      const [, addrCall] = universalResolver.decodeFunctionData(
        'resolve',
        request.data ?? '0x'
      )
      const isMultiCoin =
        ethers.utils.hexDataSlice(addrCall, 0, 4) ===
        addrResolver.getSighash('addr(bytes32,uint256)')
      const coinType = isMultiCoin
        ? addrResolver
            .decodeFunctionData('addr(bytes32,uint256)', addrCall)[1]
            .toNumber()
        : 60
      coinTypes.push(coinType)

      const record = records.get(coinType)
      const addrResult = isMultiCoin
        ? addrResolver.encodeFunctionResult('addr(bytes32,uint256)', [
            record ?? '0x'
          ])
        : addrResolver.encodeFunctionResult('addr(bytes32)', [
            record ?? ethers.constants.AddressZero
          ])
      return universalResolver.encodeFunctionResult('resolve', [
        addrResult,
        resolverAddress
      ])
    }
  }
  return {
    provider: fake as unknown as ethers.providers.Provider,
    coinTypes
  }
}

const polygonChainId = 137
const polygonCoinType = 0x80000089
const defaultEvmCoinType = 0x80000000
const otherAddress = '0x2222222222222222222222222222222222222222'

describe('resolveEnsAddress', () => {
  it('calls the Universal Resolver with CCIP-read enabled', async () => {
    const { provider, requests } = makeFakeProvider(
      encodeResolveResult(nickAddress)
    )
    await resolveEnsAddress(provider, 'NICK.eth')

    expect(requests.length).to.equal(1)
    const [request] = requests
    expect(request.to).to.equal(ENS_UNIVERSAL_RESOLVER)
    expect(request.ccipReadEnabled).to.equal(true)
    const [name, data] = universalResolver.decodeFunctionData(
      'resolve',
      request.data ?? '0x'
    )
    expect(name).to.equal(ethers.utils.dnsEncode('nick.eth'))
    expect(data).to.equal(
      addrResolver.encodeFunctionData('addr(bytes32)', [
        ethers.utils.namehash('nick.eth')
      ])
    )
  })

  it('returns the resolved address', async () => {
    const { provider } = makeFakeProvider(encodeResolveResult(nickAddress))
    expect(await resolveEnsAddress(provider, 'nick.eth')).to.equal(nickAddress)
  })

  it('returns null when the name has no resolver', async () => {
    const { provider } = makeFakeProvider(
      universalResolver.encodeErrorResult('ResolverNotFound', [
        ethers.utils.dnsEncode('unregistered.eth')
      ])
    )
    expect(await resolveEnsAddress(provider, 'unregistered.eth')).to.equal(null)
  })

  it('returns null when the address record is empty', async () => {
    const { provider } = makeFakeProvider(
      encodeResolveResult(ethers.constants.AddressZero)
    )
    expect(await resolveEnsAddress(provider, 'nick.eth')).to.equal(null)
  })

  it('throws when the resolver fails', async () => {
    const { provider } = makeFakeProvider(
      universalResolver.encodeErrorResult('ResolverError', ['0x'])
    )
    let error: unknown
    await resolveEnsAddress(provider, 'nick.eth').catch((e: unknown) => {
      error = e
    })
    expect(error).to.be.instanceOf(Error)
  })
})

describe('resolveEnsAddress on other EVM chains', () => {
  it("returns the chain's own address record first", async () => {
    const { provider, coinTypes } = makeCoinTypeProvider(
      new Map([
        [polygonCoinType, otherAddress],
        [60, nickAddress]
      ])
    )
    expect(
      await resolveEnsAddress(provider, 'nick.eth', polygonChainId)
    ).to.equal(otherAddress)
    expect(coinTypes).to.deep.equal([polygonCoinType])
  })

  it('falls back to the default EVM address record', async () => {
    const { provider, coinTypes } = makeCoinTypeProvider(
      new Map([
        [defaultEvmCoinType, otherAddress],
        [60, nickAddress]
      ])
    )
    expect(
      await resolveEnsAddress(provider, 'nick.eth', polygonChainId)
    ).to.equal(otherAddress)
    expect(coinTypes).to.deep.equal([polygonCoinType, defaultEvmCoinType])
  })

  it('falls back to the Ethereum address record', async () => {
    const { provider, coinTypes } = makeCoinTypeProvider(
      new Map([[60, nickAddress]])
    )
    expect(
      await resolveEnsAddress(provider, 'nick.eth', polygonChainId)
    ).to.equal(nickAddress)
    expect(coinTypes).to.deep.equal([polygonCoinType, defaultEvmCoinType, 60])
  })

  it('skips zero and malformed address records', async () => {
    const { provider } = makeCoinTypeProvider(
      new Map([
        [polygonCoinType, ethers.constants.AddressZero],
        [defaultEvmCoinType, '0x1234'],
        [60, nickAddress]
      ])
    )
    expect(
      await resolveEnsAddress(provider, 'nick.eth', polygonChainId)
    ).to.equal(nickAddress)
  })

  it('returns null when no record is set', async () => {
    const { provider } = makeCoinTypeProvider(new Map())
    expect(
      await resolveEnsAddress(provider, 'nick.eth', polygonChainId)
    ).to.equal(null)
  })

  it('only reads the Ethereum record on mainnet', async () => {
    const { provider, coinTypes } = makeCoinTypeProvider(
      new Map([[defaultEvmCoinType, otherAddress]])
    )
    expect(await resolveEnsAddress(provider, 'nick.eth', 1)).to.equal(null)
    expect(coinTypes).to.deep.equal([60])
  })
})

describe('lookupEnsName', () => {
  it('calls reverse for the Ethereum coin type', async () => {
    const { provider, requests } = makeFakeProvider(
      universalResolver.encodeFunctionResult('reverse', [
        'nick.eth',
        resolverAddress,
        resolverAddress
      ])
    )
    expect(await lookupEnsName(provider, nickAddress)).to.equal('nick.eth')

    const [request] = requests
    expect(request.to).to.equal(ENS_UNIVERSAL_RESOLVER)
    expect(request.ccipReadEnabled).to.equal(true)
    const [lookupAddress, coinType] = universalResolver.decodeFunctionData(
      'reverse',
      request.data ?? '0x'
    )
    expect(lookupAddress).to.equal(nickAddress.toLowerCase())
    expect(coinType.toNumber()).to.equal(60)
  })

  it('returns null when the address has no primary name', async () => {
    const { provider } = makeFakeProvider(
      universalResolver.encodeFunctionResult('reverse', [
        '',
        ethers.constants.AddressZero,
        resolverAddress
      ])
    )
    expect(await lookupEnsName(provider, nickAddress)).to.equal(null)
  })

  it('returns null when the primary name points elsewhere', async () => {
    const { provider } = makeFakeProvider(
      universalResolver.encodeErrorResult('ReverseAddressMismatch', [
        'nick.eth',
        ethers.constants.AddressZero
      ])
    )
    expect(await lookupEnsName(provider, nickAddress)).to.equal(null)
  })
})
