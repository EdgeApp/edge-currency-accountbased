// We want tick-by-tick accuracy here, so avoid extra `await` layers:
/* eslint-disable @typescript-eslint/promise-function-async */

/**
 * Manages a resource that needs to start and stop at random times,
 * but we don't want to have more than one running at once.
 */
export interface LifecycleManager<T> {
  /**
   * Retrieves the managed item, starting it up if needed.
   * Returns undefined if there was an error during startup,
   * or if `stop` is called before startup completes.
   */
  get: () => Promise<T | undefined>

  /**
   * Stops the currently-managed item, if there is one.
   */
  stop: () => void
}

export interface LifecycleManagerOpts<T> {
  onStart: () => Promise<T>
  onStop: (value: T) => Promise<void>
  onError?: (error: unknown) => void
}

interface StartingState<T> {
  type: 'starting'
  transition: Promise<T | undefined>

  // Calling `stop` can cancel this promise,
  // even if the transition still running:
  valuePromise: Promise<T | undefined>
  resolve: (value: T | undefined) => void
}

interface StoppingState {
  type: 'stopping'
  transition: Promise<void>
}

type State<T> =
  | StartingState<T>
  | { type: 'started'; value: T }
  | StoppingState
  | { type: 'stopped' }

export function makeLifecycleManager<T>(
  opts: LifecycleManagerOpts<T>
): LifecycleManager<T> {
  const { onStart, onStop, onError } = opts
  let state: State<T> = { type: 'stopped' }

  const emptyStartingState: StartingState<T> = {
    type: 'starting',
    transition: Promise.resolve(undefined),
    valuePromise: Promise.resolve(undefined),
    resolve() {}
  }

  const emptyStoppingState: StoppingState = {
    type: 'stopping',
    transition: Promise.resolve()
  }

  return {
    get() {
      if (state.type === 'started') return Promise.resolve(state.value)
      if (state.type === 'starting') return state.valuePromise

      const newState = { ...emptyStartingState }
      newState.transition = (
        state.type === 'stopping' ? state.transition.then(onStart) : onStart()
      ).then(
        value => {
          if (state === newState) {
            state.resolve(value)
            state = { type: 'started', value }
          }
          return value
        },
        error => {
          if (state === newState) {
            state.resolve(undefined)
            state = { type: 'stopped' }
          }
          if (onError != null) onError(error)
          return undefined
        }
      )
      newState.valuePromise = new Promise(resolve => {
        newState.resolve = resolve
      })

      state = newState
      return state.valuePromise
    },

    stop(): undefined {
      if (state.type === 'stopped' || state.type === 'stopping') return
      if (state.type === 'starting') state.resolve(undefined)

      const newState = { ...emptyStoppingState }
      newState.transition = (
        state.type === 'starting'
          ? state.transition.then(value => {
              // Only call `onStop` if startup succeeds:
              if (value != null) return onStop(value)
            })
          : onStop(state.value)
      ).then(
        () => {
          if (state === newState) {
            state = { type: 'stopped' }
          }
        },
        error => {
          if (state === newState) {
            state = { type: 'stopped' }
          }
          if (onError != null) onError(error)
        }
      )

      state = newState
    }
  }
}
