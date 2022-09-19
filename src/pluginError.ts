export const pluginErrorCodes = [400, 403, 404]
export const pluginErrorName = {
  XRP_ERROR: 'XrpError'
}

export class PluginError extends Error {
  // @ts-expect-error
  list: Array<{ field: string; message: string }>
  // @ts-expect-error
  labelCode: string
  // @ts-expect-error
  errorCode: number
  json: any

  constructor(
    message: string,
    name?: string,
    code?: number,
    labelCode?: string,
    json?: any
  ) {
    super(message)

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PluginError)
    }

    this.name = name ?? 'PluginError'
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (code) this.errorCode = code
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (labelCode) this.labelCode = labelCode
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (json) this.json = json
  }
}
