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

/** ENSIP-19 coin type for an address that applies to every EVM chain */
const DEFAULT_EVM_COIN_TYPE = 0x80000000

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
  'function addr(bytes32 node) view returns (address)',
  'function addr(bytes32 node, uint256 coinType) view returns (bytes)'
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
 * ENSIP-11 coin type for an EVM chain's addresses.
 */
function evmCoinType(chainId: number): number {
  return chainId === 1 ? ETH_COIN_TYPE : (DEFAULT_EVM_COIN_TYPE | chainId) >>> 0
}

/**
 * Resolves an ENS name, such as "nick.eth", to its address on an EVM chain.
 * Off mainnet, it tries the chain's own address record, then the ENSIP-19
 * default EVM record, then the mainnet record, since most names only set
 * the mainnet one. Returns null when none of these records is set.
 * Throws on network or gateway failures.
 */
export async function resolveEnsAddress(
  provider: ethers.providers.Provider,
  ensName: string,
  chainId: number = 1
): Promise<string | null> {
  const coinTypes =
    chainId === 1
      ? [ETH_COIN_TYPE]
      : [evmCoinType(chainId), DEFAULT_EVM_COIN_TYPE, ETH_COIN_TYPE]

  for (const coinType of coinTypes) {
    const address = await resolveEnsCoinAddress(provider, ensName, coinType)
    if (address != null) return address
  }
  return null
}

/**
 * Reads one coin type's address record for an ENS name.
 * Returns null when the record is empty or not an EVM address.
 */
async function resolveEnsCoinAddress(
  provider: ethers.providers.Provider,
  ensName: string,
  coinType: number
): Promise<string | null> {
  const node = ethers.utils.namehash(ensName)
  const addrCall =
    coinType === ETH_COIN_TYPE
      ? addrResolverInterface.encodeFunctionData('addr(bytes32)', [node])
      : addrResolverInterface.encodeFunctionData('addr(bytes32,uint256)', [
          node,
          coinType
        ])
  const data = universalResolverInterface.encodeFunctionData('resolve', [
    ethers.utils.dnsEncode(ensName),
    addrCall
  ])
  const result = await callUniversalResolver(provider, 'resolve', data)
  if (result == null) return null

  const [addrResult] = result
  if (addrResult === '0x') return null

  const address =
    coinType === ETH_COIN_TYPE
      ? decodeEthAddress(addrResult)
      : decodeEvmAddressBytes(addrResult)
  return address === ethers.constants.AddressZero ? null : address
}

function decodeEthAddress(addrResult: string): string {
  const [address] = addrResolverInterface.decodeFunctionResult(
    'addr(bytes32)',
    addrResult
  )
  return address
}

/**
 * Decodes a multi-coin address record, which holds raw address bytes.
 * Returns null when the bytes are not a 20-byte EVM address.
 */
function decodeEvmAddressBytes(addrResult: string): string | null {
  const [addressBytes] = addrResolverInterface.decodeFunctionResult(
    'addr(bytes32,uint256)',
    addrResult
  )
  if (ethers.utils.hexDataLength(addressBytes) !== 20) return null
  return ethers.utils.getAddress(addressBytes)
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
