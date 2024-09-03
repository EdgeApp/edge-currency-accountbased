import { asMaybe, asObject, asString } from 'cleaners'

interface CausedBy<C> {
  cause: C
}

/**
 * Implements a Error Cause inspired by the
 * [TC29 spec](https://github.com/tc39/proposal-error-cause).
 *
 * @param error the error to be extended
 * @param cause the cause of the error
 * @returns new error with cause
 */
export function errorCause<T extends Error, C>(
  error: T,
  cause: C
): T & CausedBy<C> {
  const out = error as T & CausedBy<C>
  out.cause = cause

  // Extend the error's stack with the cause's stack
  const causeError = asMaybeError(cause)
  if (causeError != null && error.stack != null) {
    error.stack += `\n${causeError.stack}`
  }

  return out
}

const asMaybeError = asMaybe(asObject({ stack: asString }))
