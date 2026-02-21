import { snooze } from './utils'

/**
 * Error thrown when a retry operation is cancelled via AbortSignal
 */
export class RetryCancelledError extends Error {
  constructor(message = 'Retry cancelled') {
    super(message)
    this.name = 'RetryCancelledError'
  }
}

export interface RetryConfig {
  /** Starting delay in milliseconds (default: 1000ms) */
  initialDelay?: number
  /** Maximum delay cap in milliseconds (default: 60000ms) */
  maxDelay?: number
  /** Exponential factor (default: 2) */
  backoffFactor?: number
  /** Maximum retry attempts (default: undefined = infinite retries) */
  maxRetries?: number
  /** AbortSignal for cancellation */
  signal?: AbortSignal
  /** Jitter factor for randomization (default: 0.25 = up to 25% randomization) */
  jitter?: number
  /** Function to determine if an error is retriable (default: all errors are retriable) */
  isRetriableError?: (error: any) => boolean
}

export interface RetryResult<T> {
  /** The successful result from the function */
  result: T
  /** Number of attempts made (including the successful one) */
  attempts: number
  /** Total milliseconds spent waiting between retries */
  totalDelay: number
}

/**
 * Execute a function with retry logic using exponential backoff
 * @param fn The async function to execute
 * @param config Retry configuration
 * @returns The result of the function if successful
 * @throws The last error if retries are exhausted, if error is not retriable, or if cancelled
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<RetryResult<T>> {
  const {
    initialDelay = 1000,
    maxDelay = 60000,
    backoffFactor = 2,
    maxRetries,
    jitter = 0.25,
    signal,
    isRetriableError = () => true
  } = config

  let currentDelay = initialDelay
  let totalDelay = 0
  let attempts = 0

  while (true) {
    // Check for cancellation
    if (signal?.aborted != null && signal.aborted) {
      throw new RetryCancelledError()
    }

    attempts++

    try {
      const result = await fn()
      return {
        result,
        attempts,
        totalDelay
      }
    } catch (error) {
      // If it's not a retriable error, throw immediately
      if (!isRetriableError(error)) {
        throw error
      }

      // If we have a maxRetries limit and exhausted it, throw the last error
      if (maxRetries != null && attempts > maxRetries) {
        throw error
      }

      // Check for cancellation before sleeping
      if (signal?.aborted != null && signal.aborted) {
        throw new RetryCancelledError()
      }

      // Apply jitter if configured
      const jitteredDelay =
        jitter > 0
          ? currentDelay + Math.random() * currentDelay * jitter
          : currentDelay

      // Wait before retrying
      await snooze(jitteredDelay)
      totalDelay += jitteredDelay

      // Calculate next delay with exponential backoff
      currentDelay = Math.min(currentDelay * backoffFactor, maxDelay)
    }
  }
}
