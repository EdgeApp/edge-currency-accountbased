/**
 * Created by paul on 8/27/17.
 */

export const XrpGetBalancesSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      currency: { type: 'string' },
      value: { type: 'string' }
    }
  }
}
