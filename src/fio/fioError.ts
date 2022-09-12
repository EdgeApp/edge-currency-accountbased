import { currencyInfo } from './fioInfo'

export const fioApiErrorCodes = [400, 403, 404]
export const fioRegApiErrorCodes: { [string]: string } = {
  INVALID_FIO_NAME: currencyInfo.defaultSettings.errorCodes.INVALID_FIO_ADDRESS,
  ALREADY_REGISTERED:
    currencyInfo.defaultSettings.errorCodes.ALREADY_REGISTERED,
  DOMAIN_IS_NOT_REGISTERED:
    currencyInfo.defaultSettings.errorCodes.FIO_DOMAIN_IS_NOT_EXIST,
  DOMAIN_IS_NOT_PUBLIC:
    currencyInfo.defaultSettings.errorCodes.FIO_DOMAIN_IS_NOT_PUBLIC,
  SERVER_ERROR: currencyInfo.defaultSettings.errorCodes.SERVER_ERROR,
  ALREADY_SENT_REGISTRATION_REQ_FOR_DOMAIN:
    currencyInfo.defaultSettings.errorCodes
      .ALREADY_SENT_REGISTRATION_REQ_FOR_DOMAIN
}

export class FioError extends Error {
  list: Array<{ field: string; message: string }>
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
