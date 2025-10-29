import type { HttpRequestOptions } from '@taquito/http-utils'
import { HttpBackend, HttpResponseError } from '@taquito/http-utils'
import { EdgeFetchFunction } from 'edge-core-js/types'

/**
 * This is a custom HttpBackend to inject our fetch into the Taquito RPC client.
 * It's nearly a direct copy of the HttpBackend from Taquito, but with our fetch injected in favor of global fetch.
 */
export class EdgeFetchHttpBackend extends HttpBackend {
  fetch: EdgeFetchFunction

  constructor(fetch: EdgeFetchFunction, timeout?: number) {
    super(timeout)
    this.fetch = fetch
  }

  // This is called for every RPC request
  async createRequest<T>(
    {
      url,
      method,
      timeout,
      query,
      headers = {},
      json = true
    }: HttpRequestOptions,
    data?: object | string
  ): Promise<T> {
    // Serializes query params
    const urlWithQuery = url + this.serialize(query)

    // Adds default header entry if there aren't any Content-Type header
    if (headers['Content-Type'] == null) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await this.fetch(urlWithQuery, {
      method,
      headers,
      body: data != null ? JSON.stringify(data) : undefined
    })

    // Handle responses with status code >= 400
    if (response.status >= 400) {
      const errorData = await response.text()
      throw new HttpResponseError(
        `Http error response: (${response.status}) ${errorData}`,
        response.status,
        '',
        errorData,
        urlWithQuery
      )
    }
    if (json) {
      return await response.json()
    } else {
      return (await response.text()) as T
    }
  }
}
