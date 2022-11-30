import { EdgeOtherMethods } from 'edge-core-js/types'

/**
 * Builds an object with async proxy methods.
 * Calling any of these methods will load the currency tools,
 * and then call the corresponding method on the currency tools object.
 */
export function makeOtherMethods<T>(
  getTools: () => Promise<T>,
  otherMethodNames: Array<string & keyof T>
): EdgeOtherMethods {
  // Shims for our other methods,
  // to load the plugin on-demand the first time somebody calls a method:
  const out: { [name: string]: any } = {}
  for (const name of otherMethodNames) {
    out[name] = async (...args: any[]) => {
      const tools = await getTools()
      const method = tools[name]
      if (typeof method !== 'function') {
        throw new Error(`Method ${name} is not implemented`)
      }
      return method.apply(tools, args)
    }
  }

  return out
}
