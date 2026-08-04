import { asJSON, asObject, asString } from 'cleaners'
import { EdgeIo } from 'edge-core-js/types'
import { base16 } from 'rfc4648'

/**
 * The SDK keeps exactly one wallet registry namespace active per device:
 * `configureAccountStorage` switches the global namespace, cancelling any
 * running sync and clearing the registry and block caches. Edge therefore uses
 * a single device-scoped namespace holding every ARRR wallet, keyed by alias
 * (see src/docs/piratechain-sdk-v115-reconcile.md).
 *
 * That namespace still needs a passphrase, and it must be a high-entropy
 * secret that is unique per device rather than a hardcoded or seed-derived
 * value. We mint one from `io.random` the first time the plugin runs and keep
 * it in the plugin's local storage, which never leaves the device.
 *
 * This runs on the core side. The native IO bridge cannot do it: Metro
 * resolves neither `crypto` nor a disklet, so the bridge receives the
 * passphrase through `setDevicePassphrase` instead.
 */
const DEVICE_PASSPHRASE_FILE = 'piratechain/devicePassphrase.json'

const asDevicePassphraseFile = asJSON(
  asObject({
    passphrase: asString
  })
)

let devicePassphrasePromise: Promise<string> | undefined

export const getPiratechainDevicePassphrase = async (
  io: EdgeIo
): Promise<string> => {
  if (devicePassphrasePromise == null) {
    // Serialize, so two wallets starting at once cannot each mint a secret
    // and race to overwrite the other's registry:
    devicePassphrasePromise = loadOrCreateDevicePassphrase(io).catch(
      (error: unknown) => {
        // Don't cache a failure — let the next wallet retry:
        devicePassphrasePromise = undefined
        throw error
      }
    )
  }
  return await devicePassphrasePromise
}

const loadOrCreateDevicePassphrase = async (io: EdgeIo): Promise<string> => {
  const { disklet } = io

  // Check existence before reading, so a transient read failure surfaces as an
  // error instead of silently minting a new secret and orphaning the registry
  // (which would force every wallet to re-scan from its birthday):
  const listing = await disklet.list(DEVICE_PASSPHRASE_FILE)
  if (listing[DEVICE_PASSPHRASE_FILE] === 'file') {
    const text = await disklet.getText(DEVICE_PASSPHRASE_FILE)
    try {
      return asDevicePassphraseFile(text).passphrase
    } catch (error: unknown) {
      // Unreadable contents: fall through and re-mint. The wallets in the
      // abandoned registry restore themselves from their seeds.
    }
  }

  const passphrase = base16.stringify(io.random(32))
  await disklet.setText(DEVICE_PASSPHRASE_FILE, JSON.stringify({ passphrase }))
  return passphrase
}
