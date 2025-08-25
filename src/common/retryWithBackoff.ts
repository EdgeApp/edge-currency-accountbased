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
  initialDelay: number // Starting delay in milliseconds (e.g., 1000ms)
  maxDelay: number // Maximum delay cap in milliseconds (e.g., 60000ms)
  backoffFactor: number // Exponential factor (e.g., 2)
  maxRetries?: number // Maximum retry attempts (optional - if not specified, retries indefinitely)
  signal?: AbortSignal // AbortSignal for cancellation (optional)
  jitter: number // Jitter factor for randomization (0 = no jitter, 0.25 = up to 25% randomization)
}

export interface RetryResult<T> {
  result: T
  attempts: number
  totalDelay: number
}

/**
 * A utility class for executing functions with exponential backoff retry logic.
 * This helps handle transient network failures and rate limiting.
 */
export class RetryWithBackoff {
  /**
   * Execute a function with retry logic using exponential backoff
   * @param fn The async function to execute
   * @param config Retry configuration
   * @param isRetriableError Function to determine if an error is retriable
   * @returns The result of the function if successful
   * @throws The last error if retries are exhausted, if error is not retriable, or if cancelled
   */
  async execute<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    isRetriableError: (error: any) => boolean = () => true
  ): Promise<RetryResult<T>> {
    const defaultConfig: RetryConfig = {
      initialDelay: 1000,
      maxDelay: 60000,
      backoffFactor: 2,
      maxRetries: 5,
      jitter: 0.25 // 25% jitter by default to prevent thundering herd
    }
    const finalConfig = { ...defaultConfig, ...config }
    let currentDelay = finalConfig.initialDelay
    let totalDelay = 0
    let attempts = 0

    while (true) {
      // Check for cancellation
      if (finalConfig.signal?.aborted != null && finalConfig.signal.aborted) {
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
        if (
          finalConfig.maxRetries !== undefined &&
          attempts > finalConfig.maxRetries
        ) {
          throw error
        }

        // Check for cancellation before sleeping
        if (finalConfig.signal?.aborted != null && finalConfig.signal.aborted) {
          throw new RetryCancelledError()
        }

        // Apply jitter if configured
        const jitteredDelay =
          finalConfig.jitter > 0
            ? currentDelay + Math.random() * currentDelay * finalConfig.jitter
            : currentDelay

        // Wait before retrying
        await snooze(jitteredDelay)
        totalDelay += jitteredDelay

        // Calculate next delay with exponential backoff
        currentDelay = Math.min(
          currentDelay * finalConfig.backoffFactor,
          finalConfig.maxDelay
        )
      }
    }
  }
}

/**
 * Default retry configuration for network operations
 */
export const DEFAULT_NETWORK_RETRY_CONFIG: RetryConfig = {
  initialDelay: 1000, // Start with 1 second
  maxDelay: 60000, // Cap at 60 seconds
  backoffFactor: 2, // Double the delay each time
  maxRetries: 5, // Try up to 5 times
  jitter: 0.25 // Add up to 25% randomization to prevent thundering herd
}

/**
 * Aggressive retry configuration for critical operations
 */
export const AGGRESSIVE_RETRY_CONFIG: RetryConfig = {
  initialDelay: 500, // Start with 500ms
  maxDelay: 30000, // Cap at 30 seconds
  backoffFactor: 1.5, // Slower backoff
  maxRetries: 10, // More retries
  jitter: 0.25 // Add up to 25% randomization
}

/**
 * Infinite retry configuration with max backoff for persistent operations
 */
export const INFINITE_RETRY_CONFIG: Partial<RetryConfig> = {
  initialDelay: 1000, // Start with 1 second
  maxDelay: 60000, // Cap at 60 seconds
  backoffFactor: 2, // Double the delay each time
  jitter: 0.25 // Add up to 25% randomization
  // No maxRetries - will retry indefinitely until cancelled
}
