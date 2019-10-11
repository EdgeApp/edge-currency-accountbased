// @flow

import { type EdgeCorePluginOptions } from 'edge-core-js/types'

export type FetchJson = (uri: string, opts?: Object) => Object

function makeFetchJson (io): FetchJson {
  return function fetchJson (uri, opts) {
    return io.fetch(uri, opts).then(reply => {
      if (!reply.ok) {
        throw new Error(`Error ${reply.status} while fetching ${uri}`)
      }
      return reply.json()
    })
  }
}

/**
 * Emulates the browser Fetch API more accurately than fetch JSON.
 */
export function getFetchCors (opts: EdgeCorePluginOptions): Function {
  const nativeIo = opts.nativeIo['edge-currency-accountbased']
  if (nativeIo == null) return opts.io.fetch

  return function fetch (uri: string, opts?: Object) {
    return nativeIo.fetchText(uri, opts).then(reply => ({
      ok: reply.ok,
      status: reply.status,
      statusText: reply.statusText,
      url: reply.url,
      json () {
        return Promise.resolve().then(() => JSON.parse(reply.text))
      },
      text () {
        return Promise.resolve(reply.text)
      }
    }))
  }
}

export function getFetchJson (opts: EdgeCorePluginOptions): FetchJson {
  const nativeIo = opts.nativeIo['edge-currency-accountbased']
  return nativeIo != null ? nativeIo.fetchJson : makeFetchJson(opts.io)
}

export default function makePluginIo () {
  return {
    fetchJson: makeFetchJson(window),

    fetchText (uri: string, opts: Object) {
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
