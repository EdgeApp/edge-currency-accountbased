import { KaspaApiAdapterConfig } from './KaspaApiAdapter'
import { KaspaRpcAdapterConfig } from './KaspaRpcAdapter'

export type NetworkAdapterConfig = KaspaRpcAdapterConfig | KaspaApiAdapterConfig
