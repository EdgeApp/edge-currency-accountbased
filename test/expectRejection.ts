import { expect } from 'chai'

/**
 * Verifies that a promise rejects with a particular error.
 */
export async function expectRejection(
  promise: Promise<unknown>,
  message?: string
): Promise<unknown> {
  return await promise.then(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ok => {
      throw new Error('Expecting this promise to reject')
    },
    error => {
      if (message != null) expect(String(error)).equals(message)
    }
  )
}
