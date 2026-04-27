import { mul, toFixed } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeFetchFunction,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { CppBridge } from 'react-native-monero/lib/src/CppBridge'
import { base64 } from 'rfc4648'

import { PluginEnvironment } from '../common/innerPlugin'
import { parseUriCommon } from '../common/uriHelpers'
import {
  getLegacyDenomination,
  makeEngineFetch,
  mergeDeeply
} from '../common/utils'
import {
  asGetBlockCountResponse,
  asMoneroKeyOptions,
  asMoneroPrivateKeys,
  asSafeMoneroWalletInfo,
  EDGE_MONERO_SERVER,
  MoneroIo,
  MoneroNetworkInfo
} from './moneroTypes'

interface NymCppBridge {
  setNymEnabled: (enabled: boolean, baseUrl: string) => Promise<void>
  resolveFetch: (
    requestId: string,
    status: number,
    bodyBase64: string
  ) => Promise<void>
  rejectFetch: (requestId: string, errorMessage: string) => Promise<void>
}

export class MoneroTools implements EdgeCurrencyTools {
  cppBridge: CppBridge
  moneroIo: MoneroIo
  io: EdgeIo
  engineFetch: EdgeFetchFunction
  log: EdgeLog
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: MoneroNetworkInfo
  private nymFetchUsers = 0
  private unsubscribeNymFetch?: () => void

  constructor(env: PluginEnvironment<MoneroNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, log, nativeIo, networkInfo } = env
    this.io = io
    this.engineFetch = makeEngineFetch(io)
    this.log = log
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.networkInfo = networkInfo

    const moneroIo = nativeIo.monero as MoneroIo
    if (moneroIo == null) throw new Error('Need monero native IO')
    this.moneroIo = moneroIo
    this.cppBridge = new CppBridge(moneroIo)
  }

  private get nymCppBridge(): NymCppBridge {
    return this.cppBridge as unknown as NymCppBridge
  }

  async setupNymFetch(
    enabled: boolean,
    daemonAddress: string
  ): Promise<() => Promise<void>> {
    if (!enabled) {
      if (this.nymFetchUsers === 0) {
        await this.nymCppBridge.setNymEnabled(false, '')
      }
      return async () => {}
    }

    if (this.unsubscribeNymFetch == null) {
      this.unsubscribeNymFetch = this.moneroIo.on('walletEvent', event => {
        if (event.eventName !== 'nymFetchRequest') return

        // The native layer reuses the walletId field as the request id for
        // this event type. A single shared listener prevents duplicate
        // fetches when multiple Monero engines are active.
        this.handleNymFetchRequest(event.walletId, event.data).catch(() => {
          // handleNymFetchRequest reports failures through rejectFetch.
        })
      })
    }

    this.nymFetchUsers += 1
    try {
      await this.nymCppBridge.setNymEnabled(
        true,
        daemonAddress.replace(/\/$/, '')
      )
    } catch (error: unknown) {
      this.nymFetchUsers -= 1
      if (this.nymFetchUsers === 0 && this.unsubscribeNymFetch != null) {
        this.unsubscribeNymFetch()
        this.unsubscribeNymFetch = undefined
      }
      throw error
    }

    let released = false
    return async () => {
      if (released) return
      released = true

      if (this.nymFetchUsers > 0) this.nymFetchUsers -= 1
      if (this.nymFetchUsers === 0) {
        try {
          await this.nymCppBridge.setNymEnabled(false, '')
        } finally {
          if (this.unsubscribeNymFetch != null) {
            this.unsubscribeNymFetch()
            this.unsubscribeNymFetch = undefined
          }
        }
      }
    }
  }

  private async handleNymFetchRequest(
    requestId: string,
    payloadJson: string
  ): Promise<void> {
    try {
      const payload = JSON.parse(payloadJson) as {
        url: string
        method: string
        headers: Record<string, string>
        bodyBase64: string
      }

      const bodyBytes = base64.parse(payload.bodyBase64)
      let body: ArrayBuffer | undefined
      if (bodyBytes.length > 0) {
        body = new ArrayBuffer(bodyBytes.length)
        new Uint8Array(body).set(bodyBytes)
      }

      const response = await this.io.fetch(payload.url, {
        method: payload.method,
        headers: payload.headers,
        body,
        privacy: 'nym'
      })

      const responseBytes = new Uint8Array(await response.arrayBuffer())
      await this.nymCppBridge.resolveFetch(
        requestId,
        response.status,
        responseBytes.length > 0 ? base64.stringify(responseBytes) : ''
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error)
      try {
        await this.nymCppBridge.rejectFetch(requestId, message)
      } catch (rejectError: unknown) {
        this.log.error(`rejectFetch failed: ${String(rejectError)}`)
      }
    }
  }

  async getBlockCount(monerodUrl: string): Promise<number> {
    const url = `${monerodUrl.replace(/\/$/, '')}/json_rpc`
    const response = await this.engineFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: '0',
        method: 'get_block_count'
      })
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(`get_block_count failed ${response.status}: ${text}`)
    }
    const json = await response.json()
    const parsed = asGetBlockCountResponse(json)
    return parsed.result.count
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const { birthdayHeight, moneroKey } = asMoneroPrivateKeys(pluginId)(
      privateWalletInfo.keys
    )
    const birthdayHeightString =
      birthdayHeight != null
        ? `\n\nBirthday Height:\n${birthdayHeight.toString()}`
        : ''
    return `Seed Phrase:\n${moneroKey}${birthdayHeightString}`
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeMoneroWalletInfo(publicWalletInfo)
    return keys.moneroViewKeyPrivate
  }

  async importPrivateKey(
    input: string,
    opts?: JsonObject
  ): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    const { networkType } = this.networkInfo
    const mnemonic = input.trim()

    const keys = await this.cppBridge.seedAndKeysFromMnemonic(
      mnemonic,
      networkType
    )

    const { birthdayHeight } = asMoneroKeyOptions(opts)

    const currentNetworkHeight = await this.getBlockCount(EDGE_MONERO_SERVER)
    if (birthdayHeight > currentNetworkHeight) {
      throw new Error('InvalidBirthdayHeight') // must be less than current block height
    }

    return {
      [`${pluginId}Key`]: mnemonic,
      [`${pluginId}BirthdayHeight`]: birthdayHeight,
      [`${pluginId}SpendKeyPrivate`]: keys.secretSpendKey,
      [`${pluginId}SpendKeyPublic`]: keys.publicSpendKey
    }
  }

  async createPrivateKey(walletType: string): Promise<JsonObject> {
    if (walletType !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }
    const { networkType } = this.networkInfo

    const generatedWallet = await this.cppBridge.generateWallet(networkType)

    const birthdayHeight = await this.getBlockCount(EDGE_MONERO_SERVER)

    return await this.importPrivateKey(generatedWallet.mnemonic, {
      birthdayHeight
    })
  }

  async derivePublicKey(walletInfo: EdgeWalletInfo): Promise<JsonObject> {
    if (walletInfo.type !== this.currencyInfo.walletType) {
      throw new Error('InvalidWalletType')
    }

    const { pluginId } = this.currencyInfo
    const { networkType } = this.networkInfo

    const moneroPrivateKeys = asMoneroPrivateKeys(pluginId)(walletInfo.keys)
    const { moneroKey } = moneroPrivateKeys

    const derivedKeys = await this.cppBridge.seedAndKeysFromMnemonic(
      moneroKey,
      networkType
    )

    return {
      moneroAddress: derivedKeys.address,
      moneroViewKeyPrivate: derivedKeys.secretViewKey,
      moneroViewKeyPublic: derivedKeys.publicViewKey,
      moneroSpendKeyPublic: derivedKeys.publicSpendKey
    }
  }

  async isValidAddress(address: string): Promise<boolean> {
    const { networkType } = this.networkInfo
    return await this.cppBridge.isValidAddress(address, networkType)
  }

  async parseUri(
    uri: string,
    currencyCode?: string,
    customTokens?: EdgeMetaToken[]
  ): Promise<EdgeParsedUri> {
    const { pluginId } = this.currencyInfo
    const { networkType } = this.networkInfo
    const networks = { [pluginId]: true, monero: true }

    if (uri.startsWith('monero:')) {
      try {
        const parsed = await this.cppBridge.parseUri(uri, networkType)

        const edgeParsedUri: EdgeParsedUri = {
          publicAddress: parsed.address
        }

        if (parsed.amount !== '0' && parsed.amount !== '') {
          edgeParsedUri.nativeAmount = parsed.amount
          edgeParsedUri.currencyCode = currencyCode ?? 'XMR'
        }

        if (parsed.paymentId !== '') {
          edgeParsedUri.uniqueIdentifier = parsed.paymentId
        }

        if (parsed.recipientName !== '' || parsed.txDescription !== '') {
          edgeParsedUri.metadata = {}
          if (parsed.recipientName !== '') {
            edgeParsedUri.metadata.name = parsed.recipientName
          }
          if (parsed.txDescription !== '') {
            edgeParsedUri.metadata.notes = parsed.txDescription
          }
        }

        return edgeParsedUri
      } catch (e) {
        // Fall through to the common parser if native parsing fails:
        this.log.warn(
          `Native parseUri failed, using common parser: ${String(e)}`
        )
      }
    }

    const { parsedUri, edgeParsedUri } = await parseUriCommon({
      currencyInfo: this.currencyInfo,
      uri,
      networks,
      builtinTokens: this.builtinTokens,
      currencyCode: currencyCode ?? 'XMR',
      customTokens
    })

    const address = edgeParsedUri.publicAddress ?? ''

    const isValid = await this.isValidAddress(address)
    if (!isValid) {
      throw new Error('InvalidPublicAddressError')
    }

    const txAmount = parsedUri.query.tx_amount
    if (txAmount != null && edgeParsedUri.nativeAmount == null) {
      const denom = getLegacyDenomination(
        currencyCode ?? 'XMR',
        this.currencyInfo,
        customTokens ?? [],
        this.builtinTokens
      )
      if (denom != null) {
        let nativeAmount = mul(txAmount, denom.multiplier)
        nativeAmount = toFixed(nativeAmount, 0, 0)
        edgeParsedUri.nativeAmount = nativeAmount
        edgeParsedUri.currencyCode = currencyCode ?? 'XMR'
      }
    }

    const paymentId = parsedUri.query.tx_payment_id
    if (paymentId != null) {
      edgeParsedUri.uniqueIdentifier = paymentId
    }

    const recipientName = parsedUri.query.recipient_name
    const txDescription = parsedUri.query.tx_description
    if (recipientName != null || txDescription != null) {
      edgeParsedUri.metadata = edgeParsedUri.metadata ?? {}
      if (recipientName != null) {
        edgeParsedUri.metadata.name = recipientName
      }
      if (txDescription != null) {
        edgeParsedUri.metadata.notes = txDescription
      }
    }

    return edgeParsedUri
  }

  async encodeUri(
    obj: EdgeEncodeUri,
    _customTokens: EdgeMetaToken[] = []
  ): Promise<string> {
    const { publicAddress, nativeAmount, label, message } = obj
    const { networkType } = this.networkInfo

    if (publicAddress == null) {
      throw new Error('InvalidPublicAddressError')
    }

    const isValid = await this.isValidAddress(publicAddress)
    if (!isValid) {
      throw new Error('InvalidPublicAddressError')
    }

    if (nativeAmount == null && label == null && message == null) {
      return publicAddress
    }

    const uri = await this.cppBridge.encodeUri(
      {
        address: publicAddress,
        amount: nativeAmount ?? '0',
        recipientName: label,
        txDescription: message
      },
      networkType
    )

    return uri
  }
}

export async function makeCurrencyTools(
  env: PluginEnvironment<MoneroNetworkInfo>
): Promise<MoneroTools> {
  return new MoneroTools(env)
}

export async function updateInfoPayload(
  env: PluginEnvironment<MoneroNetworkInfo>,
  infoPayload: JsonObject
): Promise<void> {
  const { ...networkInfo } = infoPayload
  env.networkInfo = mergeDeeply(env.networkInfo, networkInfo)
}

export { makeCurrencyEngine } from './MoneroEngine'
