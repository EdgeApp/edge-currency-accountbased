import { Keypair, WebAuth } from '@stellar/stellar-sdk'
import { asObject, asString } from 'cleaners'

/**
 * What the wallet expects from an anchor's SEP-10 challenge.
 * The caller reads these from the anchor's stellar.toml (SEP-1).
 */
export const asSep10ChallengeOptions = asObject({
  /** The anchor's home domain, as in the first operation's `<domain> auth` key. */
  homeDomain: asString,
  /** The host of the anchor's WEB_AUTH_ENDPOINT. */
  webAuthDomain: asString,
  /** The anchor's SIGNING_KEY from stellar.toml. */
  serverSigningKey: asString
})
export type Sep10ChallengeOptions = ReturnType<typeof asSep10ChallengeOptions>

/**
 * Validates a SEP-10 challenge transaction and signs it with the wallet key.
 *
 * stellar-sdk's readChallengeTx checks the server source account, sequence
 * zero, manageData-only operations, the `<homeDomain> auth` first operation,
 * the nonce, the timebounds, the web_auth_domain value, and the server
 * signature. On top of that, this requires the web_auth_domain operation to
 * be present, requires the challenge to be for this wallet's account, and
 * rejects client_domain, which the wallet never requests.
 *
 * Returns the signed transaction envelope as base64 XDR.
 */
export function signSep10Challenge(
  challengeXdr: string,
  opts: Sep10ChallengeOptions,
  networkPassphrase: string,
  stellarKey: string
): string {
  const { homeDomain, webAuthDomain, serverSigningKey } = opts
  const keypair = Keypair.fromSecret(stellarKey)

  const { tx, clientAccountID } = WebAuth.readChallengeTx(
    challengeXdr,
    serverSigningKey,
    networkPassphrase,
    homeDomain,
    webAuthDomain
  )

  if (clientAccountID !== keypair.publicKey()) {
    throw new Error(
      `SEP-10 challenge is for ${clientAccountID}, not this wallet`
    )
  }

  const opNames = tx.operations.map(op =>
    op.type === 'manageData' ? op.name : undefined
  )
  if (!opNames.includes('web_auth_domain')) {
    throw new Error('SEP-10 challenge has no web_auth_domain operation')
  }
  if (opNames.includes('client_domain')) {
    throw new Error('SEP-10 challenge has an unrequested client_domain')
  }

  tx.sign(keypair)
  return tx.toXDR()
}
