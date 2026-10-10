import {
  asMaybe,
  asObject,
  asOptional,
  asString,
  asValue,
  Cleaner
} from 'cleaners'
import {
  EdgeCorePluginOptions,
  EdgeCurrencyEngine,
  EdgeCurrencyEngineOptions,
  EdgeCurrencyInfo,
  EdgeCurrencyPlugin,
  EdgeCurrencyTools,
  EdgeLog,
  EdgeOtherMethods,
  EdgeToken,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'

import { asEdgeToken, asInfoServerTokens } from './types'

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
export interface InnerPlugin<
  NetworkInfo,
  Tools extends EdgeCurrencyTools,
  InfoPayload
> {
  makeCurrencyEngine: (
    env: PluginEnvironment<NetworkInfo>,
    tools: Tools,
    walletInfo: EdgeWalletInfo,
    opts: EdgeCurrencyEngineOptions
  ) => Promise<EdgeCurrencyEngine>

  makeCurrencyTools: (env: PluginEnvironment<NetworkInfo>) => Promise<Tools>

  /**
   * The plugin's `updateInfoPayload` implementation.
   *
   * Each plugin should define how the info payload updates the plugin
   * environment. Although `InfoPayload` type may share some properties with
   * the `NetworkInfo` type, it is not a one-to-one match.
   *
   * Be aware the `InfoPayload` type for each plugin is ossified by the fact
   * that it is shared between the plugin and the info server.
   */
  updateInfoPayload: (
    env: PluginEnvironment<NetworkInfo>,
    infoPayload: InfoPayload
  ) => Promise<void>
}

/**
 * These methods involve cheap, static information,
 * so we don't have to load any crypto libraries.
 */
export interface OuterPlugin<
  NetworkInfo,
  Tools extends EdgeCurrencyTools,
  InfoPayload
> {
  asInfoPayload: Cleaner<InfoPayload>
  createTokenId?: (token: EdgeToken) => string
  builtinTokens?: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: NetworkInfo
  otherMethodNames?: ReadonlyArray<string & keyof Tools>

  checkEnvironment?: () => void
  getInnerPlugin: () => Promise<InnerPlugin<NetworkInfo, Tools, InfoPayload>>
}

type EdgeCorePluginFactory = (env: EdgeCorePluginOptions) => EdgeCurrencyPlugin

/**
 * Webpack rejects `import()` with this error when a chunk's script tag
 * errors out, times out, or loads without defining the chunk.
 */
const asChunkLoadError = asObject({
  name: asValue('ChunkLoadError'),

  /** The script URL webpack asked for. */
  request: asOptional(asString, ''),

  /** How the load ended: `error`, `timeout`, or `missing`. */
  type: asOptional(asString, '')
})

export function makeOuterPlugin<
  NetworkInfo,
  Tools extends EdgeCurrencyTools,
  InfoPayload
>(
  template: OuterPlugin<NetworkInfo, Tools, InfoPayload>
): EdgeCorePluginFactory {
  return (env: EdgeCorePluginOptions): EdgeCurrencyPlugin => {
    const {
      builtinTokens = {},
      currencyInfo,
      networkInfo: defaultNetworkInfo,
      asInfoPayload,
      createTokenId,
      otherMethodNames = [],
      checkEnvironment = () => {}
    } = template

    updateBuiltinTokens(env.infoPayload)

    const innerEnv: PluginEnvironment<NetworkInfo> = {
      ...env,
      builtinTokens,
      currencyInfo,
      networkInfo: defaultNetworkInfo
    }

    // Logic to load the inner plugin:
    let pluginPromise:
      | Promise<InnerPlugin<NetworkInfo, Tools, InfoPayload>>
      | undefined
    let toolsPromise: Promise<Tools> | undefined
    async function loadInnerPlugin(): Promise<{
      plugin: InnerPlugin<NetworkInfo, Tools, InfoPayload>
      tools: Tools
    }> {
      checkEnvironment()
      if (pluginPromise == null) {
        const startDate = Date.now()
        const startPerf = performance.now()
        // A failed load must not stay cached, so the next call tries again:
        pluginPromise = template.getInnerPlugin().catch((error: unknown) => {
          pluginPromise = undefined
          reportChunkLoadFailure(env.log, error, startDate, startPerf)
          throw error
        })
      }
      const plugin = await pluginPromise
      if (toolsPromise == null) {
        toolsPromise = plugin.makeCurrencyTools(innerEnv)
      }
      const tools = await toolsPromise

      // Attempt to update the plugin state given the initial infoPayload:
      try {
        await updateInfoPayload(env.infoPayload)
      } catch (e) {
        env.log.warn('infoPayload cleaner error:', e)
      }

      return { plugin, tools }
    }

    function updateBuiltinTokens(payload: JsonObject = {}): void {
      if (createTokenId != null) {
        const { infoServerTokens = [] } = asInfoServerTokens(payload)

        for (const rawToken of infoServerTokens) {
          try {
            const edgeToken = asEdgeToken(rawToken)
            const tokenId = createTokenId(edgeToken)

            // Check if there are any conflicts
            if (builtinTokens[tokenId] != null) continue

            builtinTokens[tokenId] = edgeToken
          } catch (e) {}
        }
      }
    }

    async function getBuiltinTokens(): Promise<EdgeTokenMap> {
      return builtinTokens
    }

    async function makeCurrencyTools(): Promise<Tools> {
      const { tools } = await loadInnerPlugin()
      return tools
    }

    async function makeCurrencyEngine(
      walletInfo: EdgeWalletInfo,
      opts: EdgeCurrencyEngineOptions
    ): Promise<EdgeCurrencyEngine> {
      const { tools, plugin } = await loadInnerPlugin()
      return await plugin.makeCurrencyEngine(innerEnv, tools, walletInfo, opts)
    }

    const otherMethods = makeOtherMethods(makeCurrencyTools, otherMethodNames)

    async function updateInfoPayload(payload: JsonObject): Promise<void> {
      const plugin = await pluginPromise

      // If the plugin hasn't been loaded yet, this is a noop.
      if (plugin == null) return

      const infoPayload = asInfoPayload(payload)
      await plugin.updateInfoPayload(innerEnv, infoPayload)
      updateBuiltinTokens(payload)
    }

    return {
      currencyInfo,
      getBuiltinTokens,
      makeCurrencyTools,
      makeCurrencyEngine,
      otherMethods,
      updateInfoPayload
    }
  }
}

/**
 * Sends a chunk load failure to the crash reporter,
 * along with what the WebView knows about the request.
 *
 * `performance.now()` stops while the device sleeps and `Date.now()` does not,
 * so a gap between the two elapsed times means the device slept mid-load.
 * Resource Timing gains an entry when a fetch finishes, so `responseEndMs`
 * tells a script that arrived but never ran from a request that never
 * completed. `responseEndMs` is on the page clock, so subtract `startPerfMs`
 * to get how far into the load the response finished. The buffer holds a
 * limited number of entries, and a full one also yields no entry, which
 * `resourceEntries` tells apart.
 *
 * A `null` `responseEndMs` is only meaningful on Android. iOS serves chunks
 * from the `edgebundle://` scheme, which may get no Resource Timing entries
 * at all, so `null` there does not mean the request hung.
 */
function reportChunkLoadFailure(
  log: EdgeLog,
  error: unknown,
  startDate: number,
  startPerf: number
): void {
  const chunkLoadError = asMaybe(asChunkLoadError)(error)
  if (chunkLoadError == null) return
  const { request, type } = chunkLoadError

  // The last entry is the current attempt, since other methods can start a
  // second load of the same chunk in one session:
  const entries = performance.getEntriesByName(request)
  const entry = entries[entries.length - 1] as
    | PerformanceResourceTiming
    | undefined
  log.crash(error, {
    type,
    request,
    elapsedDateMs: Date.now() - startDate,
    elapsedPerfMs: performance.now() - startPerf,
    startPerfMs: startPerf,
    visibilityState:
      typeof document === 'undefined' ? 'none' : document.visibilityState,
    resourceEntries: performance.getEntriesByType('resource').length,
    responseEndMs: entry?.responseEnd ?? null
  })
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
