import { expect } from 'chai'

import { parseZanoDeeplink } from '../../src/zano/parseZanoDeeplink'

describe('parseZanoDeeplink (Zano Deeplinks Spec)', () => {
  it.skip('parses a simple address', () => {
    const result = parseZanoDeeplink(
      'zano:ZxD9fbcz4Tv7rtroWzA9rLCJ2tvFAU5EWTR1DU8ipV7KBygw7Hk4fs3KxjM2brsiyScwKJbFaLgRo7k4zVEcGaCS1UQpSEXv9'
    )
    expect(result).to.deep.equal({
      action: undefined,
      address:
        'ZxD9fbcz4Tv7rtroWzA9rLCJ2tvFAU5EWTR1DU8ipV7KBygw7Hk4fs3KxjM2brsiyScwKJbFaLgRo7k4zVEcGaCS1UQpSEXv9'
    })
  })

  it('parses send action with all params', () => {
    const uri =
      'zano:?action=send&address=ZxD9fbcz4Tv7rtroWzA9rLCJ2tvFAU5EWTR1DU8ipV7KBygw7Hk4fs3KxjM2brsiyScwKJbFaLgRo7k4zVEcGaCS1UQpSEXv9&amount=10.0&asset_id=1&comment=Some%20payment&mixins=11&hide_sender=true&hide_receiver=true'
    const result = parseZanoDeeplink(uri)
    expect(result).to.deep.equal({
      action: 'send',
      address:
        'ZxD9fbcz4Tv7rtroWzA9rLCJ2tvFAU5EWTR1DU8ipV7KBygw7Hk4fs3KxjM2brsiyScwKJbFaLgRo7k4zVEcGaCS1UQpSEXv9',
      amount: '10.0',
      asset_id: '1',
      comment: 'Some payment',
      mixins: '11',
      hide_sender: true,
      hide_receiver: true
    })
  })

  it('parses marketplace_offer_create action with all params', () => {
    const uri =
      'zano:?action=marketplace_offer_create&mixins=11&hide_sender=true&hide_receiver=true&title=Random%20t-shirt&description=One%20size%20fits%20all&category=merch-tshirt&price=10&img-url=&contact=@ravaga&comments=zzzz'
    const result = parseZanoDeeplink(uri)
    expect(result).to.deep.equal({
      action: 'marketplace_offer_create',
      mixins: '11',
      hide_sender: 'true',
      hide_receiver: 'true',
      title: 'Random t-shirt',
      description: 'One size fits all',
      category: 'merch-tshirt',
      price: '10',
      'img-url': '',
      contact: '@ravaga',
      comments: 'zzzz',
      address: undefined
    })
  })

  it('parses escrow action with all params', () => {
    const uri =
      'zano:?action=escrow&description=Some%20Description&seller_address=ZxCXALhZRodKmqRCWUPNAUCXqprJBNKv4eFsjzcMooAGVM6J2U2vSyTNpxNybwBnvzGWLtSWpBiddSZhph8HNfBn1bVE3c6ix&amount=10&my_deposit=5&seller_deposit=5&comment=Some%20comment%20if%20needed'
    const result = parseZanoDeeplink(uri)
    expect(result).to.deep.equal({
      action: 'escrow',
      description: 'Some Description',
      seller_address:
        'ZxCXALhZRodKmqRCWUPNAUCXqprJBNKv4eFsjzcMooAGVM6J2U2vSyTNpxNybwBnvzGWLtSWpBiddSZhph8HNfBn1bVE3c6ix',
      amount: '10',
      my_deposit: '5',
      seller_deposit: '5',
      comment: 'Some comment if needed',
      address: undefined
    })
  })

  it.skip('parses address in both path and param, path takes precedence', () => {
    const uri =
      'zano:ZxD9fbcz4Tv7rtroWzA9rLCJ2tvFAU5EWTR1DU8ipV7KBygw7Hk4fs3KxjM2brsiyScwKJbFaLgRo7k4zVEcGaCS1UQpSEXv9?action=send&address=otheraddress&amount=1'
    const result = parseZanoDeeplink(uri)
    expect(result).to.deep.equal({
      action: 'send',
      address:
        'ZxD9fbcz4Tv7rtroWzA9rLCJ2tvFAU5EWTR1DU8ipV7KBygw7Hk4fs3KxjM2brsiyScwKJbFaLgRo7k4zVEcGaCS1UQpSEXv9',
      amount: '1'
    })
  })

  it.skip('parses unknown action and extra params', () => {
    const uri = 'zano:?action=custom_action&foo=bar&baz=qux'
    const result = parseZanoDeeplink(uri)
    expect(result).to.deep.equal({
      action: 'custom_action'
    })
  })

  it('throws on missing scheme', () => {
    expect(() =>
      parseZanoDeeplink(
        'ZxD9fbcz4Tv7rtroWzA9rLCJ2tvFAU5EWTR1DU8ipV7KBygw7Hk4fs3KxjM2brsiyScwKJbFaLgRo7k4zVEcGaCS1UQpSEXv9'
      )
    ).to.throw('Invalid Zano URI')
  })

  it.skip('parses empty zano: URI', () => {
    const result = parseZanoDeeplink('zano:')
    expect(result).to.deep.equal({
      action: undefined,
      address: undefined
    })
  })

  it('parses a send deeplink with address and comment in query', () => {
    const uri =
      'zano:action=send&address=ZxD9fbcz4Tv7rtroWzA9rLCJ2tvFAU5EWTR1DU8ipV7KBygw7Hk4fs3KxjM2brsiyScwKJbFaLgRo7k4zVEcGaCS1UQpSEXv9&amount=0.126358352287&comment=payment_id:cd9ee764976a42c5'
    const result = parseZanoDeeplink(uri)
    expect(result).to.deep.equal({
      action: 'send',
      address:
        'ZxD9fbcz4Tv7rtroWzA9rLCJ2tvFAU5EWTR1DU8ipV7KBygw7Hk4fs3KxjM2brsiyScwKJbFaLgRo7k4zVEcGaCS1UQpSEXv9',
      amount: '0.126358352287',
      asset_id: undefined,
      comment: 'payment_id:cd9ee764976a42c5',
      mixins: undefined,
      hide_sender: false,
      hide_receiver: false
    })
  })
})
