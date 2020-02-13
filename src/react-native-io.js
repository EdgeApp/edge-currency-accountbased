// @flow
import { type EdgeCorePluginOptions } from 'edge-core-js/types'
/**
 * Emulates the browser Fetch API more accurately than fetch JSON.
 */
export function getFetchCors(opts: EdgeCorePluginOptions): Function {
  const nativeIo = opts.nativeIo['edge-currency-accountbased']
  if (nativeIo == null) return opts.io.fetch

  return function fetch(uri: string, opts?: Object) {
    return nativeIo.fetchText(uri, opts).then(reply => ({
      ok: reply.ok,
      status: reply.status,
      statusText: reply.statusText,
      url: reply.url,
      json() {
        return Promise.resolve().then(() => JSON.parse(reply.text))
      },
      text() {
        return Promise.resolve(reply.text)
      }
    }))
  }
}

// TODO: Remove this entire file in the next breaking change.
export default function makePluginIo() {
  return {
    fetchText(uri: string, opts: Object) {
      return window.fetch(uri, opts).then(reply =>
        reply.text().then(text => ({
          ok: reply.ok,
          status: reply.status,
          statusText: reply.statusText,
          url: reply.url,
          text
        }))
      )
    }
  }
}
