import { createHmac } from 'crypto'

/**
 * Derives the per-wallet registry passphrase from the wallet's seed. The SDK
 * requires a unique, high-entropy, secret-derived passphrase per local wallet
 * (never a shared or hardcoded one), so HMAC the seed rather than passing the
 * raw mnemonic as the passphrase.
 *
 * This runs on the core (webpack) side, where `crypto` is polyfilled by
 * `crypto-browserify`. It must NOT be imported by the native IO bridge, which
 * is bundled by Metro where `crypto` does not resolve; the bridge receives the
 * already-derived passphrase through its wallet config instead.
 */
const PASSPHRASE_DOMAIN = 'edge-pirate-wallet-registry-v1'

export const derivePiratechainRegistryPassphrase = (mnemonic: string): string =>
  createHmac('sha256', mnemonic).update(PASSPHRASE_DOMAIN).digest('hex')
