import { assert } from 'chai'
import { describe, it } from 'mocha'

import { extendedParseCoins } from '../../src/cosmos/cosmosUtils'

describe(`Cosmos parseCoins test`, function () {
  it(`extendedParseCoins success`, function () {
    assert.deepEqual(extendedParseCoins('819966000ucosm,700000000ustake'), [
      { amount: '819966000', denom: 'ucosm' },
      { amount: '700000000', denom: 'ustake' }
    ])
    assert.deepEqual(
      extendedParseCoins(
        '12345usara-core1r9gc0rnxnzpq33u82f44aufgdwvyxv4wyepyck98m9v2pxua6naqr8h03z'
      ),
      [
        {
          denom:
            'usara-core1r9gc0rnxnzpq33u82f44aufgdwvyxv4wyepyck98m9v2pxua6naqr8h03z',
          amount: '12345'
        }
      ]
    )
    assert.deepEqual(extendedParseCoins('1337uwat'), [
      {
        denom: 'uwat',
        amount: '1337'
      }
    ])
  })
  it(`extendedParseCoins failure`, function () {
    assert.throws(() => extendedParseCoins('54321*uosmo'))
    assert.throws(() => extendedParseCoins('54321*uosmo,54321uatom'))
    assert.throws(() =>
      extendedParseCoins(
        'usara-core1r9gc0rnxnzpq33u82f44aufgdwvyxv4wyepyck98m9v2pxua6naqr8h03z'
      )
    )
    assert.throws(() => extendedParseCoins('54321*uosmo'))
  })
})
