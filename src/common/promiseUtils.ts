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

/**
 * A ponyfill for `Promise.any`.
 * Once we upgrade our browser environment,
 * we can just use the built-in one instead.
 */
export async function promiseAny<T>(promises: Array<Promise<T>>): Promise<T> {
  const errors: unknown[] = []

  return await new Promise((resolve: Function, reject: Function) => {
    let pending = promises.length
    for (const promise of promises) {
      promise.then(
        value => {
          resolve(value)
        },
        error => {
          errors.push(error)
          if (--pending === 0) {
            // Match what the Node.js Promise.any does:
            reject(new AggregateError(errors, 'All promises were rejected'))
          }
        }
      )
    }
  })
}

/**
 * Waits for the promises to resolve and uses a provided checkResult function
 * to return a key to identify the result. The returned promise resolves when
 * n number of promises resolve to identical keys.
 */
export async function promisesAgree<T>(
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

/**
 * Catch AggregateError objects, and format them more nicely.
 * Instead of the built-in `Promise.any` error message, we can have:
 *
 * ```
 * Could not broadcast:
 * • Error: Request timed out
 * • TypeError: Expected a string at .txid
 * ```
 */
export async function formatAggregateError<T>(
  promise: Promise<T>,
  title?: string
): Promise<T> {
  return await promise.catch(error => {
    // Skip things that don't duck-type as `AggregateError`:
    const errors = error?.errors
    if (!(error instanceof Error)) throw error
    if (!Array.isArray(errors)) throw error

    // eslint-disable-next-line @typescript-eslint/require-array-sort-compare
    const messages = errors.map(error => String(error)).sort()

    // Filter duplicate messages:
    let lastMessage = ''
    const uniqueMessages: string[] = [title ?? error.message]
    for (const message of messages) {
      if (message === lastMessage) continue
      uniqueMessages.push(message)
      lastMessage = message
    }

    const message = uniqueMessages.join('\n• ')
    throw new AggregateError(errors, message)
  })
}

/**
 * This fires off async functions sequentially at intervalMs. It allows any
 * invoked function to resolve the entire promise. Errors thrown by the most
 * recently run task will reschedule the remaining pending tasks to avoid
 * waiting unnecessarily
 */
export async function asyncStaggeredRace(
  asyncFuncs: AsyncFunction[],
  intervalMs: number = 2000
): Promise<any> {
  if (asyncFuncs.length === 0) {
    throw new Error('No functions to run')
  }
  return await new Promise((resolve, reject) => {
    let timers: Array<ReturnType<typeof setTimeout>> = []
    const invoked: boolean[] = new Array(asyncFuncs.length).fill(false)
    const failed: boolean[] = new Array(asyncFuncs.length).fill(false)

    const setTimers = (): void => {
      let queuedCount = 0
      for (let i = 0; i < asyncFuncs.length; i++) {
        if (invoked[i] || failed[i]) continue

        const delay = queuedCount * intervalMs
        queuedCount++

        const timerId = setTimeout(() => {
          runTask(i).catch(() => {})
        }, delay)

        timers.push(timerId)
      }
    }

    const clearTimers = (): void => {
      for (const timer of timers.values()) {
        clearTimeout(timer)
      }
      timers = []
    }

    let lastError: Error | undefined
    let isRescheduling = false
    let mostRecentTaskIndex: number | null = null
    const runTask = async (i: number): Promise<void> => {
      try {
        invoked[i] = true
        mostRecentTaskIndex = i
        const result = await asyncFuncs[i]()
        clearTimers()
        resolve(result)
      } catch (error: unknown) {
        if (error instanceof Error) {
          lastError = error
        }
        failed[i] = true

        if (failed.every(Boolean)) {
          reject(lastError ?? new Error('Unknown error'))
          return
        }
        if (!isRescheduling && mostRecentTaskIndex === i) {
          isRescheduling = true
          clearTimers()
          setTimers()
          isRescheduling = false
        }
      }
    }

    setTimers()
  })
}
