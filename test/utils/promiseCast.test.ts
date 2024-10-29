import { expect } from 'chai'
import { describe } from 'mocha'

import { promiseCast } from '../../src/common/utils'

describe(`promiseCast`, function () {
  async function success(n: number): Promise<string> {
    return 'success ' + String(n)
  }
  async function failure(): Promise<string> {
    throw new Error('failure')
  }

  it(`promiseCast all success`, async function () {
    const result = await promiseCast([success(1), success(2)])
    expect(result).to.deep.equal({
      values: ['success 1', 'success 2'],
      errors: []
    })
  })
  it(`promiseCast one success and one failure`, async function () {
    const result1 = await promiseCast([success(1), failure()])
    expect(result1).to.deep.equal({
      values: ['success 1'],
      errors: [new Error('failure')]
    })
    const result2 = await promiseCast([failure(), success(1)])
    expect(result2).to.deep.equal({
      values: ['success 1'],
      errors: [new Error('failure')]
    })
  })
  it(`promiseCast multiple successes out of many`, async function () {
    expect(
      await promiseCast([success(1), failure(), success(2)])
    ).to.deep.equal({
      values: ['success 1', 'success 2'],
      errors: [new Error('failure')]
    })
    expect(await promiseCast([success(1), failure(), failure()])).to.deep.equal(
      {
        values: ['success 1'],
        errors: [new Error('failure'), new Error('failure')]
      }
    )
    expect(await promiseCast([failure(), success(1), failure()])).to.deep.equal(
      {
        values: ['success 1'],
        errors: [new Error('failure'), new Error('failure')]
      }
    )
    expect(await promiseCast([failure(), failure(), success(1)])).to.deep.equal(
      {
        values: ['success 1'],
        errors: [new Error('failure'), new Error('failure')]
      }
    )
  })
  it(`promiseCast failure`, async function () {
    await promiseCast([failure(), failure()])
      .then(() => {
        throw new Error('Should have thrown')
      })
      .catch(err => {
        expect(err).to.be.instanceOf(Error)
        expect(err).to.have.property('message')
        expect(err.message).to.equal(
          'Promise Cast Rejected:\n  Error: failure;\n  Error: failure'
        )
      })
  })
})
