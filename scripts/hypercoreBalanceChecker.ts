/**
 * Builds the HyperCore balance checker deployed on HyperEVM.
 *
 * HyperCore has no smart contracts of its own. HyperEVM exposes HyperCore
 * spot balances through a read precompile at 0x0801, which takes
 * `abi.encode(address user, uint64 tokenIndex)` and returns
 * `(uint64 total, uint64 hold, uint64 entryNtl)` in the token's wei units.
 * This contract batches those reads into one `eth_call`, equivalent to:
 *
 *   function balances(address[] calldata users, uint64[] calldata tokens)
 *     external view returns (uint256[] memory totals, uint256[] memory holds)
 *   {
 *     uint256 n = users.length * tokens.length;
 *     totals = new uint256[](n);
 *     holds = new uint256[](n);
 *     uint256 k = 0;
 *     for (uint256 i = 0; i < users.length; i++) {
 *       for (uint256 j = 0; j < tokens.length; j++) {
 *         (bool ok, bytes memory out) = address(0x0801).staticcall(
 *           abi.encode(users[i], tokens[j])
 *         );
 *         if (ok && out.length >= 96) {
 *           (totals[k], holds[k], ) = abi.decode(out, (uint64, uint64, uint64));
 *         }
 *         k++;
 *       }
 *     }
 *   }
 *
 * Results are row-major: entry `i * tokens.length + j` is user `i`, token
 * `j`. A failed read (unknown token index, for example) returns zeros
 * rather than reverting the whole batch.
 *
 * The bytecode is assembled here from the listing below, so the deployed code
 * can be rebuilt and compared without a Solidity toolchain:
 *
 *   node -r sucrase/register scripts/hypercoreBalanceChecker.ts
 *
 * prints the init code (deploy data) and the runtime code.
 */

import { ethers } from 'ethers'

type Op = string | { label: string } | { push: string }

const OPCODES: Record<string, number> = {
  ADD: 0x01,
  MUL: 0x02,
  LT: 0x10,
  GT: 0x11,
  EQ: 0x14,
  ISZERO: 0x15,
  AND: 0x16,
  SHL: 0x1b,
  SHR: 0x1c,
  CALLDATALOAD: 0x35,
  CODECOPY: 0x39,
  RETURNDATASIZE: 0x3d,
  MLOAD: 0x51,
  MSTORE: 0x52,
  JUMP: 0x56,
  JUMPI: 0x57,
  GAS: 0x5a,
  JUMPDEST: 0x5b,
  DUP1: 0x80,
  RETURN: 0xf3,
  STATICCALL: 0xfa,
  REVERT: 0xfd
}

const SELECTOR = ethers.utils.id('balances(address[],uint64[])').slice(0, 10)

// Memory layout:
const IO = 0x00 // Precompile input (0x40 bytes) and output (0x60 bytes)
const U_PTR = 0x60 // Calldata position of users[0]
const U_LEN = 0x80
const T_PTR = 0xa0 // Calldata position of tokens[0]
const T_LEN = 0xc0
const K_LEN = 0xe0 // users.length * tokens.length
const I = 0x100
const J = 0x120
const K = 0x140
const OUT = 0x160 // ABI-encoded return data starts here

const push = (n: number, bytes: number): string =>
  `PUSH${bytes}:${n.toString(16).padStart(bytes * 2, '0')}`

const RUNTIME: Op[] = [
  // Dispatch on the selector:
  push(0, 1), 'CALLDATALOAD', push(0xe0, 1), 'SHR',
  { push: SELECTOR }, 'EQ', { label: '@main' }, 'JUMPI',
  push(0, 1), 'DUP1', 'REVERT',

  '@main', 'JUMPDEST',
  // users: length and element pointer
  push(4, 1), 'CALLDATALOAD', push(4, 1), 'ADD',
  'DUP1', 'CALLDATALOAD', push(U_LEN, 1), 'MSTORE',
  push(0x20, 1), 'ADD', push(U_PTR, 1), 'MSTORE',
  // tokens: length and element pointer
  push(0x24, 1), 'CALLDATALOAD', push(4, 1), 'ADD',
  'DUP1', 'CALLDATALOAD', push(T_LEN, 1), 'MSTORE',
  push(0x20, 1), 'ADD', push(T_PTR, 1), 'MSTORE',
  // n = users.length * tokens.length
  push(U_LEN, 1), 'MLOAD', push(T_LEN, 1), 'MLOAD', 'MUL', push(K_LEN, 1), 'MSTORE',

  // Return header: offsets of both arrays, then totals.length
  push(0x40, 1), push(OUT, 2), 'MSTORE',
  push(K_LEN, 1), 'MLOAD', push(5, 1), 'SHL', push(0x60, 1), 'ADD', push(OUT + 0x20, 2), 'MSTORE',
  push(K_LEN, 1), 'MLOAD', push(OUT + 0x40, 2), 'MSTORE',
  // holds.length, at OUT + 0x60 + 32n
  push(K_LEN, 1), 'MLOAD', 'DUP1', push(5, 1), 'SHL', push(OUT + 0x60, 2), 'ADD', 'MSTORE',

  // for (i = 0; i < users.length; i++)
  push(0, 1), push(I, 2), 'MSTORE',
  '@iloop', 'JUMPDEST',
  push(U_LEN, 1), 'MLOAD', push(I, 2), 'MLOAD', 'LT', 'ISZERO', { label: '@done' }, 'JUMPI',

  // for (j = 0; j < tokens.length; j++)
  push(0, 1), push(J, 2), 'MSTORE',
  '@jloop', 'JUMPDEST',
  push(T_LEN, 1), 'MLOAD', push(J, 2), 'MLOAD', 'LT', 'ISZERO', { label: '@inext' }, 'JUMPI',

  // Precompile input: abi.encode(users[i], tokens[j])
  push(I, 2), 'MLOAD', push(5, 1), 'SHL', push(U_PTR, 1), 'MLOAD', 'ADD', 'CALLDATALOAD', push(IO, 1), 'MSTORE',
  push(J, 2), 'MLOAD', push(5, 1), 'SHL', push(T_PTR, 1), 'MLOAD', 'ADD', 'CALLDATALOAD', push(IO + 0x20, 1), 'MSTORE',

  // staticcall(gas, 0x0801, IO, 0x40, IO, 0x60)
  push(0x60, 1), push(IO, 1), push(0x40, 1), push(IO, 1), push(0x0801, 2), 'GAS', 'STATICCALL',
  // Skip unless the call succeeded and returned all three words
  'RETURNDATASIZE', push(0x60, 1), 'GT', 'ISZERO', 'AND',
  'ISZERO', { label: '@jnext' }, 'JUMPI',

  // totals[k] = total, at OUT + 0x60 + 32k
  push(IO, 1), 'MLOAD',
  push(K, 2), 'MLOAD', push(5, 1), 'SHL', push(OUT + 0x60, 2), 'ADD', 'MSTORE',
  // holds[k] = hold, at OUT + 0x80 + 32n + 32k
  push(IO + 0x20, 1), 'MLOAD',
  push(K, 2), 'MLOAD', push(K_LEN, 1), 'MLOAD', 'ADD', push(5, 1), 'SHL', push(OUT + 0x80, 2), 'ADD', 'MSTORE',

  '@jnext', 'JUMPDEST',
  push(K, 2), 'MLOAD', push(1, 1), 'ADD', push(K, 2), 'MSTORE',
  push(J, 2), 'MLOAD', push(1, 1), 'ADD', push(J, 2), 'MSTORE',
  { label: '@jloop' }, 'JUMP',

  '@inext', 'JUMPDEST',
  push(I, 2), 'MLOAD', push(1, 1), 'ADD', push(I, 2), 'MSTORE',
  { label: '@iloop' }, 'JUMP',

  // return(OUT, 0x80 + 64n)
  '@done', 'JUMPDEST',
  push(K_LEN, 1), 'MLOAD', push(6, 1), 'SHL', push(0x80, 1), 'ADD', push(OUT, 2), 'RETURN'
] // prettier-ignore

/** Assembles a listing into hex. Labels are pushed as two-byte addresses. */
export function assemble(ops: Op[]): string {
  const sizeOf = (op: Op): number => {
    if (typeof op === 'object') {
      if ('label' in op) return 3
      return 1 + (op.push.length - 2) / 2
    }
    if (op.startsWith('@')) return 0
    if (op.startsWith('PUSH')) return 1 + parseInt(op.slice(4))
    return 1
  }

  const labels = new Map<string, number>()
  let pc = 0
  for (const op of ops) {
    if (typeof op === 'string' && op.startsWith('@')) labels.set(op, pc)
    pc += sizeOf(op)
  }

  let out = ''
  for (const op of ops) {
    if (typeof op === 'object') {
      if ('label' in op) {
        const dest = labels.get(op.label)
        if (dest == null) throw new Error(`Unknown label ${op.label}`)
        out += '61' + dest.toString(16).padStart(4, '0')
      } else {
        const bytes = (op.push.length - 2) / 2
        out += (0x5f + bytes).toString(16) + op.push.slice(2)
      }
      continue
    }
    if (op.startsWith('@')) continue
    if (op.startsWith('PUSH')) {
      const [name, data] = op.split(':')
      out += (0x5f + parseInt(name.slice(4))).toString(16) + data
      continue
    }
    const code = OPCODES[op]
    if (code == null) throw new Error(`Unknown opcode ${op}`)
    out += code.toString(16).padStart(2, '0')
  }
  return out
}

export const runtimeCode = assemble(RUNTIME)

/** Copies the runtime into memory and returns it. */
export const initCode = (() => {
  const length = runtimeCode.length / 2
  const INIT_SIZE = 13
  return (
    assemble([
      push(length, 2),
      'DUP1',
      push(INIT_SIZE, 2),
      push(0, 1),
      'CODECOPY',
      push(0, 1),
      'RETURN'
    ]) + runtimeCode
  )
})()

if (require.main === module) {
  console.log(`selector ${SELECTOR}`)
  console.log(`runtime 0x${runtimeCode}`)
  console.log(`init 0x${initCode}`)
}
