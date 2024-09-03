import { errorCause } from './error-cause'

/**
 * A functional pattern for try..catch statements. Accepts one or more functions
 * and returns the first function which doesn't throw. Exceptions thrown are
 * caught and passed to the next function to handle (like a catch block).
 *
 * trial(tryFunc, catchFunc, catchFunc, ...)
 *
 * All functions must return the same type.
 *
 * All Error objects thrown will be wrapped in an error cause chain.
 */
export const trial = <T>(...funcs: Array<(err?: unknown) => T>): T => {
  let i = 0
  let error: unknown

  if (funcs.length === 0)
    throw new Error('Expected one or more function argument')

  while (i < funcs.length) {
    const current = funcs[i++]

    try {
      return current(error)
    } catch (err) {
      // Track error
      error =
        err instanceof Error && error != null ? errorCause(err, error) : err
    }
  }

  throw error
}
