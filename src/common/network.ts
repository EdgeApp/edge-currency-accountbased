import { Cleaner } from 'cleaners'
import {
  EdgeFetchFunction,
  EdgeFetchOptions,
  EdgeFetchResponse
} from 'edge-core-js/types'

import { asyncWaterfall, shuffleArray } from './utils'
const INFO_SERVERS = ['https://info1.edge.app', 'https://info2.edge.app']

export async function fetchWaterfall(
  servers: string[],
  path: string,
  options?: EdgeFetchOptions,
  timeout: number = 5000,
  doFetch: EdgeFetchFunction = fetch
): Promise<EdgeFetchResponse> {
  const funcs = servers.map(server => async () => {
    const result = await doFetch(server + '/' + path, options)
    if (typeof result !== 'object') {
      const msg = `Invalid return value ${path} in ${server}`
      console.log(msg)
      throw new Error(msg)
    }
    return result
  })
  return await asyncWaterfall(funcs, timeout)
}

export async function cleanMultiFetch<T>(
  cleaner: Cleaner<T>,
  servers: string[],
  path: string,
  options?: EdgeFetchOptions,
  timeout: number = 5000,
  doFetch?: EdgeFetchFunction
): Promise<T> {
  const response = await fetchWaterfall(
    shuffleArray(servers),
    path,
    options,
    timeout,
    doFetch
  )
  if (!response.ok) {
    const text = await response.text()
    console.error(text)
    throw new Error(`Error fetching ${path}: ${text}`)
  }
  const responseJson = await response.json()
  const out = cleaner(responseJson)
  return out
}

async function multiFetch(
  servers: string[],
  path: string,
  options?: EdgeFetchOptions,
  timeout: number = 5000,
  doFetch?: EdgeFetchFunction
): Promise<EdgeFetchResponse> {
  return await fetchWaterfall(
    shuffleArray(servers),
    path,
    options,
    timeout,
    doFetch
  )
}

export const fetchInfo = async (
  path: string,
  options?: EdgeFetchOptions,
  timeout?: number,
  doFetch?: EdgeFetchFunction
): Promise<EdgeFetchResponse> => {
  return await multiFetch(INFO_SERVERS, path, options, timeout, doFetch)
}

export interface QueryParams {
  [key: string]: string | number | boolean | null
}

export const makeQueryParams = (params: QueryParams): string => {
  return Object.keys(params)
    .map(key => {
      const value = params[key]
      return value == null ? key : `${key}=${encodeURIComponent(value)}`
    })
    .join('&')
}
