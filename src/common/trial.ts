/**
 * A functional pattern for try..catch statements. Accepts one or more functions
 * and returns the first function which doesn't throw. Exceptions thrown are
 * caught and passed to the next function to handle (like a catch block).
 *
 * trial(tryFunc, catchFunc, catchFunc, ...)
 *
 * All functions must return the same type.
 */
export const trial = <T>(...funcs: Array<(err?: any) => T>): T => {
  let i = 0
  let error: any

  if (funcs.length === 0)
    throw new Error('Expected one or more function argument')

  while (i < funcs.length) {
    const current = funcs[i++]

    try {
      return current(error)
    } catch (err) {
      // Track error
      error = err
    }
  }

  throw error
}
