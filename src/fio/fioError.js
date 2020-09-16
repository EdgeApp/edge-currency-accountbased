// @flow

export const fioApiErrorCodes = [400, 403, 404, 409]
export const FIO_CHAIN_INFO_ERROR_CODE = 800
export const FIO_BLOCK_NUMBER_ERROR_CODE = 801

export class FioError extends Error {
  list: { field: string, message: string }[]
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
