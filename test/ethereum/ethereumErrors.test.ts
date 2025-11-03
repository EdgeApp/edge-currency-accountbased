import { expect } from 'chai'
import { describe, it } from 'mocha'

import {
  isKnownRetriableError,
  RetriableError
} from '../../src/ethereum/ethereumErrors'
import { RateLimitError } from '../../src/ethereum/networkAdapters/networkAdapterTypes'

/**
 * Wraps an error to make it explicitly retriable
 */
function makeRetriableError(error: any): RetriableError {
  const message = error?.message ?? String(error)
  return new RetriableError(`Retriable error: ${message}`)
}

describe('ethereumErrors', () => {
  describe('isKnownRetriableError', () => {
    it('should identify RateLimitError as retriable', () => {
      const error = new RateLimitError('Rate limit exceeded')
      expect(isKnownRetriableError(error)).to.equal(true)
    })

    it('should identify RetriableError as retriable', () => {
      const error = new RetriableError('This should be retried')
      expect(isKnownRetriableError(error)).to.equal(true)
    })

    it('should NOT identify unknown errors as retriable', () => {
      const nonRetriableErrors = [
        new Error('Invalid address'),
        new TypeError('Cannot read property of undefined'),
        new SyntaxError('Unexpected token'),
        { message: 'User rejected transaction' },
        { code: 'INVALID_ARGUMENT' },
        { status: 400 }, // Bad Request
        { status: 401 }, // Unauthorized
        { status: 403 }, // Forbidden
        { status: 404 } // Not Found
      ]

      for (const error of nonRetriableErrors) {
        expect(isKnownRetriableError(error)).to.equal(false)
      }
    })

    it('should handle null and undefined gracefully', () => {
      expect(isKnownRetriableError(null)).to.equal(false)
      expect(isKnownRetriableError(undefined)).to.equal(false)
      expect(isKnownRetriableError({})).to.equal(false)
    })
  })

  describe('RetriableError', () => {
    it('should create an error with correct name and message', () => {
      const error = new RetriableError('Test message')
      expect(error).to.be.instanceOf(Error)
      expect(error.name).to.equal('RetriableError')
      expect(error.message).to.equal('Test message')
    })
  })

  describe('makeRetriableError', () => {
    it('should wrap an error as retriable', () => {
      const originalError = new Error('Original error')
      const retriableError = makeRetriableError(originalError)

      expect(retriableError).to.be.instanceOf(RetriableError)
      expect(retriableError.message).to.equal('Retriable error: Original error')
    })

    it('should handle string errors', () => {
      const retriableError = makeRetriableError('String error')

      expect(retriableError).to.be.instanceOf(RetriableError)
      expect(retriableError.message).to.equal('Retriable error: String error')
    })

    it('should handle objects without message property', () => {
      const retriableError = makeRetriableError({ code: 'SOME_CODE' })

      expect(retriableError).to.be.instanceOf(RetriableError)
      expect(retriableError.message).to.include('Retriable error:')
    })
  })
})
