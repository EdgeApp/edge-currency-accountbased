// @flow

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
