import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  WebAuth
} from '@stellar/stellar-sdk'
import { assert, expect } from 'chai'
import { randomBytes } from 'crypto'
import { describe, it } from 'mocha'

import {
  Sep10ChallengeOptions,
  signSep10Challenge
} from '../../src/stellar/stellarSep10'

const HOME_DOMAIN = 'testanchor.stellar.org'
const WEB_AUTH_DOMAIN = 'testanchor.stellar.org'
const PASSPHRASE = Networks.TESTNET

const server = Keypair.random()
const client = Keypair.random()

const opts: Sep10ChallengeOptions = {
  homeDomain: HOME_DOMAIN,
  webAuthDomain: WEB_AUTH_DOMAIN,
  serverSigningKey: server.publicKey()
}

/** A well-formed challenge, built the way an anchor builds one. */
function makeChallenge(
  clientAccount: string = client.publicKey(),
  webAuthDomain: string = WEB_AUTH_DOMAIN
): string {
  return WebAuth.buildChallengeTx(
    server,
    clientAccount,
    HOME_DOMAIN,
    300,
    PASSPHRASE,
    webAuthDomain
  )
}

interface CustomChallenge {
  sequence?: string
  extraOps?: Operation[]
  webAuthDomainOp?: boolean
  timebounds?: [number, number]
  signed?: boolean
}

/** A hand-built challenge, so each test can break one rule. */
function makeCustomChallenge(custom: CustomChallenge = {}): string {
  const now = Math.floor(Date.now() / 1000)
  const {
    sequence = '-1',
    extraOps = [],
    webAuthDomainOp = true,
    timebounds = [now, now + 300],
    signed = true
  } = custom

  let builder = new TransactionBuilder(
    new Account(server.publicKey(), sequence),
    { fee: '100', networkPassphrase: PASSPHRASE }
  )
    .setTimebounds(timebounds[0], timebounds[1])
    .addOperation(
      Operation.manageData({
        name: `${HOME_DOMAIN} auth`,
        value: randomBytes(48).toString('base64'),
        source: client.publicKey()
      })
    )
  if (webAuthDomainOp) {
    builder = builder.addOperation(
      Operation.manageData({
        name: 'web_auth_domain',
        value: WEB_AUTH_DOMAIN,
        source: server.publicKey()
      })
    )
  }
  for (const op of extraOps) builder = builder.addOperation(op as any)

  const tx = builder.build()
  if (signed) tx.sign(server)
  return tx.toXDR()
}

function expectInvalid(challengeXdr: string, message: RegExp): void {
  expect(() =>
    signSep10Challenge(challengeXdr, opts, PASSPHRASE, client.secret())
  ).to.throw(message)
}

describe('signSep10Challenge', function () {
  it('signs a valid challenge with the wallet key', function () {
    const signedXdr = signSep10Challenge(
      makeChallenge(),
      opts,
      PASSPHRASE,
      client.secret()
    )
    const signed = new Transaction(signedXdr, PASSPHRASE)
    assert.equal(signed.signatures.length, 2)

    // The anchor-side check passes with the wallet as the only signer:
    const signers = WebAuth.verifyChallengeTxSigners(
      signedXdr,
      server.publicKey(),
      PASSPHRASE,
      [client.publicKey()],
      HOME_DOMAIN,
      WEB_AUTH_DOMAIN
    )
    assert.deepEqual(signers, [client.publicKey()])
  })

  it('signs a hand-built challenge that follows every rule', function () {
    const signedXdr = signSep10Challenge(
      makeCustomChallenge(),
      opts,
      PASSPHRASE,
      client.secret()
    )
    assert.equal(new Transaction(signedXdr, PASSPHRASE).signatures.length, 2)
  })

  it('rejects a challenge from a different server key', function () {
    expect(() =>
      signSep10Challenge(
        makeChallenge(),
        { ...opts, serverSigningKey: Keypair.random().publicKey() },
        PASSPHRASE,
        client.secret()
      )
    ).to.throw(/source account is not equal to the server's account/)
  })

  it('rejects a nonzero sequence number', function () {
    expectInvalid(
      makeCustomChallenge({ sequence: '5' }),
      /sequence number should be zero/
    )
  })

  it('rejects an operation that is not manageData', function () {
    const payment = Operation.payment({
      destination: server.publicKey(),
      asset: Asset.native(),
      amount: '1',
      source: server.publicKey()
    })
    expectInvalid(
      makeCustomChallenge({ extraOps: [payment] }),
      /operations that are not of type 'manageData'/
    )
  })

  it('rejects the wrong home domain', function () {
    expect(() =>
      signSep10Challenge(
        makeChallenge(),
        { ...opts, homeDomain: 'evil.example.com' },
        PASSPHRASE,
        client.secret()
      )
    ).to.throw(/does not match the expected home domain/)
  })

  it('rejects the wrong web_auth_domain', function () {
    expectInvalid(
      makeChallenge(client.publicKey(), 'evil.example.com'),
      /'web_auth_domain' operation value does not match/
    )
  })

  it('rejects a challenge with no web_auth_domain operation', function () {
    expectInvalid(
      makeCustomChallenge({ webAuthDomainOp: false }),
      /no web_auth_domain operation/
    )
  })

  it('rejects expired timebounds', function () {
    const past = Math.floor(Date.now() / 1000) - 3600
    expectInvalid(
      makeCustomChallenge({ timebounds: [past - 300, past] }),
      /has expired/
    )
  })

  it('rejects a challenge without the server signature', function () {
    expectInvalid(
      makeCustomChallenge({ signed: false }),
      /not signed by server/
    )
  })

  it('rejects a challenge for another account', function () {
    expectInvalid(
      makeChallenge(Keypair.random().publicKey()),
      /not this wallet/
    )
  })

  it('rejects an unrequested client_domain operation', function () {
    const clientDomain = Operation.manageData({
      name: 'client_domain',
      value: 'wallet.example.com',
      source: Keypair.random().publicKey()
    })
    expectInvalid(
      makeCustomChallenge({ extraOps: [clientDomain] }),
      /unrequested client_domain/
    )
  })

  it('rejects a challenge for another network', function () {
    expect(() =>
      signSep10Challenge(
        makeChallenge(),
        opts,
        Networks.PUBLIC,
        client.secret()
      )
    ).to.throw(/not signed by server/)
  })
})
