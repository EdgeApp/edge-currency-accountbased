import { expect } from 'chai'
import { describe } from 'mocha'

import { formatAggregateError, promiseAny } from '../../src/common/promiseUtils'

describe(`promiseAny`, function () {
  async function success(): Promise<string> {
    return 'success'
  }
  async function failure(): Promise<string> {
    throw new Error('failure')
  }

  it(`promiseAny success`, async function () {
    expect(await promiseAny([success(), failure()])).to.equal('success')
    expect(await promiseAny([failure(), success()])).to.equal('success')
    expect(await promiseAny([success(), failure(), success()])).to.equal(
      'success'
    )
    expect(await promiseAny([success(), failure(), failure()])).to.equal(
      'success'
    )
    expect(await promiseAny([failure(), success(), failure()])).to.equal(
      'success'
    )
    expect(await promiseAny([failure(), failure(), success()])).to.equal(
      'success'
    )
  })

  it(`promiseAny failure`, async function () {
    await promiseAny([failure(), failure()])
      .then(() => {
        throw new Error('Should have thrown')
      })
      .catch(err => {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.have.property('message', 'All promises were rejected')
        expect(err).to.have.property('errors')
      })
  })

  it('Formats aggregate errors', async function () {
    await formatAggregateError(
      promiseAny([failure(), failure()]),
      'Pretty bad:'
    )
      .then(() => {
        throw new Error('Should have thrown')
      })
      .catch(err => {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.have.property('message', 'Pretty bad:\n• Error: failure')
      })
  })
})
