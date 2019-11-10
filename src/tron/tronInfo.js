export const imageServerUrl = 'https://developer.airbitz.co/content'

const otherSettings = {
  tronApiServers: ['https://api.trongrid.io'],
  tronTestNetServers: ['https://api.shasta.trongrid.io']
}

const defaultSettings = {
  otherSettings
}

export const currencyInfo = {
  // Basic currency information:
  currencyCode: 'TRX',
  displayName: 'Tron',
  pluginName: 'tron',
  walletType: 'wallet:tron',

  defaultSettings,

  addressExplorer: 'https://tronscan.org/#/address/%s',
  transactionExplorer: 'https://tronscan.org/#/transaction/%s',
  blockExplorer: 'https://tronscan.org/#/block/%s',

  denominations: [
    // An array of Objects of the possible denominations for this currency
    {
      name: 'TRX',
      multiplier: '1000000',
      symbol: 'T'
    }
  ],
  symbolImage: `${imageServerUrl}/tron-logo-solo-64.png`,
  symbolImageDarkMono: `${imageServerUrl}/tron-logo-solo-64.png`,
  metaTokens: []
}
