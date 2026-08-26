import {
  createIntegratedAddress,
  splitIntegratedAddress
} from '@zano-project/zano-utils-js'

/**
 * The one shape an HF6 payment id can take: exactly 8 bytes of hex. The
 * intrinsic per-output id the network delivers is a fixed 8 bytes, and
 * `createIntegratedAddress` refuses anything else.
 */
const PAYMENT_ID_REGEXP = /^[0-9a-fA-F]{16}$/

/**
 * Resolves the destination for a spend that carries a payment id.
 *
 * Since Zano HF6, payment ids travel inside integrated addresses -- the
 * wallet attaches each destination's embedded id natively, and the node
 * rejects the old transaction-wide field outright. Exchanges still hand
 * users a plain address and a payment id separately, so when the id is the
 * 8 hex bytes an integrated address can encode, this builds that address on
 * the user's behalf. The combination is lossless: an integrated address is
 * exactly the (address, payment id) pair, base58-packed, so the receiver
 * sees the same intrinsic id their own `make_integrated_address` would have
 * produced.
 *
 * An id with any other shape is refused rather than padded or truncated: a
 * transformed id would not match the receiver's crediting ledger, which
 * turns a loud failure into a silently lost deposit.
 *
 * @param address - The destination address, plain or already integrated.
 * @param paymentId - The payment id the transaction must deliver, as hex.
 * @returns The address to actually send to.
 * @throws When the address is already integrated with a different id, or
 * the id cannot be encoded into an integrated address.
 */
export function resolvePaymentIdDestination(
  address: string,
  paymentId: string
): string {
  // Already integrated? Then the address itself is the delivery mechanism,
  // and the separate id is only acceptable as agreement. Checking this
  // first also matters because `createIntegratedAddress` accepts an
  // integrated address and silently swaps its embedded id for the one
  // supplied -- a blind create would override what the address carries.
  let embedded: string | undefined
  try {
    embedded = splitIntegratedAddress(address).paymentId
  } catch (error: unknown) {
    embedded = undefined
  }
  if (embedded != null) {
    if (embedded.toLowerCase() !== paymentId.toLowerCase()) {
      throw new Error(
        'The destination address already carries a different payment id'
      )
    }
    return address
  }

  if (!PAYMENT_ID_REGEXP.test(paymentId)) {
    throw new Error(
      'Zano payment ids are 8 bytes of hex since HF6. This one cannot be ' +
        'delivered; ask the recipient for an integrated deposit address ' +
        'instead.'
    )
  }

  return createIntegratedAddress(address, paymentId.toLowerCase())
}
