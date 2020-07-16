// @flow

export const fioApiErrorCodes = [400, 403, 404]

export class FioError extends Error {
  list: { field: string, message: string }[]
  errorCode: number
  json: any

  constructor(...params: any) {
    super(...params)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FioError)
    }

    this.name = 'FioError'
  }
}
