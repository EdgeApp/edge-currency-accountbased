// @flow

export const fioApiErrorCodes = [400, 403, 404]

export class FioError extends Error {
  list: Array<{ field: string, message: string }>
  labelCode: string
  errorCode: number
  json: any

  constructor(message: string, code?: number, labelCode?: string, json?: any) {
    super(message)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FioError)
    }

    this.name = 'FioError'
    if (code) this.errorCode = code
    if (labelCode) this.labelCode = labelCode
    if (json) this.json = json
  }
}
