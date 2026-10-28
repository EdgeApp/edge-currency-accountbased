import { asMaybe, asObject, asString } from 'cleaners'
import { ethers } from 'ethers'

/**
 * ENS Universal Resolver on Ethereum mainnet. It finds a name's resolver in
 * both the ENSv1 registry and ENSv2, and follows CCIP-read (EIP-3668) for
 * offchain names. ethers v5's `resolveName` and `lookupAddress` only read the
 * ENSv1 registry, so they miss names that moved to ENSv2.
 */
export const ENS_UNIVERSAL_RESOLVER =
  '0xeEeEEEeE14D718C2B47D9923Deab1335E144EeEe'

/** SLIP-44 coin type for Ethereum mainnet addresses */
const ETH_COIN_TYPE = 60

const universalResolverInterface = new ethers.utils.Interface([
  'function resolve(bytes name, bytes data) view returns (bytes result, address resolver)',
  'function reverse(bytes lookupAddress, uint256 coinType) view returns (string primary, address resolver, address reverseResolver)',
  'error ResolverNotFound(bytes name)',
  'error ResolverNotContract(bytes name, address resolver)',
  'error UnsupportedResolverProfile(bytes4 selector)',
  'error ResolverError(bytes errorData)',
  'error ReverseAddressMismatch(string primary, bytes primaryAddress)',
  'error HttpError(uint16 status, string message)'
])

const addrResolverInterface = new ethers.utils.Interface([
  'function addr(bytes32 node) view returns (address)'
])

/**
 * Universal Resolver errors that mean the name or address has no answer,
 * as opposed to a failure worth retrying on another server.
 */
const noAnswerErrors = new Set([
  'ResolverNotFound',
  'ResolverNotContract',
  'UnsupportedResolverProfile',
  'ReverseAddressMismatch'
])

const asContractError = asObject({ errorName: asString })

/**
 * Resolves an ENS name, such as "nick.eth", to its Ethereum address.
 * Returns null when the name has no resolver or no address record.
 * Throws on network or gateway failures.
 */
export async function resolveEnsAddress(
  provider: ethers.providers.Provider,
  ensName: string
): Promise<string | null> {
  const data = universalResolverInterface.encodeFunctionData('resolve', [
    ethers.utils.dnsEncode(ensName),
    addrResolverInterface.encodeFunctionData('addr', [
      ethers.utils.namehash(ensName)
    ])
  ])
  const result = await callUniversalResolver(provider, 'resolve', data)
  if (result == null) return null

  const [addrResult] = result
  if (addrResult === '0x') return null
  const [address] = addrResolverInterface.decodeFunctionResult(
    'addr',
    addrResult
  )
  return address === ethers.constants.AddressZero ? null : address
}

/**
 * Finds the primary ENS name for an Ethereum address. The Universal
 * Resolver checks that the name resolves back to the same address.
 * Returns null when the address has no verified primary name.
 * Throws on network or gateway failures.
 */
export async function lookupEnsName(
  provider: ethers.providers.Provider,
  address: string
): Promise<string | null> {
  const data = universalResolverInterface.encodeFunctionData('reverse', [
    ethers.utils.getAddress(address),
    ETH_COIN_TYPE
  ])
  const result = await callUniversalResolver(provider, 'reverse', data)
  if (result == null) return null

  const [primaryName] = result
  return primaryName === '' ? null : primaryName
}

/**
 * Calls the Universal Resolver with CCIP-read enabled and decodes the
 * result. Returns null for errors that mean there is no answer.
 */
async function callUniversalResolver(
  provider: ethers.providers.Provider,
  functionName: 'resolve' | 'reverse',
  data: string
): Promise<ethers.utils.Result | null> {
  const raw = await provider.call({
    to: ENS_UNIVERSAL_RESOLVER,
    data,
    ccipReadEnabled: true
  })
  try {
    return universalResolverInterface.decodeFunctionResult(functionName, raw)
  } catch (error: unknown) {
    const contractError = asMaybe(asContractError)(error)
    if (contractError != null && noAnswerErrors.has(contractError.errorName)) {
      return null
    }
    throw error
  }
}
