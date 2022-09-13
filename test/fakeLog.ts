import { EdgeLog } from 'edge-core-js/types'

export const fakeLog: EdgeLog = Object.assign(() => undefined, {
  warn() {},
  error() {},
  crash() {},
  breadcrumb() {}
})
