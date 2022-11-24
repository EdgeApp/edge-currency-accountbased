import { EdgeCorePlugins } from 'edge-core-js/types'

declare global {
  interface Window {
    addEdgeCorePlugins?: (plugins: EdgeCorePlugins) => void
  }
}
