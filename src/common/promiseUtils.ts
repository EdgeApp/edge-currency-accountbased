import AggregateError from 'es-aggregate-error'

import { snooze } from './utils'

type AsyncFunction = () => Promise<any>

export async function asyncWaterfall(
  asyncFuncs: AsyncFunction[],
  timeoutMs: number = 5000
): Promise<any> {
  let pending = asyncFuncs.length
  const promises: Array<Promise<any>> = []
  for (const func of asyncFuncs) {
    const index = promises.length
    promises.push(
      func().catch(e => {
        e.index = index
        throw e
      })
    )
    if (pending > 1) {
      promises.push(
        new Promise(resolve => {
          snooze(timeoutMs).then(() => {
            resolve('async_waterfall_timed_out')
          })
        })
      )
    }
    try {
      const result = await Promise.race(promises)
      if (result === 'async_waterfall_timed_out') {
        const p = promises.pop()
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        p?.then().catch()
        --pending
      } else {
        return result
      }
    } catch (e: any) {
      const i = e.index
      promises.splice(i, 1)
      const p = promises.pop()
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      p?.then().catch()
      --pending
      if (pending === 0) {
        throw e
      }
    }
  }
}

export async function promiseAny<T>(promises: Array<Promise<T>>): Promise<T> {
  return await new Promise((resolve: Function, reject: Function) => {
    let pending = promises.length
    for (const promise of promises) {
      promise.then(
        value => {
          resolve(value)
        },
        error => {
          if (--pending === 0) reject(error)
        }
      )
    }
  })
}

/**
 * This will await all promises concurrently and return an array of results and
 * errors. This is an alternative to promiseAny, but all promises are dispatched
 * concurrently and results and errors are always returned. Only when no
 * promise get fulfilled, is an `AggregateError` is thrown.
 *
 * @param promise array of promises
 * @returns a promise of an object containing an of array of results `values`
 * from fulfilled promises and array of `errors` from rejected promises.
 */
export async function promiseCast<T>(promise: Array<Promise<T>>): Promise<{
  values: T[]
  errors: unknown[]
}> {
  const results = await Promise.allSettled(promise)
  const values = results
    .map(result => (result.status === 'fulfilled' ? result.value : undefined))
    .filter((value): value is Awaited<T> => value !== undefined)
  const errors = results
    .map(result => (result.status === 'rejected' ? result.reason : undefined))
    .filter((value): value is unknown => value !== undefined)
  // Throw errors if no fulfilled promises:
  if (values.length === 0) {
    const errorMessages = errors.map(error => String(error)).join(';\n  ')
    throw new AggregateError(
      errors,
      `Promise Cast Rejected:\n  ${errorMessages}`
    )
  }
  return { values, errors }
}

/**
 * Waits for the promises to resolve and uses a provided checkResult function
 * to return a key to identify the result. The returned promise resolves when
 * n number of promises resolve to identical keys.
 */
export async function promiseNy<T>(
  promises: Array<Promise<T>>,
  checkResult: (arg: T) => string | undefined,
  n: number = promises.length
): Promise<T> {
  const map: { [key: string]: number } = {}
  return await new Promise((resolve, reject) => {
    let resolved = 0
    let failed = 0
    let done = false
    for (const promise of promises) {
      promise.then(
        result => {
          const key = checkResult(result)
          if (key !== undefined) {
            resolved++
            if (map[key] !== undefined) {
              map[key]++
            } else {
              map[key] = 1
            }
            if (!done && map[key] >= n) {
              done = true
              resolve(result)
            }
          } else if (++failed + resolved === promises.length) {
            reject(Error(`Could not resolve ${n} promises`))
          }
        },
        error => {
          if (++failed + resolved === promises.length) {
            reject(error)
          }
        }
      )
    }
  })
}

/**
 * If the promise doesn't resolve in the given time,
 * reject it with the provided error, or a generic error if none is provided.
 */
export async function timeout<T>(
  promise: Promise<T>,
  ms: number,
  error: Error = new Error(`Timeout of ${ms}ms exceeded`)
): Promise<T> {
  return await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(error), ms)
    promise.then(
      ok => {
        resolve(ok)
        clearTimeout(timer)
      },
      error => {
        reject(error)
        clearTimeout(timer)
      }
    )
  })
}
