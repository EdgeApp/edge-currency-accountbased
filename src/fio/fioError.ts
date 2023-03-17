export const fioApiErrorCodes = [400, 403, 404]

export const fioRegApiErrorCodes = {
  INVALID_FIO_ADDRESS: 'INVALID_FIO_ADDRESS',
  ALREADY_REGISTERED: 'ALREADY_REGISTERED',
  FIO_ADDRESS_IS_NOT_EXIST: 'FIO_ADDRESS_IS_NOT_EXIST',
  FIO_DOMAIN_IS_NOT_EXIST: 'FIO_DOMAIN_IS_NOT_EXIST',
  FIO_DOMAIN_IS_NOT_PUBLIC: 'FIO_DOMAIN_IS_NOT_PUBLIC',
  IS_DOMAIN_PUBLIC_ERROR: 'IS_DOMAIN_PUBLIC_ERROR',
  FIO_ADDRESS_IS_NOT_LINKED: 'FIO_ADDRESS_IS_NOT_LINKED',
  SERVER_ERROR: 'SERVER_ERROR',
  ALREADY_SENT_REGISTRATION_REQ_FOR_DOMAIN:
    'ALREADY_SENT_REGISTRATION_REQ_FOR_DOMAIN'
} as const

export class FioError extends Error {
  // @ts-expect-error
  list: Array<{ field: string; message: string }>
  // @ts-expect-error
  labelCode: string
  // @ts-expect-error
  errorCode: number
  json: any

  constructor(message: string, code?: number, labelCode?: string, json?: any) {
    super(message)

    if (Error.captureStackTrace != null) {
      Error.captureStackTrace(this, FioError)
    }

    this.name = 'FioError'
    if (code != null) this.errorCode = code
    if (labelCode != null) this.labelCode = labelCode
    if (json != null) this.json = json
  }
}
