import { expect } from 'chai'
import { ethers } from 'ethers'
import { describe, it } from 'mocha'

import {
  ENS_UNIVERSAL_RESOLVER,
  resolveEnsAddress
} from '../../src/ethereum/ensUtils'

const universalResolver = new ethers.utils.Interface([
  'function resolve(bytes name, bytes data) view returns (bytes result, address resolver)',
  'error ResolverNotFound(bytes name)',
  'error ResolverError(bytes errorData)'
])
const addrResolver = new ethers.utils.Interface([
  'function addr(bytes32 node) view returns (address)'
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
    addrResolver.encodeFunctionResult('addr', [address]),
    resolverAddress
  ])
}

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
      addrResolver.encodeFunctionData('addr', [
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
