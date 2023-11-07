import { EdgeLog } from 'edge-core-js'
import { dim } from 'nanocolors'

/**
 * Buffers log output, then dumps it all at once.
 */
interface CliLog {
  log: EdgeLog

  print: () => void
  setWatching: (watching: boolean) => void
}

export function makeCliLog(): CliLog {
  let isWatching = false
  let output: string[] = []

  function writeOutput(string: string): void {
    if (isWatching) console.log(dim(string))
    else output.push(string)
  }

  function combineArgs(...args: unknown[]): string {
    return args.map(arg => JSON.stringify(arg, null, 1)).join(' ')
  }

  const log = (...args: unknown[]): void => {
    writeOutput('log: ' + combineArgs(...args))
  }
  log.warn = (...args: unknown[]): void => {
    writeOutput('warn: ' + combineArgs(...args))
  }
  log.error = (...args: unknown[]): void => {
    writeOutput('error: ' + combineArgs(...args))
  }
  log.breadcrumb = (message: string, metadata: unknown): void => {
    writeOutput(
      `breadcrumb: ${message}\nmetadata: ${JSON.stringify(metadata, null, 1)}`
    )
  }
  log.crash = (error: unknown, metadata: unknown): void => {
    writeOutput(
      `crash: ${String(error)}\nmetadata: ${JSON.stringify(metadata, null, 1)}`
    )
  }

  return {
    log,

    print() {
      console.log(dim(output.join('\n')))
      output = []
    },

    setWatching(watching) {
      isWatching = watching
    }
  }
}
