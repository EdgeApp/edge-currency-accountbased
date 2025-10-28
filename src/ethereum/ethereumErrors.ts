import { RateLimitError } from './networkAdapters/networkAdapterTypes'

/**
 * Custom error class for errors that should trigger a retry
 */
export class RetriableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RetriableError'
  }
}

/**
 * Determines if an error is a known retriable error that should be retried
 * with exponential backoff. These are errors that are typically transient
 * and can be resolved by retrying the operation.
 *
 * @param error The error to check
 * @returns true if the error is known to be retriable, false otherwise
 */
export function isKnownRetriableError(error: any): boolean {
  // Check for explicit RetriableError instances
  if (error instanceof RetriableError) {
    return true
  }

  // Check for RateLimitError instances
  if (error instanceof RateLimitError) {
    return true
  }

  // Default to false - unknown errors should not be retried
  return false
}
