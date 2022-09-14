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

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PluginError)
    }

    this.name = name ?? 'PluginError'
    if (code) this.errorCode = code
    if (labelCode) this.labelCode = labelCode
    if (json) this.json = json
  }
}
