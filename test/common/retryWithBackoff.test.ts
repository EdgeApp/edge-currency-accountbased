import { expect } from 'chai'
import { describe, it } from 'mocha'

import {
  RetryCancelledError,
  retryWithBackoff
} from '../../src/common/retryWithBackoff'

describe('retryWithBackoff', () => {
  describe('High-level scenarios', () => {
    it('should succeed after a few retries with jitter', async () => {
      let attempts = 0
      const result = await retryWithBackoff(
        async () => {
          attempts++
          if (attempts < 3) {
            throw new Error('Temporary network error')
          }
          return { data: 'success', responseTime: 42 }
        },
        {
          initialDelay: 10,
          maxDelay: 100,
          backoffFactor: 2,
          maxRetries: 5,
          jitter: 0.25
        }
      )

      expect(result.result).to.deep.equal({ data: 'success', responseTime: 42 })
      expect(result.attempts).to.equal(3)
      expect(attempts).to.equal(3)
      expect(result.totalDelay).to.be.greaterThan(0)
    })

    it('should fail after exhausting max retries', async () => {
      let attempts = 0
      try {
        await retryWithBackoff(
          async () => {
            attempts++
            throw new Error('Persistent network failure')
          },
          {
            initialDelay: 10,
            maxDelay: 50,
            backoffFactor: 2,
            maxRetries: 3
          }
        )
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.equal('Persistent network failure')
        expect(attempts).to.equal(4) // Initial attempt + 3 retries
      }
    })

    it('should cancel operation when AbortSignal is triggered', async () => {
      const abortController = new AbortController()
      let attempts = 0

      // Start retry operation
      const retryPromise = retryWithBackoff(
        async () => {
          attempts++
          throw new Error('Will keep retrying')
        },
        {
          initialDelay: 100,
          maxDelay: 1000,
          signal: abortController.signal
          // No maxRetries - would retry indefinitely
        }
      )

      // Cancel after a short delay
      setTimeout(() => abortController.abort(), 250)

      try {
        await retryPromise
        expect.fail('Should have thrown RetryCancelledError')
      } catch (error: any) {
        expect(error).to.be.instanceOf(RetryCancelledError)
        expect(error.message).to.equal('Retry cancelled')
        expect(attempts).to.be.at.least(2).and.at.most(3)
      }
    })

    it('should not retry non-retriable errors', async () => {
      let attempts = 0

      try {
        await retryWithBackoff(
          async () => {
            attempts++
            if (attempts === 1) {
              throw new Error('INVALID_API_KEY')
            }
            throw new Error('NETWORK_ERROR')
          },
          {
            initialDelay: 10,
            maxRetries: 3,
            isRetriableError: (error: any) => {
              // Only retry network errors, not auth errors
              const message = error?.message
              if (typeof message !== 'string') return true
              return !message.includes('INVALID_API_KEY')
            }
          }
        )
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).to.equal('INVALID_API_KEY')
        expect(attempts).to.equal(1) // Should not retry auth errors
      }
    })
  })

  describe.skip('Detailed behavior tests', () => {
    it('should succeed on first attempt if function succeeds', async () => {
      let attempts = 0
      const result = await retryWithBackoff(
        async () => {
          attempts++
          return 'success'
        },
        { maxRetries: 3 }
      )

      expect(result.result).to.equal('success')
      expect(result.attempts).to.equal(1)
      expect(attempts).to.equal(1)
    })

    it('should apply exponential backoff correctly', async () => {
      const delays: number[] = []
      let lastTime = Date.now()
      let attempts = 0

      await retryWithBackoff(
        async () => {
          attempts++
          const now = Date.now()
          if (attempts > 1) {
            delays.push(now - lastTime)
          }
          lastTime = now

          if (attempts < 4) {
            throw new Error('Retry me')
          }
          return 'success'
        },
        {
          initialDelay: 100,
          maxDelay: 1000,
          backoffFactor: 2,
          maxRetries: 5,
          jitter: 0 // No jitter for predictable delay testing
        }
      )

      // Check that delays are approximately correct (allowing for some variance)
      expect(delays.length).to.equal(3)
      expect(delays[0]).to.be.at.least(90).and.at.most(110) // ~100ms
      expect(delays[1]).to.be.at.least(190).and.at.most(210) // ~200ms
      expect(delays[2]).to.be.at.least(390).and.at.most(410) // ~400ms
    })

    it('should respect max delay cap', async () => {
      const delays: number[] = []
      let lastTime = Date.now()
      let attempts = 0

      await retryWithBackoff(
        async () => {
          attempts++
          const now = Date.now()
          if (attempts > 1) {
            delays.push(now - lastTime)
          }
          lastTime = now

          if (attempts < 5) {
            throw new Error('Retry me')
          }
          return 'success'
        },
        {
          initialDelay: 100,
          maxDelay: 150, // Cap at 150ms
          backoffFactor: 2,
          maxRetries: 5,
          jitter: 0 // No jitter for predictable delay testing
        }
      )

      // Check that delays don't exceed max delay
      expect(delays.length).to.equal(4)
      expect(delays[0]).to.be.at.least(90).and.at.most(110) // ~100ms
      expect(delays[1]).to.be.at.least(140).and.at.most(160) // ~150ms (capped)
      expect(delays[2]).to.be.at.least(140).and.at.most(160) // ~150ms (capped)
      expect(delays[3]).to.be.at.least(140).and.at.most(160) // ~150ms (capped)
    })

    it('should support infinite retries when maxRetries is not specified', async () => {
      let attempts = 0
      const result = await retryWithBackoff(
        async () => {
          attempts++
          if (attempts < 10) {
            throw new Error('Keep retrying')
          }
          return 'finally succeeded'
        },
        {
          initialDelay: 10,
          maxDelay: 20,
          backoffFactor: 2
          // Don't specify maxRetries - should use default of 5
        }
      )

      expect(result.result).to.equal('finally succeeded')
      expect(result.attempts).to.equal(10)
      expect(attempts).to.equal(10)
    })

    it('should cancel immediately if AbortSignal is already aborted', async () => {
      const abortController = new AbortController()
      abortController.abort() // Abort before starting

      let attempts = 0
      try {
        await retryWithBackoff(
          async () => {
            attempts++
            return 'should not reach here'
          },
          {
            signal: abortController.signal
          }
        )
        expect.fail('Should have thrown RetryCancelledError')
      } catch (error: any) {
        expect(error).to.be.instanceOf(RetryCancelledError)
        expect(attempts).to.equal(0) // Should not have attempted at all
      }
    })

    it('should cancel between retries when AbortSignal is triggered', async () => {
      const abortController = new AbortController()
      let attempts = 0
      let errorThrown = false

      const retryPromise = retryWithBackoff(
        async () => {
          attempts++
          if (attempts === 1) {
            // Trigger abort after first attempt
            setTimeout(() => abortController.abort(), 50)
            errorThrown = true
            throw new Error('First attempt failed')
          }
          return 'should not reach here'
        },
        {
          initialDelay: 100, // Will wait 100ms before retry
          signal: abortController.signal
        }
      )

      try {
        await retryPromise
        expect.fail('Should have thrown RetryCancelledError')
      } catch (error: any) {
        expect(error).to.be.instanceOf(RetryCancelledError)
        expect(attempts).to.equal(1) // Should have only attempted once
        expect(errorThrown).to.equal(true)
      }
    })

    it('should apply jitter to delays when configured', async () => {
      const delays: number[] = []
      let lastTime = Date.now()
      let attempts = 0

      await retryWithBackoff(
        async () => {
          attempts++
          const now = Date.now()
          if (attempts > 1) {
            delays.push(now - lastTime)
          }
          lastTime = now

          if (attempts < 4) {
            throw new Error('Retry me')
          }
          return 'success'
        },
        {
          initialDelay: 100,
          maxDelay: 1000,
          backoffFactor: 2,
          maxRetries: 5,
          jitter: 0.5 // 50% jitter for more noticeable variation
        }
      )

      // With jitter, delays should vary from the base delay
      // Base delays would be: 100ms, 200ms, 400ms
      // With 50% jitter, actual delays should be between:
      // 100-150ms, 200-300ms, 400-600ms
      expect(delays.length).to.equal(3)
      expect(delays[0]).to.be.at.least(100).and.at.most(150)
      expect(delays[1]).to.be.at.least(200).and.at.most(300)
      expect(delays[2]).to.be.at.least(400).and.at.most(600)

      // Verify that delays are not exactly the base values (jitter is working)
      // It's extremely unlikely for random jitter to produce exactly the base value
      const hasJitter =
        delays[0] !== 100 || delays[1] !== 200 || delays[2] !== 400
      expect(hasJitter).to.equal(true)
    })

    it('should not apply jitter when jitter is 0', async () => {
      const delays: number[] = []
      let lastTime = Date.now()
      let attempts = 0

      await retryWithBackoff(
        async () => {
          attempts++
          const now = Date.now()
          if (attempts > 1) {
            delays.push(now - lastTime)
          }
          lastTime = now

          if (attempts < 4) {
            throw new Error('Retry me')
          }
          return 'success'
        },
        {
          initialDelay: 100,
          maxDelay: 1000,
          backoffFactor: 2,
          maxRetries: 5,
          jitter: 0 // No jitter
        }
      )

      // Without jitter, delays should be exactly the base delays
      expect(delays.length).to.equal(3)
      expect(delays[0]).to.be.at.least(95).and.at.most(105) // ~100ms (allowing for small timing variance)
      expect(delays[1]).to.be.at.least(195).and.at.most(205) // ~200ms
      expect(delays[2]).to.be.at.least(395).and.at.most(405) // ~400ms
    })
  })
})
