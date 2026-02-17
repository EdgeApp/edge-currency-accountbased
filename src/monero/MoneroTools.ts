import { mul, toFixed } from 'biggystring'
import {
  EdgeCurrencyInfo,
  EdgeCurrencyTools,
  EdgeEncodeUri,
  EdgeIo,
  EdgeLog,
  EdgeMetaToken,
  EdgeParsedUri,
  EdgeTokenMap,
  EdgeWalletInfo,
  JsonObject
} from 'edge-core-js/types'
import { CppBridge } from 'react-native-monero-lwsf/lib/src/CppBridge'

import { PluginEnvironment } from '../common/innerPlugin'
import { parseUriCommon } from '../common/uriHelpers'
import { getLegacyDenomination, mergeDeeply } from '../common/utils'
import {
  asMoneroPrivateKeys,
  asSafeMoneroWalletInfo,
  MoneroIo,
  MoneroNetworkInfo
} from './moneroTypes'

export class MoneroTools implements EdgeCurrencyTools {
  cppBridge: CppBridge
  moneroIo: MoneroIo
  io: EdgeIo
  log: EdgeLog
  builtinTokens: EdgeTokenMap
  currencyInfo: EdgeCurrencyInfo
  networkInfo: MoneroNetworkInfo

  constructor(env: PluginEnvironment<MoneroNetworkInfo>) {
    const { builtinTokens, currencyInfo, io, log, nativeIo, networkInfo } = env
    this.io = io
    this.log = log
    this.currencyInfo = currencyInfo
    this.builtinTokens = builtinTokens
    this.networkInfo = networkInfo

    const moneroIo = nativeIo.monero as MoneroIo
    if (moneroIo == null) throw new Error('Need monero native IO')
    this.moneroIo = moneroIo
    this.cppBridge = new CppBridge(moneroIo)
  }

  async getDisplayPrivateKey(
    privateWalletInfo: EdgeWalletInfo
  ): Promise<string> {
    const { pluginId } = this.currencyInfo
    const keys = asMoneroPrivateKeys(pluginId)(privateWalletInfo.keys)
    return keys.moneroKey
  }

  async getDisplayPublicKey(publicWalletInfo: EdgeWalletInfo): Promise<string> {
    const { keys } = asSafeMoneroWalletInfo(publicWalletInfo)
    return keys.moneroViewKeyPrivate
  }

  async importPrivateKey(
    input: string,
    _opts?: JsonObject
  ): Promise<JsonObject> {
    const { pluginId } = this.currencyInfo
    const { networkType } = this.networkInfo
    const mnemonic = input.trim()

    const keys = await this.cppBridge.seedAndKeysFromMnemonic(
      mnemonic,
      networkType
    )

    return {
      [`${pluginId}Key`]: mnemonic,
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

    return await this.importPrivateKey(generatedWallet.mnemonic)
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
        // Fall through to common parser if native fails
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
