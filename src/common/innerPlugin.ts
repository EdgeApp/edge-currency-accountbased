import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  EdgeOtherMethods,
  EdgeTokenMap
} from 'edge-core-js/types'

import { PublicKeys } from './types'

/**
 * We pass a more complete plugin environment to the inner plugin,
 * so we can share the same instance between sibling networks.
 */
export interface PluginEnvironment<NetworkInfo> extends EdgeCorePluginOptions {
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: NetworkInfo
}

/**
 * These methods involve expensive crypto libraries
 * that we don't want to load unless we actually have wallets in an account.
 */
export interface InnerPlugin<NetworkInfo, Tools extends EdgeCurrencyTools> {
  makeCurrencyEngine: (
    env: PluginEnvironment<NetworkInfo>,
    tools: Tools,
    publicKeys: PublicKeys,
    opts: EdgeCurrencyEngineOptions
  ) => Promise<EdgeCurrencyEngine>

  makeCurrencyTools: (env: PluginEnvironment<NetworkInfo>) => Promise<Tools>
}

/**
 * These methods involve cheap, static information,
 * so we don't have to load any crypto libraries.
 */
export interface OuterPlugin<NetworkInfo, Tools extends EdgeCurrencyTools> {
  builtinTokens?: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: NetworkInfo
  checkEnvironment?: () => void
  getInnerPlugin: () => Promise<InnerPlugin<NetworkInfo, Tools>>

  otherMethodNames?: ReadonlyArray<string & keyof Tools>
}

type EdgeCorePluginFactory = (env: EdgeCorePluginOptions) => EdgeCurrencyPlugin

export function makeOuterPlugin<NetworkInfo, Tools extends EdgeCurrencyTools>(
  template: OuterPlugin<NetworkInfo, Tools>
): EdgeCorePluginFactory {
  return (env: EdgeCorePluginOptions): EdgeCurrencyPlugin => {
    const {
      builtinTokens = {},
      currencyInfo,
      networkInfo,
      otherMethodNames = [],
      checkEnvironment = () => {}
    } = template
    const innerEnv = { ...env, builtinTokens, currencyInfo, networkInfo }

    // Logic to load the inner plugin:
    let pluginPromise: Promise<InnerPlugin<NetworkInfo, Tools>> | undefined
    let toolsPromise: Promise<Tools> | undefined
    async function loadInnerPlugin(): Promise<{
      plugin: InnerPlugin<NetworkInfo, Tools>
      tools: Tools
    }> {
      checkEnvironment()
      if (pluginPromise == null) {
        pluginPromise = template.getInnerPlugin()
      }
      const plugin = await pluginPromise
      if (toolsPromise == null) {
        toolsPromise = plugin.makeCurrencyTools(innerEnv)
      }
      const tools = await toolsPromise
      return { plugin, tools }
    }

    async function getBuiltinTokens(): Promise<EdgeTokenMap> {
      return builtinTokens
    }

    async function makeCurrencyTools(): Promise<Tools> {
      const { tools } = await loadInnerPlugin()
      return tools
    }

    async function makeCurrencyEngine(
      publicKeys: PublicKeys,
      opts: EdgeCurrencyEngineOptions
    ): Promise<EdgeCurrencyEngine> {
      const { tools, plugin } = await loadInnerPlugin()
      return await plugin.makeCurrencyEngine(innerEnv, tools, publicKeys, opts)
    }

    const otherMethods = makeOtherMethods(makeCurrencyTools, otherMethodNames)

    return {
      currencyInfo,
      getBuiltinTokens,
      makeCurrencyTools,
      makeCurrencyEngine,
      otherMethods
    }
  }
}

/**
 * Builds an object with async proxy methods.
 * Calling any of these methods will load the currency tools,
 * and then call the corresponding method on the currency tools object.
 */
export function makeOtherMethods<T>(
  getTools: () => Promise<T>,
  otherMethodNames: ReadonlyArray<string & keyof T>
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
