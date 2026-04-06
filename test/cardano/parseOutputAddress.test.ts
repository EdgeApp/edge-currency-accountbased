import * as Cardano from '@emurgo/cardano-serialization-lib-nodejs'
import { assert, expect } from 'chai'
import { describe, it } from 'mocha'

import { parseOutputAddress } from '../../src/cardano/cardanoUtils'

const byronMainnet =
  'Ae2tdPwUPEZKcVUy5JAhPjdXa6PuWMnHDgjWdK4ZyGK33L8YWjBv2saUwaa'
const shelleyMainnet =
  'addr1qy8ac7qqy0vtulyl7wntmsxc6wex80gvcyjy33qffrhm7sh927ysx5sftuw0dlft05dz3c7revpf7jx0xnlcjz3g69mq4afdhv'

describe('cardano parseOutputAddress', function () {
  it('parses Byron base58 to a unified Address', function () {
    const parsed = parseOutputAddress(byronMainnet)
    const roundTrip = Cardano.ByronAddress.from_address(parsed)
    assert.isDefined(roundTrip)
    assert.equal(
      parsed.to_hex(),
      Cardano.ByronAddress.from_base58(byronMainnet).to_address().to_hex()
    )
  })

  it('parses Shelley bech32', function () {
    const parsed = parseOutputAddress(shelleyMainnet)
    const expected = Cardano.Address.from_bech32(shelleyMainnet)
    assert.equal(parsed.to_hex(), expected.to_hex())
  })

  it('throws InvalidPublicAddressError for invalid input', function () {
    expect(() => parseOutputAddress('')).to.throw('InvalidPublicAddressError')
    expect(() => parseOutputAddress('not_a_cardano_address')).to.throw(
      'InvalidPublicAddressError'
    )
  })
})
