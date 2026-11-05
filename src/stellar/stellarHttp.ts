import type { Horizon } from '@stellar/stellar-sdk'
import { EdgeFetchFunction } from 'edge-core-js/types'

import { timeout } from '../common/promiseUtils'

type HttpAdapter = NonNullable<
  Horizon.Server['httpClient']['defaults']['adapter']
>
type HttpRequestConfig = Parameters<HttpAdapter>[0]
type HttpResponse = Awaited<ReturnType<HttpAdapter>>

/**
 * This is a custom HttpClient adapter to inject our fetch into the Stellar
 * SDK's Horizon client. It does the job of the SDK's own fetch client,
 * but with our fetch injected in favor of global fetch.
 *
 * The SDK expects axios-style results: responses carry the parsed body in
 * `data`, and responses outside 2xx reject with an error whose `response`
 * holds the status and body. The SDK turns those into its own
 * NotFoundError and TransactionFailedError types.
 */
export function makeEdgeFetchAdapter(fetch: EdgeFetchFunction): HttpAdapter {
  return async (config: HttpRequestConfig): Promise<HttpResponse> => {
    const { data, headers, method = 'get', params = {} } = config

    // Serializes query params:
    const url = new URL(config.url ?? '', config.baseURL)
    for (const [key, value] of Object.entries(params)) {
      if (value != null) url.searchParams.set(key, String(value))
    }

    const requestHeaders: Record<string, string> = {}
    new Headers(headers).forEach((value, name) => {
      requestHeaders[name] = value
    })

    // The SDK posts transactions as pre-encoded form strings:
    const request = fetch(url.toString(), {
      method: method.toUpperCase(),
      headers: requestHeaders,
      body:
        data == null || typeof data === 'string' ? data : JSON.stringify(data)
    })
    const response =
      config.timeout != null && config.timeout > 0
        ? await timeout(
            request,
            config.timeout,
            new Error(`timeout of ${config.timeout}ms exceeded`)
          )
        : await request

    const text = await response.text()
    let body: unknown = text
    try {
      body = JSON.parse(text)
    } catch (error) {}

    const responseHeaders: Record<string, string> = {}
    response.headers.forEach((value, name) => {
      responseHeaders[name] = value
    })

    const out: HttpResponse = {
      config: { ...config, url: url.toString() },
      data: body,
      headers: responseHeaders,
      status: response.status,
      // Our fetch doesn't report the reason phrase:
      statusText: ''
    }

    // Handle responses outside 2xx the way axios does:
    if (response.status < 200 || response.status >= 300) {
      throw Object.assign(
        new Error(`Request failed with status code ${response.status}`),
        { config: out.config, response: out }
      )
    }
    return out
  }
}
